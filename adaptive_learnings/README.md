# Adaptive Learning System

A Python FastAPI-based adaptive learning platform that generates quizzes, tracks student progress, and updates mastery using SAKT-based predictions.

---

## 🚀 Installation

1. **Clone the Repository**
```bash
git clone <repository-url>
cd Adaptive

# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```
pip install -r requirements.txt

2. Run
   ``` bash
    uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
