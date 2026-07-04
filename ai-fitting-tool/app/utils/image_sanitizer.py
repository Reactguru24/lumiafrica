import io
import imghdr
from PIL import Image
from fastapi import HTTPException
import numpy as np

MAX_IMAGE_SIZE_MB = 5
MAX_PIXELS = 50_000_000  # 50 million pixels (~8K)
ALLOWED_FORMATS = {"jpeg", "png", "webp"}


class ImageSanitizer:
    """
    Provides hardened, production-grade sanitization for uploaded images.
    Protects against:
    - Polyglot payloads
    - EXIF script injection
    - Hidden HTML/JS appended after EOF
    - Malformed PNG/ICC chunks
    - Decompression bombs
    """

    @staticmethod
    def validate_size(raw_bytes: bytes):
        if len(raw_bytes) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"Image too large. Max size is {MAX_IMAGE_SIZE_MB} MB."
            )

    @staticmethod
    def validate_magic_number(raw_bytes: bytes):
        kind = imghdr.what(None, raw_bytes)
        if kind not in ALLOWED_FORMATS:
            raise HTTPException(
                status_code=400,
                detail="Unsupported or invalid image format."
            )

    @staticmethod
    def decode_image(raw_bytes: bytes) -> Image.Image:
        try:
            img = Image.open(io.BytesIO(raw_bytes))
            img.load()  # fully decode (prevents lazy bombs)
            return img
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="Invalid or corrupted image file."
            )

    @staticmethod
    def validate_pixel_count(img: Image.Image):
        w, h = img.size
        if w * h > MAX_PIXELS:
            raise HTTPException(
                status_code=413,
                detail="Image resolution is too large."
            )

    @staticmethod
    def sanitize(img: Image.Image) -> Image.Image:
        """
        Re-encode into PNG to remove:
        - EXIF metadata
        - Thumbnails
        - ICC profiles
        - Scripting payloads
        """

        sanitized = io.BytesIO()
        img.convert("RGB").save(sanitized, format="PNG")
        sanitized.seek(0)
        return Image.open(sanitized)

    @classmethod
    def process(cls, raw_bytes: bytes) -> np.ndarray:
        """
        Full hardened sanitization pipeline.
        Returns a clean NumPy image with only pixel data.
        """

        cls.validate_size(raw_bytes)
        cls.validate_magic_number(raw_bytes)

        img = cls.decode_image(raw_bytes)
        cls.validate_pixel_count(img)

        clean = cls.sanitize(img)
        array = np.array(clean)

        if array is None or array.size == 0:
            raise HTTPException(status_code=400, detail="Failed to sanitize image.")

        return array
