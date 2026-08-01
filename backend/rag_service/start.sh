#!/bin/bash
echo "Starting RAG Chatbot Service..."
echo

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt -q

echo
echo "Starting server on port 3000..."
echo

uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
