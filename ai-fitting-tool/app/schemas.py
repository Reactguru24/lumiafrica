from pydantic import BaseModel, Field
from typing import Optional, Literal

class ImageValidationResult(BaseModel):
    valid: bool
    code: Literal[
        "OK",
        "INVALID_INPUT",
        "NO_BODY_DETECTED",
        "INSUFFICIENT_LANDMARKS",
        "MULTIPLE_PEOPLE",
        "LOW_RESOLUTION",
        "BLURRY",
        "INAPPROPRIATE_CONTENT",
        "NO_CLOTHING_DETECTED",
        "PROCESSING_ERROR",
    ]
    message: str = Field(..., description="User-facing explanation")
    details: Optional[dict] = Field(
        default=None,
        description="Machine-readable details: counts, thresholds, scores"
    )

class AnalyzeRequest(BaseModel):
    height: Optional[float] = Field(None, description="User height in cm")
    weight: Optional[float] = Field(None, description="User weight in kg")
    product_id: Optional[str] = Field(None, description="ID of product for size chart lookup")

class MeasurementResult(BaseModel):
    chest: float
    waist: float
    hips: float
    height: float

class SizeRecommendation(BaseModel):
    size: str
    confidence: float
    alternatives: list[str] = []

class FitAnalysis(BaseModel):
    chest_fit: str
    waist_fit: str
    length_fit: str

class AnalyzeResponse(BaseModel):
    validation: ImageValidationResult
    measurements: Optional[MeasurementResult] = None
    recommendation: Optional[SizeRecommendation] = None
    fit_analysis: Optional[FitAnalysis] = None