@echo off
echo Starting RAG Chatbot Service...
echo.

cd /d %~dp0

if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

call venv\Scripts\activate

echo Installing dependencies...
pip install -r requirements.txt -q

echo.
echo Starting server on port 3000...
echo.

uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
