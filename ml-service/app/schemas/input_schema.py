from pydantic import BaseModel

class PredictionInput(BaseModel):
    isCorrect: bool
    timeTaken: int
    attempts: int
    pastAccuracy: float