import os
import shutil
import yaml
from ultralytics import YOLO
import random
from pathlib import Path

# ─────────────────────────────────────────────────────────────
# OPTION A: Use a Roboflow-exported dataset (RECOMMENDED)
#   1. Export your project from roboflow.com as "YOLOv8" format
#   2. Unzip into: d:/object_detection_api/roboflow_dataset/
#   3. Run training — it will auto-detect the data.yaml inside
#
# OPTION B: Use saved images from the web UI (placeholder labels)
#   - Images saved via "SAVE FOR TRAINING" button
#   - Labels are fake (center box) — accuracy will be low
# ─────────────────────────────────────────────────────────────

ROBOFLOW_DATASET_PATH = Path("roboflow_dataset")  # Change this if your folder name differs


def use_roboflow_dataset():
    """
    Check if a Roboflow dataset exists, auto-fix its data.yaml paths,
    and create a 'valid' folder if it doesn't exist.
    """
    if not ROBOFLOW_DATASET_PATH.exists():
        return None

    # Find data.yaml inside the roboflow dataset folder
    yaml_path = ROBOFLOW_DATASET_PATH / "data.yaml"
    if not yaml_path.exists():
        # Also check one level deep
        for sub in ROBOFLOW_DATASET_PATH.iterdir():
            if sub.is_dir():
                candidate = sub / "data.yaml"
                if candidate.exists():
                    yaml_path = candidate
                    break
        if not yaml_path.exists():
            return None

    print(f"✅ Roboflow dataset found at: {ROBOFLOW_DATASET_PATH}")

    # Read the yaml
    with open(yaml_path, "r") as f:
        data = yaml.safe_load(f)

    dataset_root = yaml_path.parent.resolve()

    # Resolve absolute paths for train
    train_images = (dataset_root / "train" / "images").resolve()

    # If valid/ doesn't exist, use train/ as val (common with small datasets)
    valid_images = (dataset_root / "valid" / "images").resolve()
    if not valid_images.exists():
        print("⚠️  No 'valid' folder found — using train set as validation.")
        valid_images.mkdir(parents=True, exist_ok=True)
        # Copy a few train images to valid for validation
        train_imgs = list(train_images.glob("*.*"))
        train_lbls = (dataset_root / "train" / "labels").resolve()
        valid_labels = (dataset_root / "valid" / "labels").resolve()
        valid_labels.mkdir(parents=True, exist_ok=True)
        sample = train_imgs[:max(1, len(train_imgs) // 5)]  # 20% sample
        for img in sample:
            shutil.copy(img, valid_images / img.name)
            lbl = train_lbls / f"{img.stem}.txt"
            if lbl.exists():
                shutil.copy(lbl, valid_labels / lbl.name)
        print(f"   Copied {len(sample)} images to valid/ for validation.")

    # Rewrite data.yaml with absolute paths
    fixed_yaml = {
        'train': str(train_images),
        'val': str(valid_images),
        'nc': data.get('nc', 1),
        'names': data.get('names', ['object'])
    }

    fixed_yaml_path = dataset_root / "data_fixed.yaml"
    with open(fixed_yaml_path, "w") as f:
        yaml.dump(fixed_yaml, f)

    print(f"   Classes: {fixed_yaml['names']}")
    print(f"   Train images: {train_images}")
    print(f"   Val images:   {valid_images}")
    return fixed_yaml_path


def prepare_yolo_data_from_ui():
    """
    Fallback: Converts training_data/ images (from the web UI Save button)
    into a YOLO-compatible structure. Uses placeholder bounding boxes.
    NOTE: This gives LOW accuracy — use Roboflow for real training.
    """
    base_path = Path("dataset")
    train_path = base_path / "train"
    val_path = base_path / "val"

    for p in [train_path, val_path]:
        (p / "images").mkdir(parents=True, exist_ok=True)
        (p / "labels").mkdir(parents=True, exist_ok=True)

    source_dir = Path("training_data")
    images = []
    for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
        images.extend(list(source_dir.glob(ext)))

    if not images:
        print("❌ Error: No images found in training_data/ and no Roboflow dataset found.")
        print("   → Save images via the web UI OR drop a Roboflow dataset into 'roboflow_dataset/'")
        return None

    classes = sorted(list(set([img.name.split('_')[0] for img in images])))
    class_to_id = {cls: i for i, cls in enumerate(classes)}
    print(f"⚠️  Using placeholder labels. Found classes: {classes}")
    print("   → For better accuracy, annotate on roboflow.com and export to 'roboflow_dataset/'")

    random.shuffle(images)
    split_idx = int(len(images) * 0.8)
    train_images = images[:split_idx]
    val_images = images[split_idx:]

    if len(val_images) == 0 and len(train_images) > 0:
        val_images = train_images

    def process_set(img_list, target_path):
        for img_path in img_list:
            cls_name = img_path.name.split('_')[0]
            cls_id = class_to_id[cls_name]
            shutil.copy(img_path, target_path / "images" / img_path.name)
            label_file = target_path / "labels" / f"{img_path.stem}.txt"
            with open(label_file, "w") as f:
                # Placeholder: assumes object fills center 80% of image
                f.write(f"{cls_id} 0.5 0.5 0.8 0.8\n")

    process_set(train_images, train_path)
    process_set(val_images, val_path)

    data_yaml = {
        'train': str(train_path.absolute() / "images"),
        'val': str(val_path.absolute() / "images"),
        'nc': len(classes),
        'names': classes
    }

    yaml_path = Path("data.yaml")
    with open(yaml_path, "w") as f:
        yaml.dump(data_yaml, f)

    return yaml_path


def train():
    print("=" * 50)
    print("  VISION SENTINEL — Model Training")
    print("=" * 50)

    dataset_type = os.environ.get("TRAIN_DATASET_TYPE", "auto")
    data_yaml = None

    if dataset_type == "roboflow":
        print("ℹ️  User selected ROBOFLOW dataset.")
        data_yaml = use_roboflow_dataset()
        if data_yaml is None:
            print("❌ Roboflow dataset not found!")
    elif dataset_type == "custom":
        print("ℹ️  User selected CUSTOM (Web UI) dataset.")
        data_yaml = prepare_yolo_data_from_ui()
    else:
        # Try Roboflow dataset first (real annotations = better accuracy)
        data_yaml = use_roboflow_dataset()
        if data_yaml is None:
            print("ℹ️  No Roboflow dataset found. Falling back to UI-saved images...")
            data_yaml = prepare_yolo_data_from_ui()

    if data_yaml is None:
        print("❌ Training aborted: No data available.")
        return

    print(f"\n📁 Using dataset: {data_yaml}")
    print("🚀 Starting YOLO training...\n")

    model = YOLO("yolov8n.pt")

    results = model.train(
        data=str(data_yaml),
        epochs=40,          # Increased epochs slightly
        imgsz=640,
        batch=4,
        project="runs/detect",
        name="custom_model",
        exist_ok=True,
        # Turn off wild augmentations that destroy tiny datasets
        mosaic=0.0,
        mixup=0.0,
        degrees=0.0,
        translate=0.0,
        scale=0.0,
        fliplr=0.0,
        hsv_h=0.0,
        hsv_s=0.0,
        hsv_v=0.0
    )

    save_dir = Path(results.save_dir)
    best_model = save_dir / "weights" / "best.pt"

    if best_model.exists():
        os.makedirs("app/model", exist_ok=True)
        shutil.copy(best_model, "app/model/best.pt")
        print(f"\n✅ Training complete! Model saved to app/model/best.pt")
        print(f"   Source: {best_model}")
    else:
        print(f"\n❌ Training failed — best.pt not found at {best_model}")


if __name__ == "__main__":
    train()
