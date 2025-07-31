import os
import sys
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing import image  # type: ignore
from PIL import Image

# ✅ Suppress TensorFlow logs and warnings
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Hide TensorFlow warnings

# ✅ Load the trained model
try:
    model = tf.keras.models.load_model('final_model.keras')
except Exception as e:
    print(json.dumps({"status": "error", "message": f"Model loading failed: {str(e)}"}))
    sys.exit(1)

def is_valid_image(image_path):
    """Validate image format only (JPEG, PNG, JPG)."""
    try:
        with Image.open(image_path) as img:
            if img.format.upper() not in ['JPEG']:
                return False
            return True
    except Exception:
        return False

def is_histopathological_like(image_path):
    """Loosely check if the image is likely a histopathological sample."""
    try:
        img = Image.open(image_path).convert('RGB')
        img_array = np.array(img)

        # Check size and color stats
        height, width, _ = img_array.shape
        if height < 100 or width < 100:
            return False  # Too small to be a histopathology scan

        # Get average color and saturation
        avg_color = np.mean(img_array, axis=(0, 1))  # RGB
        red, green, blue = avg_color

        # Dominant red/purple/pink range (typical of H&E stained tissue)
        if red > 100 and (red > blue or red > green):
            return True
        return False
    except Exception:
        return False


def load_and_preprocess_image(image_path):
    """Load and preprocess image."""
    try:
        img = image.load_img(image_path, target_size=(224, 224))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = img_array / 255.0  # Normalize
        return img_array
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Image preprocessing failed: {str(e)}"}))
        sys.exit(1)

def predict(image_path):
    """Run prediction on image."""
    # ✅ Check format
    if not is_valid_image(image_path):
        print(json.dumps({"status": "error", "message": "Invalid image format. Please upload JPEG, PNG, or JPG."}))
        sys.exit(1)

    # ✅ Check if image looks like a histopathological lung sample
    if not is_histopathological_like(image_path):
        print(json.dumps({"status": "error", "message": "Invalid image: Please upload a valid lung histopathological image."}))
        sys.exit(1)

    img_array = load_and_preprocess_image(image_path)
    try:
        prediction = model.predict(img_array)
        confidence = round(float(prediction.flatten()[0]), 6)

        confidence_threshold = 0.5
        predicted_class = "No Cancer Detected" if confidence >= confidence_threshold else "Cancer Detected"

        print(json.dumps({
            "status": "success",
            "prediction": predicted_class,
            "confidence": f"{confidence * 100:.2f}%"
        }))
    except Exception as e:
        print(json.dumps({"status": "error", "message": f"Prediction failed: {str(e)}"}))
        sys.exit(1)

# ✅ Main execution
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Usage: python app.py <image_path>"}))
        sys.exit(1)

    image_path = sys.argv[1]

    if not os.path.isfile(image_path):
        print(json.dumps({"status": "error", "message": "Image file not found."}))
        sys.exit(1)

    predict(image_path)
