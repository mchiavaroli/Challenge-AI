"""
Automatic cleanliness scoring for solar panel glass images.

Analyzes each image to estimate a cleanliness score (0-100) based on:
- Color saturation (clean glass has deeper blue, dirty has grey/white haze)
- Brightness of non-grid areas (dust appears as bright white spots)
- Texture clarity (clean panels show sharper cell grid patterns)

Usage:
    cd python
    python label_images.py
"""

import os
import csv
import numpy as np
from PIL import Image, ImageFilter

DATASET_DIR = os.path.join(os.path.dirname(__file__), "dataset")
IMAGES_DIR = os.path.join(DATASET_DIR, "train")
OUTPUT_FILE = os.path.join(DATASET_DIR, "labels.csv")


def compute_cleanliness_score(image_path: str) -> float:
    """
    Estimate cleanliness score (0-100) from image analysis.
    Higher = cleaner glass.
    """
    img = Image.open(image_path).convert("RGB")
    img_resized = img.resize((224, 224))

    arr = np.array(img_resized, dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # --- Metric 1: Color Saturation ---
    # Clean solar panel glass is deep blue; dirty glass loses saturation
    # Convert to HSV-like saturation
    max_c = np.maximum(np.maximum(r, g), b)
    min_c = np.minimum(np.minimum(r, g), b)
    chroma = max_c - min_c
    # Avoid division by zero
    saturation = np.where(max_c > 0, chroma / max_c, 0)
    mean_saturation = np.mean(saturation)  # 0 to 1

    # --- Metric 2: White/Bright pixel ratio (dust indicator) ---
    # Dust appears as bright whitish areas
    brightness = (r + g + b) / 3.0
    # Pixels brighter than 180 are likely dust/haze
    bright_ratio = np.mean(brightness > 180)  # 0 to 1 (more = dirtier)

    # --- Metric 3: Blue dominance ---
    # Clean panels have dominant blue channel
    total = r + g + b + 1e-6
    blue_ratio = np.mean(b / total)  # ~0.33 if grey, higher if blue

    # --- Metric 4: Texture sharpness (Laplacian variance) ---
    # Clean glass shows sharp grid lines; dirty glass is blurrier
    grey = img_resized.convert("L")
    edges = grey.filter(ImageFilter.FIND_EDGES)
    edge_arr = np.array(edges, dtype=np.float32)
    edge_strength = np.mean(edge_arr)  # Higher = sharper/cleaner

    # --- Metric 5: Low saturation pixel ratio (grey haze) ---
    grey_haze_ratio = np.mean(saturation < 0.15)  # More grey = dirtier

    # --- Combine metrics into score ---
    # Weights tuned based on visual inspection of the dataset
    score = 0.0

    # Saturation contributes positively (clean = high saturation)
    # Typical range: 0.15 (very dirty) to 0.45 (clean)
    sat_score = np.clip((mean_saturation - 0.10) / 0.40, 0, 1) * 100
    score += sat_score * 0.30

    # Bright pixel ratio contributes negatively (more dust = lower score)
    # Typical range: 0.0 (clean) to 0.4 (very dusty)
    bright_score = (1.0 - np.clip(bright_ratio / 0.35, 0, 1)) * 100
    score += bright_score * 0.20

    # Blue dominance (clean panel ~0.40, dirty ~0.34)
    blue_score = np.clip((blue_ratio - 0.33) / 0.10, 0, 1) * 100
    score += blue_score * 0.20

    # Edge strength (clean shows more edges)
    # Typical range: 10 (dirty/blurry) to 40 (clean/sharp)
    edge_score = np.clip((edge_strength - 8) / 35, 0, 1) * 100
    score += edge_score * 0.15

    # Grey haze ratio (less haze = cleaner)
    # Typical range: 0.05 (clean) to 0.6 (very dirty/hazy)
    haze_score = (1.0 - np.clip(grey_haze_ratio / 0.50, 0, 1)) * 100
    score += haze_score * 0.15

    return round(np.clip(score, 0, 100), 1)


def main():
    if not os.path.isdir(IMAGES_DIR):
        print(f"❌ Image directory not found: {IMAGES_DIR}")
        return

    files = sorted([
        f for f in os.listdir(IMAGES_DIR)
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp'))
    ])

    if not files:
        print("❌ No images found in", IMAGES_DIR)
        return

    print(f"Found {len(files)} images. Scoring...")

    results = []
    for i, filename in enumerate(files):
        filepath = os.path.join(IMAGES_DIR, filename)
        try:
            score = compute_cleanliness_score(filepath)
            results.append((filename, score))
        except Exception as e:
            print(f"  ⚠️  Error processing {filename}: {e}")
            continue

        if (i + 1) % 50 == 0:
            print(f"  Processed {i + 1}/{len(files)}...")

    # Write CSV
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["filename", "score"])
        for filename, score in results:
            writer.writerow([filename, score])

    # Stats
    scores = [s for _, s in results]
    print(f"\n✅ Wrote {len(results)} labels to {OUTPUT_FILE}")
    print(f"   Score range: {min(scores):.1f} - {max(scores):.1f}")
    print(f"   Mean: {np.mean(scores):.1f}, Median: {np.median(scores):.1f}")
    print(f"   Std dev: {np.std(scores):.1f}")

    # Distribution
    bins = [0, 20, 40, 60, 80, 100]
    labels = ["0-20 (very dirty)", "20-40 (dirty)", "40-60 (moderate)", "60-80 (clean)", "80-100 (very clean)"]
    for i in range(len(bins) - 1):
        count = sum(1 for s in scores if bins[i] <= s < bins[i + 1] + (1 if i == len(bins) - 2 else 0))
        print(f"   {labels[i]}: {count} images")


if __name__ == "__main__":
    main()
