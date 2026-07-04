import numpy as np
from types import SimpleNamespace

from app.models.body_detector import BodyDetector, BodyDetectorConfig


def lm(x, y, visibility=1.0):
    return SimpleNamespace(x=x, y=y, visibility=visibility)


def make_pose(detector, mapping):
    """
    mapping = { PoseLandmark.LEFT_SHOULDER: lm(...) , ... }
    Produces a complete landmark list of 33 entries.
    """
    full = [lm(0, 0)] * 33
    for k, v in mapping.items():
        full[k] = v
    return SimpleNamespace(
        pose_landmarks=SimpleNamespace(landmark=full)
    )


def test_measurements_with_precomputed_scale(monkeypatch):
    cfg = BodyDetectorConfig(enable_nudity_check=False, enable_person_detection=False)
    detector = BodyDetector(cfg)

    # Shoulders 500px apart (pixel width = 1000)
    pose = make_pose(detector, {
        detector.mp_pose.PoseLandmark.LEFT_SHOULDER: lm(0.25, 0.5),
        detector.mp_pose.PoseLandmark.RIGHT_SHOULDER: lm(0.75, 0.5),
    })

    monkeypatch.setattr(detector, "_detect_pose", lambda *_: pose)

    img = np.zeros((1000, 1000, 3), dtype=np.uint8)
    result = detector.detect_measurements(img, precomputed_scale_cm_per_pixel=0.5)

    assert abs(result["chest"] - 250) < 1e-3


def test_measurements_height_fallback(monkeypatch):
    cfg = BodyDetectorConfig(enable_nudity_check=False, enable_person_detection=False)
    detector = BodyDetector(cfg)

    # Nose at y=0.1, ankles at y=0.9
    # Add hips so hips measurement is nonzero
    pose = make_pose(detector, {
        detector.mp_pose.PoseLandmark.NOSE: lm(0.5, 0.1),
        detector.mp_pose.PoseLandmark.LEFT_ANKLE: lm(0.5, 0.9),
        detector.mp_pose.PoseLandmark.RIGHT_ANKLE: lm(0.5, 0.9),
        detector.mp_pose.PoseLandmark.LEFT_HIP: lm(0.4, 0.7),
        detector.mp_pose.PoseLandmark.RIGHT_HIP: lm(0.6, 0.7),
    })

    monkeypatch.setattr(detector, "_detect_pose", lambda *_: pose)

    img = np.zeros((1000, 800, 3), dtype=np.uint8)
    result = detector.detect_measurements(img, height=None)

    # Height fallback → exactly 170 cm
    assert abs(result["height"] - 170) < 1e-3
    assert result["hips"] > 0   # now is nonzero


def test_measurements_bmi_adjustment(monkeypatch):
    cfg = BodyDetectorConfig(enable_nudity_check=False, enable_person_detection=False)
    detector = BodyDetector(cfg)

    # Shoulders 100px apart in a 1000px width image
    # Also define ankles + nose to drive height fallback correctly (1000px tall)
    pose = make_pose(detector, {
        detector.mp_pose.PoseLandmark.LEFT_SHOULDER: lm(0.4, 0.5),
        detector.mp_pose.PoseLandmark.RIGHT_SHOULDER: lm(0.5, 0.5),

        detector.mp_pose.PoseLandmark.NOSE: lm(0.5, 0.1),
        detector.mp_pose.PoseLandmark.LEFT_ANKLE: lm(0.5, 0.9),
        detector.mp_pose.PoseLandmark.RIGHT_ANKLE: lm(0.5, 0.9),

        detector.mp_pose.PoseLandmark.LEFT_HIP: lm(0.4, 0.7),
        detector.mp_pose.PoseLandmark.RIGHT_HIP: lm(0.6, 0.7),
    })

    monkeypatch.setattr(detector, "_detect_pose", lambda *_: pose)

    img = np.zeros((1000, 1000, 3), dtype=np.uint8)
    result = detector.detect_measurements(img, height=None, weight=120)

    # Pixel height = (0.9 - 0.1) * 1000 = 800px
    # cm_per_px = 170/800 = 0.2125
    # Chest_px = (0.5 - 0.4)*1000 = 100px
    # Chest_cm_raw = 21.25cm
    # BMI = obese → 1.1 multiplier
    expected = 21.25 * 1.1
    assert abs(result["chest"] - expected) < 1e-3
