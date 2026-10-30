from functools import lru_cache
from pathlib import Path
import math

BASE_DIR = Path(__file__).resolve().parent
INPUT_FIELDS = ['Age', 'Sleep Start Time', 'Sleep End Time', 'Total Sleep Hours',
    'Exercise (mins/day)', 'Caffeine Intake (mg)', 'Screen Time Before Bed (mins)',
    'Work Hours (hrs/day)', 'Productivity Score', 'Mood Score', 'Stress Level', 'Sleep Quality']
LIMITS = [(1,120), (0,23.9999), (0,23.9999), (0,24), (0,1440),
          (0,None), (0,1440), (0,24), (1,10), (1,10), (1,10), (1,10)]
MODEL_FILES = ['random_forest_model.pkl', 'mlp_classifier.pkl',
               'standard_scaler.pkl', 'label_encoder.pkl']

def missing_models():
    return [n for n in MODEL_FILES if not (BASE_DIR / 'saved_models' / n).is_file()]

def validate_inputs(values):
    if not isinstance(values, list) or len(values) != 12:
        raise ValueError('Please provide all 12 input values.')
    result = []
    for field, raw, (low, high) in zip(INPUT_FIELDS, values, LIMITS):
        if isinstance(raw, bool) or raw is None or raw == '':
            raise ValueError(f'{field}: enter a number.')
        try:
            value = float(raw)
        except (ValueError, TypeError, OverflowError):
            raise ValueError(f'{field}: enter a valid number.') from None
        if not math.isfinite(value) or value < low or (high is not None and value > high):
            bound = f'{low} to {high}' if high is not None else f'{low} or higher'
            raise ValueError(f'{field}: enter a value within {bound}.')
        result.append(value)
    return result

@lru_cache(maxsize=1)
def load_objects():
    missing = missing_models()
    if missing:
        raise FileNotFoundError('Add these files to saved_models/: ' + ', '.join(missing))
    import joblib
    # Load trusted artifacts only: pickle/joblib can execute code.
    return tuple(joblib.load(BASE_DIR / 'saved_models' / n) for n in MODEL_FILES)

def predict_sleep_type(values):
    values = validate_inputs(values)
    import numpy as np
    rf, mlp, scaler, encoder = load_objects()
    raw = np.array(values, dtype=float).reshape(1, -1)
    if hasattr(scaler, 'feature_names_in_'):
        import pandas as pd
        if list(scaler.feature_names_in_) != INPUT_FIELDS:
            raise ValueError('Scaler feature names/order do not match the 12 configured inputs.')
        raw = pd.DataFrame(raw, columns=INPUT_FIELDS)
    scaled = scaler.transform(raw)
    return {'random_forest': str(encoder.inverse_transform([rf.predict(scaled)[0]])[0]),
            'mlp': str(encoder.inverse_transform([mlp.predict(scaled)[0]])[0])}

def collect_inputs():
    values = []
    for field, (low, high) in zip(INPUT_FIELDS, LIMITS):
        while True:
            try:
                value = float(input(f'{field}: '))
                if not math.isfinite(value) or value < low or (high is not None and value > high):
                    raise ValueError
                values.append(value)
                break
            except ValueError:
                print('Enter a finite number within range:', low, high)
    return values

if __name__ == '__main__':
    print('SomniPredict - Sleep Type Classifier')
    try:
        result = predict_sleep_type(collect_inputs())
        print('Random Forest:', result['random_forest'])
        print('MLP Classifier:', result['mlp'])
    except (FileNotFoundError, ValueError) as exc:
        print(exc)
