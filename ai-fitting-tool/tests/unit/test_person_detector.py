import numpy as np
import pytest
from pathlib import Path

from app.models.person_detector import PersonDetector


def test_person_detector_disabled_when_model_missing(tmp_path):
    # Force a non-existent model path
    detector = PersonDetector(
        model_path=str(tmp_path / "missing.onnx"),
        enabled=True,
    )

    assert detector.enabled is False

    dummy_img = np.zeros((480, 640, 3), dtype=np.uint8)
    persons = detector.detect(dummy_img)
    assert persons == []


def test_person_detector_can_enable_if_model_exists():
    # This will only pass if you actually have this ONNX file present
    model_path = Path("app/models/yolov8n.onnx")
    if not model_path.exists():
        pytest.skip("yolov8n.onnx not present, skipping positive load test")

    detector = PersonDetector(
        model_path=str(model_path),
        enabled=True,
    )

    assert detector.enabled is True
