from dataclasses import dataclass
from typing import Literal, Dict, Any
import math
import numpy as np


PoseQualityLabel = Literal["poor", "fair", "good", "excellent"]
OrientationLabel = Literal["standing", "seated", "unknown"]


@dataclass
class PoseQuality:
    score: float
    label: PoseQualityLabel
    details: Dict[str, Any]


@dataclass
class PoseOrientation:
    orientation: OrientationLabel
    confidence: float
    details: Dict[str, Any]


def _compute_visibility_score(landmarks, visibility_threshold: float = 0.5) -> float:
    visible = [lm for lm in landmarks if lm.visibility >= visibility_threshold]
    return len(visible) / max(len(landmarks), 1)


def _compute_verticality_score(landmarks, img_h: int) -> float:
    # Use shoulders and hips to estimate torso verticality
    # indices: left shoulder (11), right shoulder (12), left hip (23), right hip (24)
    idxs = [11, 12, 23, 24]
    pts = [landmarks[i] for i in idxs]
    ys = np.array([p.y * img_h for p in pts])
    xs = np.array([p.x for p in pts])

    # Approximate torso axis vector: mean shoulders to mean hips
    shoulder_y = (pts[0].y + pts[1].y) / 2.0
    hip_y = (pts[2].y + pts[3].y) / 2.0
    shoulder_x = (pts[0].x + pts[1].x) / 2.0
    hip_x = (pts[2].x + pts[3].x) / 2.0

    dy = (hip_y - shoulder_y)
    dx = (hip_x - shoulder_x)

    # Angle from vertical (0 = perfectly vertical)
    angle_rad = math.atan2(dx, dy)  # dx as horizontal, dy as vertical
    angle_deg = abs(angle_rad * 180.0 / math.pi)

    # Map angle 0–45 to score 1–0
    angle_deg = min(angle_deg, 45.0)
    return float(1.0 - angle_deg / 45.0)


def _compute_symmetry_score(landmarks) -> float:
    # use shoulders and hips: left/right
    # indices: left shoulder (11), right shoulder (12), left hip (23), right hip (24)
    left_shoulder, right_shoulder = landmarks[11], landmarks[12]
    left_hip, right_hip = landmarks[23], landmarks[24]

    # distances from center line x=0.5
    def symmetry_component(lm_left, lm_right) -> float:
        center_x = 0.5
        dl = abs(lm_left.x - center_x)
        dr = abs(lm_right.x - center_x)
        return 1.0 - min(abs(dl - dr) * 2.0, 1.0)

    shoulder_sym = symmetry_component(left_shoulder, right_shoulder)
    hip_sym = symmetry_component(left_hip, right_hip)

    return float((shoulder_sym + hip_sym) / 2.0)


def _compute_cropping_score(landmarks, img_w: int, img_h: int) -> float:
    # Check if important landmarks are away from borders (margin)
    key_indices = [0, 11, 12, 23, 24]  # nose, shoulders, hips
    margin_ratio = 0.05
    bad = 0
    for idx in key_indices:
        lm = landmarks[idx]
        x, y = lm.x * img_w, lm.y * img_h
        if (
            x < margin_ratio * img_w
            or x > (1 - margin_ratio) * img_w
            or y < margin_ratio * img_h
            or y > (1 - margin_ratio) * img_h
        ):
            bad += 1

    if bad == 0:
        return 1.0
    if bad >= len(key_indices):
        return 0.0

    return float(1.0 - bad / len(key_indices))


def compute_pose_quality(landmarks, img_w: int, img_h: int) -> PoseQuality:
    vis = _compute_visibility_score(landmarks)
    vert = _compute_verticality_score(landmarks, img_h)
    sym = _compute_symmetry_score(landmarks)
    crop = _compute_cropping_score(landmarks, img_w, img_h)

    # Weighted sum – tune as needed
    score = float(
        0.4 * vis +
        0.25 * vert +
        0.2 * sym +
        0.15 * crop
    )

    if score < 0.4:
        label: PoseQualityLabel = "poor"
    elif score < 0.6:
        label = "fair"
    elif score < 0.8:
        label = "good"
    else:
        label = "excellent"

    return PoseQuality(
        score=score,
        label=label,
        details={
            "visibility": vis,
            "verticality": vert,
            "symmetry": sym,
            "cropping": crop,
        },
    )


def compute_orientation(landmarks, img_h: int) -> PoseOrientation:
    # Use hips, knees, ankles to detect standing vs seated
    # indices: left hip (23), right hip (24), left knee (25), right knee (26),
    # left ankle (27), right ankle (28)
    hip_indices = [23, 24]
    knee_indices = [25, 26]
    ankle_indices = [27, 28]

    hips = [landmarks[i] for i in hip_indices]
    knees = [landmarks[i] for i in knee_indices]
    ankles = [landmarks[i] for i in ankle_indices]

    # Average y positions in pixel coordinates
    hip_y = img_h * sum(h.y for h in hips) / len(hips)
    knee_y = img_h * sum(k.y for k in knees) / len(knees)
    ankle_y = img_h * sum(a.y for a in ankles) / len(ankles)

    # Distances
    hip_to_knee = knee_y - hip_y
    knee_to_ankle = ankle_y - knee_y
    hip_to_ankle = ankle_y - hip_y

    # Normalize by image height
    hip_to_knee_norm = hip_to_knee / img_h
    knee_to_ankle_norm = knee_to_ankle / img_h
    hip_to_ankle_norm = hip_to_ankle / img_h

    # Heuristics:
    # - Standing: hip_to_ankle_norm relatively large, knee_to_ankle_norm not too compressed
    # - Seated: hip_to_knee small and knee_to_ankle small, legs are bent and closer to hips

    standing_score = 0.0
    seated_score = 0.0

    if hip_to_ankle_norm > 0.4:
        standing_score += 0.6
    if knee_to_ankle_norm > 0.15:
        standing_score += 0.2
    if hip_to_knee_norm > 0.15:
        standing_score += 0.2

    # Seated if legs are "short" in vertical projection
    if hip_to_ankle_norm < 0.3:
        seated_score += 0.6
    if knee_to_ankle_norm < 0.1:
        seated_score += 0.2
    if hip_to_knee_norm < 0.1:
        seated_score += 0.2

    if standing_score > seated_score and standing_score > 0.5:
        orientation: OrientationLabel = "standing"
        confidence = standing_score
    elif seated_score > standing_score and seated_score > 0.5:
        orientation = "seated"
        confidence = seated_score
    else:
        orientation = "unknown"
        confidence = max(standing_score, seated_score)

    return PoseOrientation(
        orientation=orientation,
        confidence=float(min(confidence, 1.0)),
        details={
            "hip_to_ankle_norm": hip_to_ankle_norm,
            "hip_to_knee_norm": hip_to_knee_norm,
            "knee_to_ankle_norm": knee_to_ankle_norm,
            "standing_score": standing_score,
            "seated_score": seated_score,
        },
    )
