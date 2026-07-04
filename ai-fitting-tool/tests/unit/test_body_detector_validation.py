import numpy as np
from types import SimpleNamespace
from app.models.body_detector import BodyDetector, BodyDetectorConfig


def test_validate_image_no_body_detected(monkeypatch):
    """
    Unit-level test: ensure NO_BODY_DETECTED is surfaced correctly
    when pose detection returns no landmarks.
    """

    cfg = BodyDetectorConfig(
        enable_nudity_check=False,
        enable_person_detection=False,
    )
    detector = BodyDetector(cfg)

    # Fake quality check to always pass
    def fake_quality(_self, _image_rgb):
        return {"ok": True, "code": "OK", "details": {}}

    monkeypatch.setattr(
        detector,
        "_check_resolution_and_sharpness",
        fake_quality.__get__(detector, BodyDetector),
    )

    # Fake pose detection: no landmarks
    dummy_results = SimpleNamespace(pose_landmarks=None)

    def fake_detect_pose(_self, _image_rgb):
        return dummy_results

    monkeypatch.setattr(
        detector,
        "_detect_pose",
        fake_detect_pose.__get__(detector, BodyDetector),
    )

    img = np.zeros((720, 480, 3), dtype=np.uint8)

    result = detector.validate_image(img)
    assert result["valid"] is False
    assert result["code"] == "NO_BODY_DETECTED"
    assert result["details"] == {"visible_landmarks": 0}
