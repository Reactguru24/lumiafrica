import numpy as np
import pytest
from types import SimpleNamespace

from app.models.body_detector import BodyDetector, BodyDetectorConfig


def mock_classifier(detections):
    """Returns an object with a .detect() method returning predefined detections."""
    class MockNudeNet:
        def detect(self, _img):
            return detections
    return MockNudeNet()


def test_nudity_check_disabled():
    cfg = BodyDetectorConfig(
        enable_nudity_check=False,
        enable_person_detection=False,
    )

    detector = BodyDetector(cfg)
    img = np.zeros((720, 480, 3), dtype=np.uint8)

    # Should return None when nudity check is disabled
    result = detector._check_nudity(img)
    assert result is None


def test_nudity_classifier_not_initialized():
    cfg = BodyDetectorConfig(
        enable_nudity_check=True,
        enable_person_detection=False,
    )

    detector = BodyDetector(cfg)
    detector.nudity_classifier = None  # Force missing classifier
    img = np.zeros((720, 480, 3), dtype=np.uint8)

    result = detector._check_nudity(img)
    assert result is None


def test_nudity_safe_image(monkeypatch):
    cfg = BodyDetectorConfig(
        enable_nudity_check=True,
        enable_person_detection=False,
    )

    detector = BodyDetector(cfg)
    
    # Fake NudeNet safe detections
    safe_detections = [
        {"class": "EXPOSED_BELLY", "score": 0.1},
        {"class": "EXPOSED_BREAST_F", "score": 0.2},
    ]

    detector.nudity_classifier = mock_classifier(safe_detections)

    img = np.zeros((720, 480, 3), dtype=np.uint8)

    result = detector._check_nudity(img)
    assert result["ok"] is True
    assert result["code"] == "OK"
    assert result["details"]["detections"] == safe_detections


def test_nudity_inappropriate_image(monkeypatch):
    cfg = BodyDetectorConfig(
        enable_nudity_check=True,
        enable_person_detection=False,
    )

    detector = BodyDetector(cfg)

    # Fake detections above configured thresholds
    dangerous_detections = [
        {"class": "EXPOSED_GENITALIA_M", "score": 0.9},
        {"class": "EXPOSED_BREAST_F", "score": 0.8},
    ]

    detector.nudity_classifier = mock_classifier(dangerous_detections)

    img = np.zeros((720, 480, 3), dtype=np.uint8)

    result = detector._check_nudity(img)

    assert result["ok"] is False
    assert result["code"] == "INAPPROPRIATE_CONTENT"

    # Should report only detections above thresholds
    assert len(result["details"]["detections"]) == 2
