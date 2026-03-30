import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from io import BytesIO

# Path to the fine-tuned model weights
MODEL_PATH = os.path.join(os.path.dirname(__file__), "weights", "cleanliness_model.pth")

# Image preprocessing pipeline (must match training preprocessing)
preprocess = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def build_model(num_classes: int = 1) -> nn.Module:
    """
    Build an EfficientNet-B0 model adapted for cleanliness regression.
    Output: single value 0-100.
    """
    model = models.efficientnet_b0(weights=None)
    # Replace the classifier head
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.2),
        nn.Linear(model.classifier[1].in_features, num_classes),
        nn.Sigmoid(),  # Output in [0, 1], we scale to [0, 100]
    )
    return model


def load_model() -> nn.Module | None:
    """
    Load the fine-tuned model from disk.
    Returns None if no trained weights are found.
    """
    if not os.path.exists(MODEL_PATH):
        return None

    model = build_model()
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu", weights_only=True))
    model.eval()
    return model


def predict(model: nn.Module, image_bytes: bytes) -> float:
    """
    Predict cleanliness score (0-100) from raw image bytes.
    """
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    tensor = preprocess(image).unsqueeze(0)  # Add batch dimension

    with torch.no_grad():
        output = model(tensor)

    # Model outputs [0, 1] via Sigmoid, scale to [0, 100]
    score = output.item() * 100.0
    return round(min(max(score, 0), 100), 1)
