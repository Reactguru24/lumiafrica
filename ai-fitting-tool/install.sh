#!/bin/bash

# Installation script for AI Fitting Tool with Image Validation

echo "=================================================="
echo "AI Fitting Tool - Installing Dependencies"
echo "=================================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found"
    echo "Please run this script from the ai-fitting-tool directory"
    exit 1
fi

echo "📦 Installing Python dependencies..."
echo ""

# Install requirements
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "✅ Installation Complete!"
    echo "=================================================="
    echo ""
    echo "New features added:"
    echo "  ✅ Image validation (human body detection)"
    echo "  ✅ Content moderation (inappropriate content detection)"
    echo "  ✅ Quality checks (lighting, clarity, visibility)"
    echo ""
    echo "To start the server:"
    echo "  uvicorn app.main:app --reload --port 80"
    echo ""
    echo "To test validation:"
    echo "  python test_validation.py <path_to_image>"
    echo ""
    echo "For more information, see IMAGE_VALIDATION.md"
    echo "=================================================="
else
    echo ""
    echo "=================================================="
    echo "❌ Installation Failed"
    echo "=================================================="
    echo ""
    echo "Please check the error messages above and try again."
    echo ""
    echo "You can install dependencies manually:"
    echo "  pip install fastapi uvicorn python-multipart"
    echo "  pip install Pillow opencv-python mediapipe numpy"
    echo "  pip install nudenet tensorflow"
    exit 1
fi
