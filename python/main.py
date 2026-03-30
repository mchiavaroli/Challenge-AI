import random
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from model import load_model, predict

# Global model reference
ml_model = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global ml_model
    ml_model = load_model()
    if ml_model is None:
        print("⚠️  No trained model found at python/weights/cleanliness_model.pth")
        print("   The API will return random scores until a model is trained.")
        print("   Run 'python train.py' to train the model.")
    else:
        print("✅ Model loaded successfully.")
    yield


app = FastAPI(title="Cleanliness Predictor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    image_urls: list[str]


class PredictResponse(BaseModel):
    scores: list[float]
    average: float
    model_loaded: bool


@app.post("/predict", response_model=PredictResponse)
async def predict_cleanliness(request: PredictRequest):
    """
    Receive a list of image URLs, download each, run inference,
    and return individual scores + average.
    """
    if not request.image_urls:
        raise HTTPException(status_code=400, detail="No image URLs provided")

    scores: list[float] = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for url in request.image_urls:
            if ml_model is not None:
                # Real prediction
                try:
                    resp = await client.get(url)
                    resp.raise_for_status()
                    score = predict(ml_model, resp.content)
                except Exception as e:
                    print(f"Error processing {url}: {e}")
                    score = 0.0
            else:
                # Fallback: random score when no model is trained yet
                score = round(random.uniform(0, 100), 1)

            scores.append(score)

    average = round(sum(scores) / len(scores), 1) if scores else 0.0

    return PredictResponse(
        scores=scores,
        average=average,
        model_loaded=ml_model is not None,
    )


@app.get("/health")
async def health():
    return {"status": "ok", "model_loaded": ml_model is not None}
