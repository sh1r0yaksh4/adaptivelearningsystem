def predict_difficulty(data):

    if data.isCorrect and data.timeTaken < 60:
        return "hard"

    elif data.isCorrect:
        return "medium"

    else:
        return "easy"