# SomniPredict - one repository, one Render service, one URL

Frontend and Python backend are served together. Netlify is not needed for this version.

## 1. Add your existing model files

Download these four files from your existing backend GitHub repository. Put them in this package's saved_models folder:

- random_forest_model.pkl
- mlp_classifier.pkl
- standard_scaler.pkl
- label_encoder.pkl

Do not rename them. Do not upload a ZIP in place of the model files.
The package does not contain trained model files. The page opens without them, but predictions require them.

## 2. Upload to a NEW GitHub repository

1. Extract somnipredict-all-in-one.zip.
2. Create a GitHub repository, for example somnipredict-web-v2.
3. Open it and choose Add file > Upload files (or uploading an existing file).
4. Open the extracted somnipredict-all-in-one folder. Upload its CONTENTS, including the templates, static, and saved_models folders. Drag the folders to preserve their structure.
5. Click Commit changes.

IMPORTANT: app.py and requirements.txt must be visible directly on the repository's main page. Do not upload only the ZIP. Do not put another somnipredict-all-in-one folder around all the files inside GitHub.

Expected repository:

    app.py
    sleep_cli_classifier.py
    requirements.txt
    render.yaml
    .python-version
    .gitignore
    README.md
    templates/
        index.html
    static/
        style.css
        script.js
    saved_models/
        random_forest_model.pkl
        mlp_classifier.pkl
        standard_scaler.pkl
        label_encoder.pkl
        README.txt

## 3. Deploy on Render

1. Open Render and choose New > Web Service.
2. Connect the NEW GitHub repository.
3. Use these settings:

| Setting | Value |
| --- | --- |
| Name | somnipredict-web-v2 (or any available name) |
| Language / Runtime | Python 3 |
| Branch | main (or the branch containing your files) |
| Root Directory | Leave blank |
| Build Command | pip install -r requirements.txt |
| Start Command | gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 120 |
| Instance type | Free, if offered for your account |
| Health Check Path | /health |

4. Click Deploy Web Service.
5. When deployment is live, open the new onrender.com URL displayed by Render.
6. Click Try sample, then Explore my sleep to verify both model predictions.

The included render.yaml also supports deployment through Render Blueprints; the manual Web Service steps above do not require using it.

## Model compatibility

Python 3.11 is a starting deployment target, not a verified training version. The ML dependency ranges are general installation defaults. Copy the exact working ML versions from your OLD backend requirements.txt into this package's requirements.txt when available, retaining Flask and gunicorn. Also match the Python version to your training environment if needed. Saved scikit-learn models are sensitive to version changes.

If the UI works but a prediction fails, check Render Logs for the model-loading error. Do not retrain or replace your model files merely to hide an incompatibility.

## Later changes

Edit the files in this new GitHub repository and commit to its linked branch. Render redeploys automatically when enabled. Otherwise choose Manual Deploy > Deploy latest commit. The URL stays the same for that service.

## Local run (optional)

    python -m venv .venv
    .\.venv\Scripts\python.exe -m pip install -r requirements.txt
    .\.venv\Scripts\python.exe app.py

Then open http://127.0.0.1:5000. Keep that terminal open. Gunicorn is used by Render on Linux; use python app.py on Windows.

## Verification and limits

The app keeps the original 12-feature ordering, scaling of both models, and label decoding. Time controls convert HH:MM to decimal hours. Neither model accuracy nor measured sleep stages can be inferred from these inputs alone.

The application does not save profiles. Only load trusted model artifacts. The file status indicator checks file presence, not compatibility; the health route checks the web server, not the models. Real predictions require testing with your supplied artifacts.

Local page/assets, status/health endpoints, validation and test-double inference were checked. JavaScript syntax passed. No cloud deployment or real-model test has been performed. Browser visual QA remains unverified after a preview timeout. Optional Google Fonts falls back to installed fonts offline.

Reference: https://render.com/docs/deploy-flask
