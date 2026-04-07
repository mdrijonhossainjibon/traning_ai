# Vision Sentinel - AI Object Detection API

A real-time object detection web application powered by YOLOv8 and FastAPI. Features a modern UI with up to 9-slot image grid, batch processing, training data collection, and model management.

## Features

- **Multi-image analysis** — Upload 1-9 images into the grid (or use the master batch drop) and run detection concurrently
- **Batch detection API** — `/detect-batch` endpoint accepts Base64-encoded images and an optional question filter
- **Training data collection** — Save labeled images via the UI (`/save-training-data`) or bulk upload (`/upload-multiple`)
- **Model training** — Trigger YOLO training in the background (`/train`), supports Roboflow or custom datasets
- **Model management** — List, download, and hot-reload `.pt` model files through the UI or API
- **Real-time status** — Live training status polling, system info (model name, device), and latency reporting

## Tech Stack

- **Backend**: FastAPI + Uvicorn
- **ML**: YOLOv8 (Ultralytics) with CUDA fallback to CPU
- **Frontend**: Tailwind CSS, vanilla JavaScript
- **Containerization**: Docker

## Prerequisites

- Python 3.10+
- (Optional) CUDA-compatible GPU for faster inference

## Quick Start

### 1. Set up virtual environment

```bash
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Place your model weights

Place your trained `.pt` file at `app/model/best.pt`. If unavailable the app falls back to `yolov8n.pt`.

### 4. Run the server

```bash
python -m app.main
```

Open `http://localhost:8000` in your browser.

## Project Structure

```
object_detection_api/
├── app/
│   ├── main.py            # FastAPI app and all endpoints
│   ├── detector.py        # ObjectDetector wrapper around YOLOv8
│   └── model/             # Place best.pt here
├── static/
│   ├── index.html         # Frontend UI (Vision Sentinel)
│   └── app.js             # Client-side logic
├── scripts/
│   └── train_model.py     # Training script
├── roboflow_dataset/      # (Optional) Roboflow dataset
├── training_data/         # Saved training images from UI
├── uploads/               # Uploaded images with dedup
├── requirements.txt       # Python dependencies
├── Dockerfile             # Docker image
└── README.md              # This file
```

## API Endpoints

| Method | Path                | Description                          |
|--------|---------------------|--------------------------------------|
| `POST` | `/detect`           | Detect objects in a single image     |
| `POST` | `/detect-batch`     | Detect objects in multiple images    |
| `POST` | `/save-training-data` | Save an image + label               |
| `POST` | `/upload-multiple`  | Save multiple Base64 images (dedup)  |
| `POST` | `/train`            | Start background training            |
| `GET`  | `/train/status`     | Check training status                |
| `GET`  | `/info`             | Get model name and device info       |
| `POST` | `/reload`           | Reload model from disk               |
| `GET`  | `/models`           | List available `.pt` models          |
| `GET`  | `/download-model/{path}` | Download a model file         |
| `GET`  | `/`                 | Web UI                               |

## Docker

```bash
docker build -t vision-sentinel .
docker run -p 8000:8000 vision-sentinel
```

## License

MIT
