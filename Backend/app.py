from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from io import BytesIO
from PIL import Image
import numpy as np
import cv2
import torch
from torchvision.ops import nms

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load only ONE YOLO model
model = YOLO("./model/best2.pt")

CONFIDENCE_THRESHOLD = 0.4  # adjust as needed
IOU_THRESHOLD = 0.5          # for NMS

def apply_nms(detections, iou_threshold=0.5):
    if not detections:
        return []

    boxes = torch.tensor([[d["box"]["xmin"], d["box"]["ymin"], d["box"]["xmax"], d["box"]["ymax"]] for d in detections])
    scores = torch.tensor([d["score"] for d in detections])

    keep = nms(boxes, scores, iou_threshold)
    return [detections[i] for i in keep]


@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    # Read uploaded file
    contents = await file.read()
    try:
        image = Image.open(BytesIO(contents)).convert("RGB")
    except Exception:
        return {"error": "Invalid image"}

    # Convert to NumPy array (HWC, RGB)
    image_np = np.array(image)

    # Convert RGB -> BGR (OpenCV style)
    image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)

    detections = []
    # Run inference with chosen image size
    scales = [640, 960, 1280]
    for sz in scales:
        results = model(image_bgr, imgsz=sz)
        for r in results:
            for box in r.boxes:
                score = float(box.conf[0])
                if score >= CONFIDENCE_THRESHOLD:
                    class_id = int(box.cls[0])
                    detections.append({
                        "label": model.names[class_id],
                        "score": score,
                        "box": {
                            "xmin": float(box.xyxy[0][0]),
                            "ymin": float(box.xyxy[0][1]),
                            "xmax": float(box.xyxy[0][2]),
                            "ymax": float(box.xyxy[0][3])
                        }
                    })

    # Apply NMS
    final_detections = apply_nms(detections, iou_threshold=IOU_THRESHOLD)
    return final_detections
