import os
import logging
from dataclasses import dataclass
from typing import List, Optional, Tuple

import numpy as np
import cv2
import onnxruntime as ort

logger = logging.getLogger(__name__)


@dataclass
class DetectedPerson:
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float


class PersonDetector:
    """
    ONNXRuntime-based YOLO person detector.

    Assumptions:
    - Model exported with `yolo export ... format=onnx nms=True`
    - Input:  (1, 3, H, W), normalized [0,1]
    - Output: (num_detections, 6) or (1, num_detections, 6)
              [x1, y1, x2, y2, score, class]
    """

    def __init__(
        self,
        model_path: str = "app/models/yolov8n.onnx",
        confidence_threshold: float = 0.25,
        enabled: bool = True,
        input_size: int = 640,
    ) -> None:
        self.model_path = model_path
        self.confidence_threshold = confidence_threshold
        self.enabled = enabled
        self.input_size = input_size

        self.session: Optional[ort.InferenceSession] = None
        self.input_name: Optional[str] = None

        if not self.enabled:
            logger.info("PersonDetector is disabled via configuration.")
            return

        if not os.path.isfile(self.model_path):
            logger.error(
                "ONNX model not found at %s. PersonDetector disabled.",
                self.model_path,
            )
            self.enabled = False
            return

        try:
            logger.info("Loading ONNX model from %s", self.model_path)
            self.session = ort.InferenceSession(
                self.model_path,
                providers=["CPUExecutionProvider"],
            )
            self.input_name = self.session.get_inputs()[0].name
            logger.info("ONNX model loaded successfully.")
        except Exception as exc:
            logger.exception(
                "Failed to initialize ONNXRuntime session: %s", exc
            )
            self.enabled = False


    def _letterbox(
        self, img: np.ndarray, new_size: int
    ) -> Tuple[np.ndarray, float, Tuple[int, int]]:
        """
        Resize image with unchanged aspect ratio using padding.
        Returns:
            resized_img (H', W', 3),
            scale (float),
            (pad_w, pad_h)
        """
        h, w = img.shape[:2]
        scale = min(new_size / w, new_size / h)
        new_w, new_h = int(w * scale), int(h * scale)

        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

        pad_w = new_size - new_w
        pad_h = new_size - new_h
        top = pad_h // 2
        left = pad_w // 2

        # Create padded canvas
        canvas = np.full((new_size, new_size, 3), 114, dtype=np.uint8)
        canvas[top:top + new_h, left:left + new_w] = resized

        return canvas, scale, (left, top)

    def detect(self, image_rgb: np.ndarray) -> List[DetectedPerson]:
        """
        Detect persons in the given RGB uint8 image.

        Returns empty list if:
        - detector is disabled, or
        - ONNX session is unavailable, or
        - no persons detected.
        """

        if not self.enabled or self.session is None or self.input_name is None:
            return []

        if image_rgb is None or not isinstance(image_rgb, np.ndarray) or image_rgb.size == 0:
            logger.warning("PersonDetector.detect received invalid image.")
            return []

        # Ensure uint8 RGB
        if image_rgb.dtype != np.uint8:
            image_rgb = np.clip(image_rgb, 0, 255).astype(np.uint8)

        orig_h, orig_w = image_rgb.shape[:2]

        # 1) Letterbox resize to input_size x input_size
        lb_img, scale, (pad_x, pad_y) = self._letterbox(image_rgb, self.input_size)

        # 2) Prepare input tensor: (1, 3, H, W), float32, [0,1]
        inp = lb_img.astype(np.float32) / 255.0
        inp = np.transpose(inp, (2, 0, 1))  # HWC -> CHW
        inp = np.expand_dims(inp, axis=0)   # CHW -> 1CHW

        # 3) Run ONNX inference
        try:
            outputs = self.session.run(None, {self.input_name: inp})
        except Exception as exc:
            logger.warning("ONNXRuntime inference failed: %s", exc)
            return []

        if not outputs:
            return []

        dets = outputs[0]

        # Handle shapes: (num, 6) or (1, num, 6)
        if dets.ndim == 3:
            dets = dets[0]

        persons: List[DetectedPerson] = []

        for det in dets:
            x1, y1, x2, y2, score, cls_id = det.tolist()
            score = float(score)
            cls_id = int(cls_id)

            if score < self.confidence_threshold:
                continue

            # If your model is multi-class, filter for person (class 0)
            if cls_id != 0:
                continue

            # Reverse letterbox transform
            # Remove padding, then scale back to original resolution
            x1 = (x1 - pad_x) / scale
            y1 = (y1 - pad_y) / scale
            x2 = (x2 - pad_x) / scale
            y2 = (y2 - pad_y) / scale

            # Clip to image bounds
            x1 = max(0, min(orig_w - 1, x1))
            x2 = max(0, min(orig_w - 1, x2))
            y1 = max(0, min(orig_h - 1, y1))
            y2 = max(0, min(orig_h - 1, y2))

            if x2 <= x1 or y2 <= y1:
                continue

            persons.append(
                DetectedPerson(
                    x1=int(x1),
                    y1=int(y1),
                    x2=int(x2),
                    y2=int(y2),
                    confidence=score,
                )
            )

        return persons
