import io
import numpy as np
import pytest
from PIL import Image
from fastapi import HTTPException

from app.utils.image_sanitizer import ImageSanitizer


def _make_image_bytes(width: int = 800, height: int = 600, fmt: str = "JPEG") -> bytes:
    img = Image.new("RGB", (width, height), (255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def test_process_valid_image_returns_numpy_array():
    raw = _make_image_bytes()
    arr = ImageSanitizer.process(raw)

    assert isinstance(arr, np.ndarray)
    assert arr.ndim == 3
    # height x width x channels
    assert arr.shape[2] == 3


def test_process_rejects_non_image_bytes():
    raw = b"this is not an image"

    with pytest.raises(HTTPException) as exc_info:
        ImageSanitizer.process(raw)

    assert exc_info.value.status_code == 400
