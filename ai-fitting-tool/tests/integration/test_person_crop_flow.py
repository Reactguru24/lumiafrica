import numpy as np
import pytest
from types import SimpleNamespace

from app.models.body_detector import BodyDetector, BodyDetectorConfig


class MockPerson:
    def __init__(self, x1, y1, x2, y2, confidence=0.99):
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2
        self.confidence = confidence


def test_crop_single_person(monkeypatch):
    cfg = BodyDetectorConfig(
        enable_nudity_check=False,
        enable_person_detection=True
    )
    detector = BodyDetector(cfg)

    # Fake YOLO → exactly one person detected
    def fake_detect(_self, img):
        return [MockPerson(50, 100, 450, 900)]

    monkeypatch.setattr(detector.person_detector, "detect", fake_detect.__get__(detector.person_detector))

    # Fake pose always returns a valid small set of visible landmarks
    pose = SimpleNamespace(
        pose_landmarks=SimpleNamespace(
            landmark=[SimpleNamespace(x=0.5, y=0.5, visibility=1.0)] * 33
        )
    )

    monkeypatch.setattr(detector, "_detect_pose", lambda *_: pose)
    monkeypatch.setattr(detector, "_check_resolution_and_sharpness", lambda *_: {"ok": True, "code": "OK", "details": {}})

    img = np.zeros((1000, 500, 3), dtype=np.uint8)
    result = detector.validate_image(img)

    assert result["valid"] is True
    assert result["details"]["person_box"]["x1"] == 50
    assert result["details"]["person_box"]["y1"] == 100


def test_crop_multi_person(monkeypatch):
    cfg = BodyDetectorConfig(
        enable_nudity_check=False,
        enable_person_detection=True
    )
    detector = BodyDetector(cfg)

    def fake_detect(_self, img):
        return [
            MockPerson(10, 10, 100, 200),
            MockPerson(200, 10, 300, 200),
        ]

    monkeypatch.setattr(detector.person_detector, "detect", fake_detect.__get__(detector.person_detector))
    monkeypatch.setattr(detector, "_check_resolution_and_sharpness", lambda *_: {"ok": True, "code": "OK", "details": {}})

    img = np.zeros((800, 600, 3), dtype=np.uint8)
    result = detector.validate_image(img)

    assert result["valid"] is False
    assert result["code"] == "MULTIPLE_PEOPLE"


def test_crop_no_person(monkeypatch):
    cfg = BodyDetectorConfig(
        enable_nudity_check=False,
        enable_person_detection=True
    )
    detector = BodyDetector(cfg)

    def fake_detect(_self, img):
        return []

    monkeypatch.setattr(detector.person_detector, "detect", fake_detect.__get__(detector.person_detector))
    monkeypatch.setattr(detector, "_check_resolution_and_sharpness", lambda *_: {"ok": True, "code": "OK", "details": {}})

    img = np.zeros((800, 600, 3), dtype=np.uint8)
    result = detector.validate_image(img)

    assert result["valid"] is False
    assert result["code"] == "NO_BODY_DETECTED"
