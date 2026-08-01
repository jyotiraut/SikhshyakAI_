# Connection Analysis: Frontend, Backend, and Adaptive Learning

## 🏗️ Architecture Overview

The three components are **connected** with a hierarchical architecture:

```
Frontend (React/Vite)
    ↓
Backend (Node.js Express)
    ↓
Adaptive Learning (FastAPI)
```

---

## 📱 Component Details

### 1. **Frontend** (React/Vite)
- **Location**: `frontend/`
- **Port**: `5173` (development)
- **API Base URL**: `http://localhost:8000/api/v1/` (configured in `.env`)
- **Key Files**:
  - `.env` → `VITE_API_URL=http://localhost:8000/api/v1/`
  - `src/lib/axios.ts` → Axios configured with base URL from env
  - Adaptive pages: `src/pages/dashboard/student/adaptive/`
    - `adaptive-dashboard.tsx`
    - `adaptive-quiz.tsx`

**Frontend makes requests to**: `http://localhost:8000/api/v1/students/adaptive/*`

---

### 2. **Backend** (Node.js Express)
- **Location**: `backend/`
- **Port**: `8000` (Docker: `2610`)
- **Entry Point**: `src/index.js`
- **Main App**: `src/app.js`

**Key Routes** (in `src/app.js`):
```
/api/v1/admin/
/api/v1/assessments/
/api/v1/courses/
/api/v1/students/          ← Includes adaptive learning endpoints
/api/v1/quizzes/
/api/v1/rag/
/api/v1/auth/
...and 13 other routes
```

**Student Routes**: `src/routes/studentRoute.js` includes:
```
/adaptive/initialize
/adaptive/generate-quiz
/adaptive/quizzes
/adaptive/submit-quiz
```

**Backend communicates with Adaptive Learning via**:
- Environment Variables:
  - `FASTAPI_URL` (should be http://localhost:8000)
  - `RAG_URL` (optional, falls back to FASTAPI_URL)

---

### 3. **Adaptive Learning** (FastAPI)
- **Location**: `adaptive_learnings/`
- **Port**: `8000` (per `main.py`)
- **Entry Point**: `main.py`
- **Framework**: FastAPI with CORS enabled

**API Routes** (in `api/adaptive_routes.py`):
```
/api/adaptive/create-adaptive-learning      (POST)
/api/adaptive/generate-quiz                 (POST)
/api/adaptive/get-quiz                      (GET)
/api/adaptive/get-student-progress          (GET)
/api/adaptive/get-course-progress           (GET)
/api/adaptive/get-unit-progress             (GET)
/api/adaptive/submit-quiz                   (POST)
```

**Key Dependencies**:
- `services/adaptive_service.py` → Business logic
- `services/adaptive_predictor.py` → SAKT model predictions
- `models/adaptive_sakt.py` → Neural network model
- `config/database.py` → MongoDB connection
- `integration/assessment_adapter.py` → Assessment integration

---

## 🔗 Data Flow

### Example: Quiz Generation
```
1. Frontend (React)
   └─> POST /api/v1/students/adaptive/generate-quiz
       (Sent with userId from Auth token)

2. Backend (Express)
   └─> Receives request at studentRoute.js
   └─> Extracts student ID from middleware
   └─> Calls: POST http://localhost:8000/api/adaptive/generate-quiz
       (Sent to Adaptive Learning service)

3. Adaptive Learning (FastAPI)
   └─> Receives request
   └─> Calls AdaptivePredictor (SAKT model)
   └─> Calls AssessmentChain (Gemini API)
   └─> Returns: Quiz + Adaptive parameters

4. Backend (Express)
   └─> Receives response from Adaptive Learning
   └─> Saves to MongoDB
   └─> Returns to Frontend

5. Frontend (React)
   └─> Displays quiz to student
```

---

## ⚙️ Configuration Files

### Environment Variables

**Backend** (`backend/sampleenv`):
```
FASTAPI_URL=****              ← Should point to adaptive_learnings
RAG_SERVICE_URL=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017
PORT=8000
CORS_ORIGIN=*
CLIENT_URL=http://localhost:5173/
```

**Frontend** (`.env`):
```
VITE_API_URL=http://localhost:8000/api/v1/
```

**Adaptive Learning** (`main.py`):
```python
allow_origins=["*"],  # CORS enabled for all origins
# Runs on http://localhost:8000
```

---

## ⚠️ CRITICAL ISSUE: PORT CONFLICT

**🚨 PROBLEM**: Both Backend and Adaptive Learning are configured to run on **port 8000**

```
Backend Express:     localhost:8000
Adaptive Learning:   localhost:8000  ❌ CONFLICT!
```

### Solution Options:

#### Option A: Run on different ports
- **Backend**: Port `8000`
- **Adaptive Learning**: Port `8001` or `5000`
- Update `FASTAPI_URL` in backend `.env` accordingly

#### Option B: Use Docker Compose
- Run services in separate containers
- Each gets its own port on different networks
- Communicate via service names (e.g., `http://fastapi:8000`)

#### Option C: Run Adaptive Learning through Backend
- Integrate FastAPI as a mounted app in Express (not recommended)

---

## 🚀 How They Work Together

### 1. **Initialization Flow**
```
Frontend requests: POST /students/adaptive/initialize?courseId=X
    ↓
Backend calls: POST /api/adaptive/create-adaptive-learning
    ↓
Adaptive Learning: Creates student tracking in MongoDB
    ↓
Response sent back through Backend to Frontend
```

### 2. **Quiz Generation Flow**
```
Frontend requests: POST /students/adaptive/generate-quiz
    ↓
Backend calls: POST /api/adaptive/generate-quiz
    ↓
Adaptive Learning:
  - Loads SAKT model
  - Predicts difficulty level
  - Generates questions via Gemini API
    ↓
Response sent back through Backend to Frontend
```

### 3. **Progress Tracking**
```
Frontend requests: GET /students/adaptive/progress
    ↓
Backend calls: GET /api/adaptive/get-student-progress
    ↓
Adaptive Learning:
  - Queries MongoDB for student submissions
  - Calculates mastery scores
  - Returns progress data
    ↓
Response sent back to Frontend
```

---

## 📊 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React + TypeScript + Vite | User interface |
| **Backend** | Node.js + Express | API gateway + routing |
| **Adaptive Logic** | Python + FastAPI | ML model predictions |
| **Database** | MongoDB | Data persistence |
| **ML Model** | SAKT (PyTorch) | Knowledge state prediction |
| **AI Generation** | Google Gemini API | Quiz question generation |

---

## ✅ Connection Status

| Component | Status | Issue |
|-----------|--------|-------|
| Frontend ↔ Backend | ✅ Connected | Works via `/api/v1/` |
| Backend ↔ Adaptive | 🟡 Configured but needs fixing | **PORT CONFLICT** |
| Adaptive ↔ MongoDB | ✅ Connected | Via `MONGODB_URI` |
| Adaptive ↔ Gemini API | ✅ Connected | For question generation |

---

## 🔧 Next Steps to Fix

1. **Resolve Port Conflict**
   - Run Adaptive Learning on port `8001` or `5000`
   - Update `backend/env` with correct `FASTAPI_URL`

2. **Test Connections**
   - Start services in order:
     1. MongoDB
     2. Adaptive Learning (FastAPI)
     3. Backend (Express)
     4. Frontend (React)

3. **Verify Endpoints**
   - Frontend should reach Backend without errors
   - Backend should reach Adaptive Learning service
   - Monitor logs for connection failures

4. **Docker Compose Setup** (Recommended)
   - Create `docker-compose.yml`
   - Define services with proper port mapping
   - Use service names for internal communication

---

## 📝 Summary

✅ **YES, the three components ARE connected**:
- Frontend communicates with Backend
- Backend communicates with Adaptive Learning
- Adaptive Learning processes ML predictions and stores in MongoDB

❌ **BUT there's a PORT CONFLICT** that must be fixed before running all three services together.
