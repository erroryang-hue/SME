import joblib

import numpy as np


# LOAD MODEL

model = joblib.load(
    "trained_models/risk_model.pkl"
)

encoder = joblib.load(
    "trained_models/risk_encoder.pkl"
)


def predict_risk(
    data
):

    input_data = np.array(
        data
    ).reshape(1, -1)

    prediction = model.predict(
        input_data
    )

    risk_label = encoder.inverse_transform(
        prediction
    )

    return risk_label[0]

    