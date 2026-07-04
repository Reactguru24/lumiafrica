import cv2
import mediapipe as mp
import numpy as np
import logging
from dataclasses import dataclass
from typing import Optional, Dict, Any

from app.models.person_detector import PersonDetector
from app.models.pose_quality import compute_pose_quality, compute_orientation
from app.models.height_scaler import compute_height_scale

logger = logging.getLogger(__name__)


@dataclass
class BodyDetectorConfig:
    min_visible_landmarks: int = 15
    min_height_px: int = 480
    min_width_px: int = 320
    min_laplacian_var: float = 50.0
    enable_nudity_check: bool = True
    enable_person_detection: bool = True
    nudity_thresholds: Dict[str, float] = None

    def __post_init__(self):
        if self.nudity_thresholds is None:
            self.nudity_thresholds = {
                "EXPOSED_BREAST_F": 0.6,
                "EXPOSED_BREAST_M": 0.6,
                "EXPOSED_BUTTOCKS": 0.6,
                "EXPOSED_GENITALIA_F": 0.5,
                "EXPOSED_GENITALIA_M": 0.5,
                "EXPOSED_ANUS": 0.5,
                "EXPOSED_BELLY": 0.7,
            }


class BodyDetector:
    def __init__(self, config: Optional[BodyDetectorConfig] = None) -> None:
        self.config = config or BodyDetectorConfig()
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.nudity_classifier = self._init_nudity_classifier()
        self.person_detector = (
            PersonDetector() if self.config.enable_person_detection else None
        )

    def validate_image(
        self,
        image_np: np.ndarray,
        user_height_cm: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Validates the image and enriches result with:
        - pose_quality
        - orientation
        - height_scale (if available)
        """
        # Normalize and quality check
        try:
            image_rgb = self._normalize_image(image_np)
        except ValueError as exc:
            logger.warning("Image normalization failed: %s", exc)
            return {
                "valid": False,
                "code": "INVALID_INPUT",
                "message": "Invalid image data. Please upload a valid image file.",
                "details": {},
            }
        except Exception as exc:
            logger.error("Unexpected error normalizing image: %s", exc, exc_info=True)
            return {
                "valid": False,
                "code": "PROCESSING_ERROR",
                "message": "Failed to process the image. Please try again with a clear photo.",
                "details": {},
            }

        h, w = image_rgb.shape[:2]

        quality = self._check_resolution_and_sharpness(image_rgb)
        if not quality["ok"]:
            code = quality["code"]
            message_map = {
                "LOW_RESOLUTION": "Image resolution is too low. Please upload a higher-quality photo.",
                "BLURRY": "Image is too blurry. Please upload a clear, sharp photo.",
            }
            return {
                "valid": False,
                "code": code,
                "message": message_map.get(code, "Image quality is insufficient."),
                "details": quality["details"],
            }

        # Person detection (multi-person handling)
        person_info = self._crop_to_person_if_available(image_rgb)
        if person_info.get("multi_person"):
            return {
                "valid": False,
                "code": "MULTIPLE_PEOPLE",
                "message": "Multiple people were detected. Please upload a photo with only you in the frame.",
                "details": {},
            }

        if person_info.get("no_person"):
            return {
                "valid": False,
                "code": "NO_BODY_DETECTED",
                "message": "We could not detect a person in the photo. Please upload a full-body photo.",
                "details": {},
            }

        cropped_rgb = person_info["image"]
        ch, cw = cropped_rgb.shape[:2]

        results = self._detect_pose(cropped_rgb)
        pose_result = self._validate_pose(results, cw, ch)
        if not pose_result["ok"]:
            code = pose_result["code"]
            message_map = {
                "NO_BODY_DETECTED": (
                    "We could not detect a person in the photo. "
                    "Please upload a full-body photo where your entire body is visible."
                ),
                "INSUFFICIENT_LANDMARKS": (
                    "The person is not clearly visible. "
                    "Please ensure good lighting and that your full body is visible."
                ),
                "CROPPED_BODY": (
                    "Your body appears cropped in the photo. "
                    "Please ensure your whole body fits inside the frame."
                ),
            }
            return {
                "valid": False,
                "code": code,
                "message": message_map.get(code, "The photo does not meet the requirements."),
                "details": pose_result["details"],
            }

        # Nudity / clothing check
        nudity_result = self._check_nudity(cropped_rgb)
        if nudity_result and not nudity_result["ok"]:
            return {
                "valid": False,
                "code": nudity_result["code"],
                "message": (
                    "The photo seems to contain inappropriate content. "
                    "Please make sure you are wearing appropriate clothing (top and pants/skirt)."
                ),
                "details": nudity_result["details"],
            }

        # Pose quality & orientation
        landmarks = results.pose_landmarks.landmark
        pose_quality = compute_pose_quality(landmarks, cw, ch)
        orientation = compute_orientation(landmarks, ch)
        scale_cm_per_px = self._compute_pixel_scale(landmarks, ch, user_height_cm)

        details: Dict[str, Any] = {
            "width": w,
            "height": h,
            "cropped_width": cw,
            "cropped_height": ch,
            "quality": quality["details"],
            "pose": pose_result["details"],
            "pose_quality": {
                "score": pose_quality.score,
                "label": pose_quality.label,
                "components": pose_quality.details,
            },
            "orientation": {
                "label": orientation.orientation,
                "confidence": orientation.confidence,
                "details": orientation.details,
            },
        }

        if person_info.get("person_box"):
            details["person_box"] = person_info["person_box"]

        if scale_cm_per_px is not None:
            details["height_scale"] = {
                "scale_cm_per_pixel": scale_cm_per_px,
                "person_pixel_height": (
                    landmarks[self.mp_pose.PoseLandmark.NOSE].y
                    - landmarks[self.mp_pose.PoseLandmark.LEFT_ANKLE].y
                ) * ch,
            }

        return {
            "valid": True,
            "code": "OK",
            "message": "Image is valid for body measurement analysis.",
            "details": details,
        }

    def detect_measurements(
        self,
        image_np: np.ndarray,
        height: float = None,
        weight: float = None,
        precomputed_scale_cm_per_pixel: float | None = None,
    ):
        """
        Detect body measurements from an image using unified pixel scaling.
        """
        image_rgb = self._normalize_image(image_np)
        img_h, img_w = image_rgb.shape[:2]

        results = self._detect_pose(image_rgb)
        if not results.pose_landmarks:
            raise ValueError("No landmarks detected for measurement extraction.")

        landmarks = results.pose_landmarks.landmark

        cm_per_px = None
        if precomputed_scale_cm_per_pixel:
            cm_per_px = precomputed_scale_cm_per_pixel
        else:
            height_scale = compute_height_scale(landmarks, img_h, height)
            if height_scale.usable:
                cm_per_px = height_scale.scale_cm_per_pixel
            else:
                nose_idx = self.mp_pose.PoseLandmark.NOSE
                ankle_left = self.mp_pose.PoseLandmark.LEFT_ANKLE
                ankle_right = self.mp_pose.PoseLandmark.RIGHT_ANKLE

                nose_y = landmarks[nose_idx].y * img_h
                ankle_y = (landmarks[ankle_left].y * img_h +
                           landmarks[ankle_right].y * img_h) / 2.0

                person_px_height = max(ankle_y - nose_y, 1.0)
                assumed_height_cm = 170.0
                cm_per_px = assumed_height_cm / person_px_height

        def dist(idx_a: int, idx_b: int) -> float:
            a = landmarks[idx_a]
            b = landmarks[idx_b]
            dx = (a.x - b.x) * img_w
            dy = (a.y - b.y) * img_h
            return (dx * dx + dy * dy) ** 0.5

        ls = self.mp_pose.PoseLandmark

        chest_px = dist(ls.LEFT_SHOULDER, ls.RIGHT_SHOULDER)
        waist_px = dist(ls.LEFT_HIP, ls.RIGHT_HIP)
        hips_px = waist_px * 1.05  # placeholder multiplier

        chest_cm = chest_px * cm_per_px
        waist_cm = waist_px * cm_per_px
        hips_cm = hips_px * cm_per_px

        if height:
            height_cm = height
        else:
            nose_y = landmarks[ls.NOSE].y * img_h
            ankle_y = (landmarks[ls.LEFT_ANKLE].y * img_h +
                       landmarks[ls.RIGHT_ANKLE].y * img_h) / 2.0
            person_px_height = max(ankle_y - nose_y, 1.0)
            height_cm = person_px_height * cm_per_px

        if weight and height_cm:
            bmi = weight / ((height_cm / 100) ** 2)
            adj = self._get_bmi_adjustment(bmi)
            chest_cm *= adj
            waist_cm *= adj
            hips_cm *= adj

        return {
            "chest": chest_cm,
            "waist": waist_cm,
            "hips": hips_cm,
            "height": height_cm,
        }

    def _init_nudity_classifier(self):
        """
        Initialize NudeNet (or compatible) detector if nudity checks are enabled.

        Returns:
            - classifier instance with .detect(...)
            - or None if disabled or initialization fails
        """
        if not self.config.enable_nudity_check:
            logger.info("Nudity check disabled by config.")
            return None

        try:
            from nudenet import NudeDetector  # type: ignore
        except ImportError:
            logger.warning(
                "nudenet package not installed; disabling nudity check. "
                "Install with `pip install nudenet` to enable."
            )
            return None

        try:
            # 'base' is the default model; adjust if you use a custom one.
            detector = NudeDetector("/app/models/nudenet/base.onnx")
            logger.info("NudeNet nudity classifier initialized.")
            return detector
        except Exception as exc:
            logger.warning(
                "Failed to initialize NudeNet nudity classifier: %s. Nudity check disabled.",
                exc,
                exc_info=True,
            )
            return None

    def _distance(self, point1, point2, width, height):
        x1, y1 = point1.x * width, point1.y * height
        x2, y2 = point2.x * width, point2.y * height
        return np.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

    def _get_bmi_adjustment(self, bmi: float) -> float:
        if bmi < 18.5:
            return 0.95
        elif 18.5 <= bmi < 25:
            return 1.0
        elif 25 <= bmi < 30:
            return 1.05
        else:
            return 1.1

    def _crop_to_person_if_available(self, image_rgb: np.ndarray) -> Dict[str, Any]:
        if self.person_detector is None or not self.person_detector.enabled:
            return {"image": image_rgb, "person_box": None, "multi_person": False}

        persons = self.person_detector.detect(image_rgb)
        if not persons:
            return {
                "image": image_rgb,
                "person_box": None,
                "multi_person": False,
                "no_person": True,
            }

        if len(persons) > 1:
            return {"image": image_rgb, "person_box": None, "multi_person": True}

        p = persons[0]
        h, w = image_rgb.shape[:2]
        x1 = max(p.x1, 0)
        y1 = max(p.y1, 0)
        x2 = min(p.x2, w)
        y2 = min(p.y2, h)
        cropped = image_rgb[y1:y2, x1:x2]

        return {
            "image": cropped,
            "person_box": {
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "confidence": p.confidence,
            },
            "multi_person": False,
        }

    def _detect_pose(self, image_rgb: np.ndarray):
        return self.pose.process(image_rgb)

    def _validate_pose(self, results, img_w: int, img_h: int) -> Dict[str, Any]:
        if not results.pose_landmarks:
            return {
                "ok": False,
                "code": "NO_BODY_DETECTED",
                "details": {"visible_landmarks": 0},
            }

        landmarks = results.pose_landmarks.landmark

        visible_landmarks = sum(1 for lm in landmarks if lm.visibility > 0.5)
        if visible_landmarks < self.config.min_visible_landmarks:
            return {
                "ok": False,
                "code": "INSUFFICIENT_LANDMARKS",
                "details": {"visible_landmarks": visible_landmarks},
            }

        key_indices = [
            self.mp_pose.PoseLandmark.NOSE,
            self.mp_pose.PoseLandmark.LEFT_SHOULDER,
            self.mp_pose.PoseLandmark.RIGHT_SHOULDER,
            self.mp_pose.PoseLandmark.LEFT_HIP,
            self.mp_pose.PoseLandmark.RIGHT_HIP,
        ]

        margin_ratio = 0.05
        border_hits = []

        for idx in key_indices:
            lm = landmarks[idx]
            x, y = lm.x * img_w, lm.y * img_h
            if (
                x < margin_ratio * img_w
                or x > (1 - margin_ratio) * img_w
                or y < margin_ratio * img_h
                or y > (1 - margin_ratio) * img_h
            ):
                border_hits.append(
                    {
                        "landmark": idx.name if hasattr(idx, "name") else str(idx),
                        "x": float(x),
                        "y": float(y),
                    }
                )

        if border_hits:
            return {
                "ok": False,
                "code": "CROPPED_BODY",
                "details": {
                    "visible_landmarks": visible_landmarks,
                    "border_hits": border_hits,
                },
            }

        return {
            "ok": True,
            "code": "OK",
            "details": {"visible_landmarks": visible_landmarks},
        }

    def _check_nudity(self, image_rgb: np.ndarray) -> Optional[Dict[str, Any]]:
        """
        If nudity detection is enabled and classifier exists, run NudeNet.
        """
        if not self.config.enable_nudity_check:
            return None

        if self.nudity_classifier is None:
            return None

        try:
            detections = self.nudity_classifier.detect(image_rgb)
        except Exception as exc:
            logger.warning("NudeNet inference failed: %s", exc, exc_info=True)
            return None

        inappropriate = []
        for d in detections:
            label = d.get("class")
            score = float(d.get("score", 0.0))
            threshold = self.config.nudity_thresholds.get(label)
            if threshold is not None and score >= threshold:
                inappropriate.append({"label": label, "score": score})

        if inappropriate:
            return {
                "ok": False,
                "code": "INAPPROPRIATE_CONTENT",
                "details": {"detections": inappropriate},
            }

        return {
            "ok": True,
            "code": "OK",
            "details": {"detections": detections},
        }

    def _normalize_image(self, image_np: np.ndarray) -> np.ndarray:
        if image_np is None or not isinstance(image_np, np.ndarray) or image_np.size == 0:
            raise ValueError("Invalid or empty image data")

        if len(image_np.shape) == 3 and image_np.shape[2] == 4:
            image_rgb = cv2.cvtColor(image_np, cv2.COLOR_RGBA2RGB)
        elif len(image_np.shape) == 2:
            image_rgb = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
        else:
            image_rgb = image_np

        if image_rgb.dtype != np.uint8:
            image_rgb = np.clip(image_rgb, 0, 255).astype(np.uint8)

        return image_rgb

    def _check_resolution_and_sharpness(self, image_rgb: np.ndarray) -> Dict[str, Any]:
        h, w = image_rgb.shape[:2]

        details: Dict[str, Any] = {"width": w, "height": h}

        if h < self.config.min_height_px or w < self.config.min_width_px:
            return {
                "ok": False,
                "code": "LOW_RESOLUTION",
                "details": {**details},
            }

        gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        var_laplace = cv2.CV_64F
        var_laplace = cv2.Laplacian(gray, cv2.CV_64F).var()
        details["laplacian_variance"] = float(var_laplace)

        if var_laplace < self.config.min_laplacian_var:
            return {
                "ok": False,
                "code": "BLURRY",
                "details": details,
            }

        return {
            "ok": True,
            "code": "OK",
            "details": details,
        }

    def _compute_pixel_scale(self, landmarks, image_h: int, user_height_cm: float | None):
        try:
            height_scale = compute_height_scale(landmarks, image_h, user_height_cm)
        except Exception:
            return None

        if not height_scale.usable:
            return None

        return height_scale.scale_cm_per_pixel
