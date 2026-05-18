from fastapi import FastAPI

from app.schemas.input_schema import PredictionInput
from app.model.predictor import predict_difficulty

app = FastAPI()


@app.get("/")
def home():
    return {"message": "ML Service Running"}


@app.post("/predict")
def predict(data: PredictionInput):
    print(data)
    print("whataaa")
    difficulty = predict_difficulty(data)

    return {
        "nextDifficulty": difficulty
    }