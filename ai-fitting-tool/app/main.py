# app/main.py (skeleton refactor)
import os
import io
import logging
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np

from app.models.body_detector import BodyDetector, BodyDetectorConfig
from app.models.size_matcher import SizeMatcher
from app.models.fit_analyzer import FitAnalyzer
from app.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ImageValidationResult,
    MeasurementResult,
    SizeRecommendation,
    FitAnalysis,
)
from app.utils.image_sanitizer import ImageSanitizer
from app.services.size_chart_client import fetch_size_chart

logger = logging.getLogger(__name__)

app = FastAPI(title="Virtual Fitting ML Service", version="1.1.0")

# CORS from env
allowed_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
allowed_origins = [o.strip() for o in allowed_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singleton model instances
detector = BodyDetector(BodyDetectorConfig())
size_matcher = SizeMatcher()
fit_analyzer = FitAnalyzer()

@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-fitting-tool"}

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(
    user_image: UploadFile = File(...),
    height: float = Form(None),
    weight: float = Form(None),
    product_id: str = Form(None),
):
    try:
        ct = user_image.content_type or ""
        if not ct or not ct.startswith("image/"):
            filename = (user_image.filename or "").lower()
            if not (filename.endswith(".jpg") or filename.endswith(".jpeg") or filename.endswith(".png")):
                raise HTTPException(status_code=400, detail="Unsupported file type.")


        # 1) Read and sanitize input
        raw_bytes = await user_image.read()
        image_np = ImageSanitizer.process(raw_bytes)

        # 2) Validate image (pose, nudity, multiperson, etc.)
        validation_dict = detector.validate_image(image_np, user_height_cm=height)
        validation = ImageValidationResult(**validation_dict)

        if not validation.valid:
            return AnalyzeResponse(validation=validation)

        # 3) Unified scale from validate_image()
        scale = validation.details.get("height_scale", {}).get("scale_cm_per_pixel")

        # 4) Extract measurements (with unified scale)
        measurements_dict = detector.detect_measurements(
            image_np,
            height=height,
            weight=weight,
            precomputed_scale_cm_per_pixel=scale,
        )

        if not measurements_dict:
            raise HTTPException(
                status_code=422,
                detail="Failed to extract body measurements."
            )

        measurements = MeasurementResult(**measurements_dict)

        # 5) Fetch size chart from backend by product_id
        size_chart = fetch_size_chart(product_id) if product_id else {}

        if size_chart:
            # 6) size recommendation
            size_rec_dict = size_matcher.recommend_size(
                measurements=measurements_dict,
                size_chart=size_chart,
            )
            recommendation = SizeRecommendation(**size_rec_dict)

            # 7) fit analysis
            fit_result = fit_analyzer.analyze_fit(
                measurements=measurements_dict,
                size_chart=size_chart,
                size=recommendation.size,
            )
            fit_analysis = FitAnalysis(**fit_result["analysis"])
        else:
            recommendation = None
            fit_analysis = None

        # 8) Return final structured response
        return AnalyzeResponse(
            validation=validation,
            measurements=measurements,
            recommendation=recommendation,
            fit_analysis=fit_analysis,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unexpected error in /api/analyze: %s", exc)
        raise HTTPException(status_code=500, detail="Internal server error")
