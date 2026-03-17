from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn
import asyncio
from typing import List, Optional
import os
import time
import subprocess
import sys
import base64
import hashlib
from pydantic import BaseModel
from app.detector import ObjectDetector

class ImageRequest(BaseModel):
    imageData: List[str]  # array of base64 strings
    conf_threshold: Optional[float] = 0.5
    question: Optional[str] = None

app = FastAPI(title="Object Detection API", version="1.0.0")

# Initialize detector (lazy loading)
detector: Optional[ObjectDetector] = None

@app.on_event("startup")
async def startup_event():
    """Initialize the object detector on startup."""
    global detector
    try:
        detector = ObjectDetector()
        print("Object detector initialized successfully")
    except Exception as e:
        print(f"Failed to initialize detector: {e}")
        # Continue without detector for development

@app.post("/detect")
async def detect_objects(file: UploadFile = File(...), conf_threshold: float = Form(0.5)):
    """
    Detect objects in uploaded image.
    
    Args:
        file: Image file (jpg, png, etc.)
        conf_threshold: Confidence threshold (0.0-1.0)
        
    Returns:
        JSON with detected objects
    """
    if detector is None:
        raise HTTPException(status_code=503, detail="Object detector not initialized")
    
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff')):
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    try:
        # Read image data
        image_data = await file.read()
        
        # Perform detection
        detected_objects = await detector.detect_objects(image_data, conf_threshold)
        
        return {
            "success": True,
            "detected_objects": detected_objects,
            "count": len(detected_objects)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Detection failed: {str(e)}"
        }

@app.post("/detect-batch")
async def detect_batch(request: ImageRequest):
    """
    Detect objects in multiple images provided as Base64 strings.
    """
    if detector is None:
        raise HTTPException(status_code=503, detail="Object detector not initialized")
    
    if not request.imageData:
        raise HTTPException(status_code=400, detail="No images provided")

    try:
        image_data_list = []
        for b64_str in request.imageData:
            # Handle data:image/jpeg;base64, prefixes
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            
            try:
                img_bytes = base64.b64decode(b64_str)
                image_data_list.append(img_bytes)
            except Exception as e:
                print(f"Base64 decode error: {e}")
                continue
        
        if not image_data_list:
            raise HTTPException(status_code=400, detail="None of the provided images could be decoded")

        # Perform batch detection
        batch_results = await detector.detect_batch(image_data_list, request.conf_threshold)
        
        solution = []
        target = request.question.strip().lower() if request.question else None
        
        target_list = []
        if target:
            for t in target.split(','):
                t = t.strip()
                if t.startswith("the "):
                    t = t[4:].strip()
                if t:
                    target_list.append(t)

        if target_list:
            for idx, detections in enumerate(batch_results):
                for obj in detections:
                    # obj should be a dict containing 'label'
                    label = obj.get("label", "").lower()
                    
                    match = False
                    for t in target_list:
                        if t in label or label in t:
                            match = True
                            break
                            
                    if match:
                        solution.append(idx)
                        break
        
        return {
            "success": True,
            "results": batch_results,
            "solution": solution
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Batch detection failed: {str(e)}"
        }

@app.post("/save-training-data")
async def save_training_data(file: UploadFile = File(...), label: str = "unknown"):
    """Save an image and its label for future training."""
    try:
        os.makedirs("training_data", exist_ok=True)
        timestamp = int(time.time())
        filename = f"{label}_{timestamp}_{file.filename}"
        filepath = os.path.join("training_data", filename)
        
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
            
        return {"success": True, "saved_as": filename}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/upload-multiple")
async def upload_multiple_images(request: ImageRequest):
    """
    Upload multiple images via Base64 strings and save them to the 'uploads' directory.
    Prevents duplicates using MD5 hashing.
    """
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    saved_files = []
    skipped_count = 0
    
    # Get existing file hashes to check for duplicates
    existing_hashes = set()
    for f in os.listdir(upload_dir):
        if os.path.isfile(os.path.join(upload_dir, f)):
            # We assume filename format is hash_name.jpg
            if "_" in f:
                existing_hashes.add(f.split("_")[0])

    try:
        for idx, base64_str in enumerate(request.imageData):
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            
            img_data = base64.b64decode(base64_str)
            
            # Calculate MD5 hash for duplicate checking
            img_hash = hashlib.md5(img_data).hexdigest()
            
            if img_hash in existing_hashes:
                skipped_count += 1
                continue
                
            timestamp = int(time.time() * 1000)
            filename = f"{img_hash}_{timestamp}_{idx}.jpg"
            filepath = os.path.join(upload_dir, filename)
            
            with open(filepath, "wb") as f:
                f.write(img_data)
                
            saved_files.append(filename)
            existing_hashes.add(img_hash)
            
        return {
            "success": True, 
            "saved_count": len(saved_files), 
            "skipped_count": skipped_count,
            "saved_files": saved_files
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# Global variable to track training status
training_process = None

@app.post("/train")
async def start_training(dataset_type: str = "auto"):
    """Trigger the YOLO training script as a background process."""
    global training_process
    
    if training_process and training_process.poll() is None:
        return {"success": False, "error": "Training is already in progress"}
    
    try:
        # Use sys.executable to ensure we use the same environment
        script_path = os.path.join("scripts", "train_model.py")
        env = os.environ.copy()
        env["TRAIN_DATASET_TYPE"] = dataset_type
        training_process = subprocess.Popen([sys.executable, script_path], env=env)
        
        return {"success": True, "message": "Training started in background"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/train/status")
async def get_training_status():
    """Check if training is currently running."""
    if training_process is None:
        return {"running": False, "status": "idle"}
    
    poll = training_process.poll()
    if poll is None:
        return {"running": True, "status": "training"}
    elif poll == 0:
        return {"running": False, "status": "completed"}
    else:
        return {"running": False, "status": f"failed (code {poll})"}

@app.get("/info")
async def get_info():
    """Get information about the object detector."""
    if detector is None:
        return {"model_name": "Not Initialized", "device": "N/A"}
    return {
        "model_name": detector.model_name,
        "device": detector.device
    }

@app.post("/reload")
async def reload_model():
    """Reload the model from disk."""
    global detector
    try:
        if detector is None:
            detector = ObjectDetector()
            return {"success": True, "message": "Model initialized successfully"}
        else:
            detector.reload_model()
            return {"success": True, "message": "Model reloaded successfully"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# Static files are mounted at the end to serve the front-end

# Mount static files
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        workers=1
    )
