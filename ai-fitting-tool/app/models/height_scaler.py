from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class HeightScaleResult:
    scale_cm_per_pixel: Optional[float]
    person_pixel_height: Optional[float]
    usable: bool
    details: Dict[str, Any]


def compute_height_scale(
    landmarks,
    img_h: int,
    user_height_cm: Optional[float],
) -> HeightScaleResult:
    """
    Estimate cm-per-pixel using user height and vertical span between head and ankles.
    Returns usable=False if height or landmarks are insufficient.
    """
    if not user_height_cm or user_height_cm <= 0:
        return HeightScaleResult(
            scale_cm_per_pixel=None,
            person_pixel_height=None,
            usable=False,
            details={"reason": "missing_or_invalid_user_height"},
        )

    # indices: nose (0) or top head proxy using nose, left/right ankle (27, 28)
    head_idx = 0
    ankle_indices = [27, 28]

    head = landmarks[head_idx]
    ankles = [landmarks[i] for i in ankle_indices]

    # If ankles visibility is too low, fail
    if any(a.visibility < 0.5 for a in ankles):
        return HeightScaleResult(
            scale_cm_per_pixel=None,
            person_pixel_height=None,
            usable=False,
            details={"reason": "ankles_not_clearly_visible"},
        )

    head_y = head.y * img_h
    ankle_y = sum(a.y for a in ankles) / len(ankles) * img_h

    person_pixel_height = ankle_y - head_y
    if person_pixel_height <= 0:
        return HeightScaleResult(
            scale_cm_per_pixel=None,
            person_pixel_height=None,
            usable=False,
            details={"reason": "non_positive_pixel_height"},
        )

    scale = user_height_cm / person_pixel_height

    return HeightScaleResult(
        scale_cm_per_pixel=float(scale),
        person_pixel_height=float(person_pixel_height),
        usable=True,
        details={},
    )
