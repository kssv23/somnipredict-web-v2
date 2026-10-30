from flask import Flask, jsonify, render_template, request
from sleep_cli_classifier import missing_models, predict_sleep_type, validate_inputs

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024

@app.get('/')
def index():
    return render_template('index.html')

@app.get('/health')
def health():
    return jsonify(status='ok')

@app.get('/api/status')
def status():
    missing = missing_models()
    return jsonify(ready=not missing, missing=missing)

@app.post('/api/predict')
def predict():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify(error='Send a JSON object containing values.'), 400
    try:
        values = validate_inputs(body.get('values'))
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    try:
        return jsonify(predictions=predict_sleep_type(values))
    except FileNotFoundError as exc:
        return jsonify(error=str(exc)), 503
    except Exception:
        app.logger.exception('Model prediction failed')
        return jsonify(error='Prediction failed. Check the server log and confirm model versions and training features match.'), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
