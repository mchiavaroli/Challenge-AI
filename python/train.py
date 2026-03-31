"""
Training script for the cleanliness prediction model.

Dataset structure expected:
    python/dataset/
        train/
            image_001.jpg
            image_002.jpg
            ...
        labels.csv       # columns: filename, score (0-100)

Usage:
    cd python
    python train.py
"""

import os
import csv
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader, random_split
from torchvision import transforms
from PIL import Image

from model import build_model

# --- Configuration ---
DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataset")
IMAGES_DIR = os.path.join(DATASET_DIR, "train")
LABELS_FILE = os.path.join(DATASET_DIR, "labels.csv")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "weights")

BATCH_SIZE = 16
EPOCHS = 20
LEARNING_RATE = 1e-4
VALIDATION_SPLIT = 0.2


# --- Dataset ---
class CleanlinessDataset(Dataset):
    def __init__(self, images_dir: str, labels_file: str, transform=None):
        self.images_dir = images_dir
        self.transform = transform
        self.samples: list[tuple[str, float]] = []

        with open(labels_file, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                filepath = os.path.join(images_dir, row["filename"])
                if os.path.exists(filepath):
                    # Normalize score to [0, 1]
                    score = float(row["score"]) / 100.0
                    self.samples.append((filepath, score))

        print(f"Loaded {len(self.samples)} samples")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, score = self.samples[idx]
        image = Image.open(img_path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, torch.tensor([score], dtype=torch.float32)


# --- Training ---
def train():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if not os.path.exists(LABELS_FILE):
        print(f"❌ Labels file not found: {LABELS_FILE}")
        print()
        print("Create a dataset/ folder with:")
        print("  dataset/train/        → your images")
        print("  dataset/labels.csv    → CSV with columns: filename, score")
        print()
        print("Example labels.csv:")
        print("  filename,score")
        print("  image_001.jpg,85")
        print("  image_002.jpg,30")
        return

    # Data augmentation for training
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    # Load full dataset with train transform (we'll override for val)
    full_dataset = CleanlinessDataset(IMAGES_DIR, LABELS_FILE, transform=train_transform)

    if len(full_dataset) == 0:
        print("❌ No valid samples found. Check your dataset.")
        return

    # Split
    val_size = max(1, int(len(full_dataset) * VALIDATION_SPLIT))
    train_size = len(full_dataset) - val_size

    if train_size <= 0:
        print("❌ Not enough samples to create a train/val split. Add more data.")
        return

    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])
    val_dataset.dataset.transform = val_transform  # type: ignore

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False)

    # Model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    model = build_model(num_classes=1)

    # Load pretrained EfficientNet-B0 backbone weights
    pretrained = torch.hub.load("pytorch/vision", "efficientnet_b0", weights="IMAGENET1K_V1")
    model.features.load_state_dict(pretrained.features.state_dict())
    print("✅ Loaded pretrained ImageNet weights for backbone")

    model = model.to(device)

    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3, factor=0.5)

    best_val_loss = float("inf")

    for epoch in range(EPOCHS):
        # Train
        model.train()
        train_loss = 0.0
        for images, scores in train_loader:
            images, scores = images.to(device), scores.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, scores)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        train_loss /= len(train_loader)

        # Validate
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for images, scores in val_loader:
                images, scores = images.to(device), scores.to(device)
                outputs = model(images)
                loss = criterion(outputs, scores)
                val_loss += loss.item()

        val_loss /= len(val_loader)
        scheduler.step(val_loss)

        # MAE in original scale (0-100)
        mae = (val_loss ** 0.5) * 100

        print(f"Epoch [{epoch+1}/{EPOCHS}] "
              f"Train Loss: {train_loss:.4f} | "
              f"Val Loss: {val_loss:.4f} | "
              f"~MAE: {mae:.1f}")

        # Save best model
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            output_path = os.path.join(OUTPUT_DIR, "cleanliness_model.pth")
            torch.save(model.state_dict(), output_path)
            print(f"  → Saved best model (val_loss={val_loss:.4f})")

    print()
    print(f"✅ Training complete! Model saved to {OUTPUT_DIR}/cleanliness_model.pth")
    print("   Restart the FastAPI server to load the new model.")


if __name__ == "__main__":
    train()
