# Vision Sentinel - AI Object Detection API

A real-time object detection web application powered by YOLOv8 and FastAPI.

## API Endpoints

### 1. Object Detection
- **POST `/detect`**
  - Upload a single image for detection.
  - Parameters: `file` (UploadFile), `conf_threshold` (float).
- **POST `/detect-batch`**
  - Process multiple images via Base64.
  - Payload: `{ "imageData": ["b64_str", ...], "conf_threshold": 0.5, "question": "label" }`.

### 2. Dataset & Training Data
- **POST `/save-training-data`**
  - Save an image with a label to the `training_data/` folder.
- **POST `/upload-multiple`**
  - Bulk upload multiple Base64 images for dataset collection.

### 3. Training Control
- **POST `/train`**
  - Starts the YOLO training background process.
  - Query Param: `dataset_type` (auto, roboflow, custom).
- **GET `/train/status`**
  - Returns current training status and progress percentage.
  - Response: `{ "running": true, "status": "training", "progress": 62 }`.

### 4. Model & System Info
- **GET `/info`**
  - Get active model name and processing device (CPU/CUDA).
- **POST `/reload`**
  - Hot-reload the model from `app/model/best.pt`.
- **GET `/models`**
  - List all available `.pt` files in the system.
- **GET `/download-model/{path}`**
  - Download a specific model file.

## Modern Frontend Design & API Integration Prompt

Use the following prompt to generate a cutting-edge, professional UI that fully utilizes the backend APIs. You can copy the code block below directly into your AI chat.

```text
Act as a World-Class UI/UX Designer and Frontend Expert. Your goal is to build 'Vision Sentinel v2.0'—a professional-grade AI Monitoring Dashboard.

### 1. Ultra-Modern Visual Style
- **Design System**: Glassmorphism combined with a Cyberpunk 2077 high-tech feel.
- **Aesthetics**: Use semi-transparent 'glass' panels with sharp neon borders, backdrop-blur (12px+), and high-contrast typography.
- **Color Palette**: 
  - Background: Deep Midnight Navy (#020617).
  - Primary Neon: Cyan (#22d3ee) for interactive elements.
  - Secondary: Vivid Purple (#a855f7) for training/status highlights.
  - Success: Emerald-500 for confirmations.
- **Animations**: Smooth micro-interactions, spring-physics based transitions, and subtle pulse glows on active detection slots.

### 2. API-Driven Architecture (Crucial)
Start by implementing a Connection Manager that asks for the Base URL (default: http://localhost:8000).

#### A. Inference Engine (Using POST /detect-batch)
- Design a 3x3 high-fidelity image grid.
- When images are dropped, convert to Base64 and send a single batch request to /detect-batch.
- Live Overlay: Render detection labels and confidence scores directly over the images using absolute positioning.
- Query Filter: Add a sleek search-style input that updates the question field in the API payload to filter specific objects.

#### B. Training Lifecycle (Using /train and /train/status)
- Create a dedicated 'Training Laboratory' view.
- Trigger background training via POST /train?dataset_type=...
- Progress Monitoring: Implement a real-time polling mechanism (3s interval) to GET /train/status.
- Visual Feedback: Map the progress percentage (0-100) to a modern circular progress ring or a glowing linear bar. Show "Status: Completed (100%)" only when the API returns the completed state.

#### C. Model Repository (Using GET /models)
- A list-view of all available .pt files. Show file size and path.
- Add a 'Hot Reload' button that calls POST /reload to swap models without restarting.

### 3. UX Features
- Latency Tracker: Display the response time for every batch request in milliseconds.
- Toast System: Use floating notification cards for status updates (e.g., 'Model Reloaded Successfully').
- System Diagnostics: Display active model and device info by fetching GET /info on load.
```

## Tech Stack

- **Backend**: FastAPI + Uvicorn
- **ML**: YOLOv8 (Ultralytics)
- **Frontend**: Tailwind CSS, Vanilla JS
- **Containerization**: Docker

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

## if eror pkg

```bash
pip install ultralytics
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
