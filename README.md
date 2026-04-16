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

## Frontend Design & Implementation Prompt

Use this comprehensive prompt to generate or improve the frontend. It includes the logic for connecting to the backend.

> "Act as a Senior Frontend Engineer and UI/UX Designer. Create a high-tech 'Vision Sentinel' dashboard using **Tailwind CSS** and **Vanilla JavaScript** (or React).
> 
> ### 1. Visual Aesthetic
> - **Theme**: Dark, cyberpunk/futuristic aesthetic.
> - **Colors**: Deep Slate backgrounds, Neon-Cyan (#22d3ee) for primary actions, and Emerald-Green for success/training states.
> - **Animations**: Subtle glow effects, animated progress bars, and pulse indicators for system health.
> 
> ### 2. Core Functional Components
> - **API Configuration**: Start by asking the user for a **Base URL** (e.g., `http://localhost:8000`) and store it globally for all API calls.
> - **Inference Grid**: A responsive 3x3 interactive grid. Each slot must support drag-and-drop uploads and display real-time detection bounding boxes.
> - **Control Sidebar**: 
>   - Confidence Threshold slider (0.01 to 1.0).
>   - 'Target Object' text input for filtering results (calls `/detect-batch` with the `question` parameter).
> - **Training Dashboard**: A secondary modal for mass dataset collection with bulk image upload functionality.
> 
> ### 3. API Integration Logic
> - **Real-time Status**: Poll the `/train/status` endpoint every 3 seconds during training to update a visual circular or linear progress bar using the `progress` field.
> - **Batch Processing**: Use the `POST /detect-batch` endpoint for the 3x3 grid. Send images as Base64 strings in the `imageData` array.
> - **Model Management**: Fetch available models from `/models` and display them in a list with download buttons.
> 
> ### 4. UX Requirements
> - Implement a Toast notification system for success/error messages.
> - Show system latency (response time) for every detection request.
> - Ensure the layout is fully responsive and looks like a professional military-grade monitoring system."

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
