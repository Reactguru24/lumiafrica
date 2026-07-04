import numpy as np
import pytest
from fastapi.testclient import TestClient
from types import SimpleNamespace
from io import BytesIO
import cv2

from app.main import app
from app.models.body_detector import BodyDetector, BodyDetectorConfig


client = TestClient(app)

@pytest.fixture
def mock_everything(monkeypatch):
    """Mocks all components so ANY image becomes valid for testing."""

    # --- 1. Force quality check to always pass ---
    monkeypatch.setattr(
        BodyDetector,
        "_check_resolution_and_sharpness",
        lambda self, img: {"ok": True, "code": "OK", "details": {}},
    )

    # --- 2. Force YOLO cropping to just return the full image ---
    monkeypatch.setattr(
        BodyDetector,
        "_crop_to_person_if_available",
        lambda self, img: {
            "image": img,
            "person_box": None,
            "multi_person": False,
        },
    )

    # --- 3. Fake pose with valid landmarks ---
    from types import SimpleNamespace
    import mediapipe as mp

    def lm(x, y, visibility=1.0):
        return SimpleNamespace(x=x, y=y, visibility=visibility)

    def make_landmarks():
        arr = [lm(0.5, 0.5)] * 33
        # Nose
        arr[mp.solutions.pose.PoseLandmark.NOSE] = lm(0.5, 0.1)
        # Shoulders
        arr[mp.solutions.pose.PoseLandmark.LEFT_SHOULDER] = lm(0.4, 0.4)
        arr[mp.solutions.pose.PoseLandmark.RIGHT_SHOULDER] = lm(0.6, 0.4)
        # Hips
        arr[mp.solutions.pose.PoseLandmark.LEFT_HIP] = lm(0.45, 0.7)
        arr[mp.solutions.pose.PoseLandmark.RIGHT_HIP] = lm(0.55, 0.7)
        # Ankles
        arr[mp.solutions.pose.PoseLandmark.LEFT_ANKLE] = lm(0.5, 0.95)
        arr[mp.solutions.pose.PoseLandmark.RIGHT_ANKLE] = lm(0.5, 0.95)
        return arr

    fake_pose = SimpleNamespace(
        pose_landmarks=SimpleNamespace(landmark=make_landmarks())
    )

    def fake_detect_pose(self, img):
        return fake_pose

    monkeypatch.setattr(
        BodyDetector,
        "_detect_pose",
        fake_detect_pose,
    )

    # --- 4. Fake height scale ---
    class FakeHeightScale:
        usable = True
        scale_cm_per_pixel = 0.2
        person_pixel_height = 800

    monkeypatch.setattr(
        "app.models.height_scaler.compute_height_scale",
        lambda *args, **kwargs: FakeHeightScale(),
    )

    # --- 5. Fake nudity classifier ---
    class FakeNudeNet:
        def detect(self, _img):
            return []  # no nudity detected

    monkeypatch.setattr(
        BodyDetector,
        "nudity_classifier",
        FakeNudeNet(),
        raising=False
    )

    return True


def test_api_analyze_valid(mock_everything):
    # Synthetic image
    img = np.zeros((1000, 800, 3), dtype=np.uint8)
    jpeg_bytes = cv2.imencode(".jpg", img)[1].tobytes()

    files = {
        "user_image": ("valid.jpg", BytesIO(jpeg_bytes), "image/jpeg"),
    }
    data = {
        "height": 170,
        "weight": 70,
    }

    resp = client.post("/api/analyze", files=files, data=data)

    assert resp.status_code == 200

    body = resp.json()

    assert body["validation"]["valid"] is True
    assert body["measurements"] is not None
    assert body["measurements"]["chest"] > 0
    assert body["measurements"]["waist"] > 0
    assert body["recommendation"] is None  # you haven't implemented sizing yet
    assert body["fit_analysis"] is None
