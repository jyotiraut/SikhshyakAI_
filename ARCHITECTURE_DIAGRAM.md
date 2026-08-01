# Architecture Diagram

## Current Connection Architecture

```mermaid
graph TD
    User["👤 User Browser<br/>localhost:5173"]
    
    Frontend["🖥️ FRONTEND<br/>React + Vite<br/>Port: 5173"]
    
    Backend["⚙️ BACKEND<br/>Node.js Express<br/>Port: 8000"]
    
    Adaptive["🧠 ADAPTIVE LEARNING<br/>FastAPI<br/>Port: 8000 ⚠️"]
    
    MongoDB["🗄️ MongoDB<br/>localhost:27017"]
    
    Gemini["🤖 Gemini API<br/>Cloud Service"]
    
    SAKT["🔬 SAKT Model<br/>PyTorch Neural Network"]
    
    User -->|1. Navigates to| Frontend
    Frontend -->|2. HTTP/Axios GET/POST| Backend
    Backend -->|3. Fetch JSON| Adaptive
    Adaptive -->|4. Query/Insert| MongoDB
    Adaptive -->|5. Generate Questions| Gemini
    Adaptive -->|6. Load Model| SAKT
    
    SAKT -->|Predict Difficulty| Adaptive
    Gemini -->|Quiz Content| Adaptive
    MongoDB -->|Student Data| Adaptive
    
    Adaptive -->|7. Return JSON| Backend
    Backend -->|8. Return JSON| Frontend
    Frontend -->|9. Display| User
    
    style Frontend fill:#61dafb,stroke:#333,color:#000
    style Backend fill:#68a063,stroke:#333,color:#fff
    style Adaptive fill:#009688,stroke:#333,color:#fff
    style MongoDB fill:#13aa52,stroke:#333,color:#fff
    style Gemini fill:#ea4335,stroke:#333,color:#fff
    style SAKT fill:#ff6f00,stroke:#333,color:#fff
    style User fill:#e1bee7,stroke:#333,color:#000
```

## Endpoint Flow Diagram

```mermaid
graph LR
    A["📱 Frontend<br/>React App<br/>localhost:5173"]
    B["🔌 API Base<br/>localhost:8000/api/v1/"]
    C["📍 Students Route<br/>/students/adaptive/"]
    D["🧠 Adaptive Service<br/>localhost:8000/api/adaptive/"]
    
    A -->|"POST /adaptive/generate-quiz"| B
    B --> C
    C -->|"Forward to"| D
    D -->|"Process with SAKT"| D
    D -->|"Response JSON"| C
    C --> B
    B -->|"Return to Frontend"| A
    
    style A fill:#61dafb,stroke:#333,color:#000
    style B fill:#90ee90,stroke:#333,color:#000
    style C fill:#68a063,stroke:#333,color:#fff
    style D fill:#009688,stroke:#333,color:#fff
```

## Component Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                             │
│                    localhost:5173                               │
│                                                                  │
│  axios.create({                                                 │
│    baseURL: http://localhost:8000/api/v1/                      │
│  })                                                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ HTTP Request
                 │ POST /students/adaptive/generate-quiz
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                Backend (Express)                                │
│               localhost:8000                                    │
│                                                                  │
│  router.post('/students/adaptive/generate-quiz', (req, res) => {│
│    const fastapUrl = process.env.FASTAPI_URL;                  │
│    fetch(`${fasapiUrl}/api/adaptive/generate-quiz`)            │
│  })                                                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ HTTP Request (Internal)
                 │ POST /api/adaptive/generate-quiz
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│            Adaptive Learning (FastAPI)                           │
│            localhost:8000 ⚠️ CONFLICT!                           │
│                                                                  │
│  @router.post('/generate-quiz')                                │
│  async def generate_quiz(req: QuizRequest):                    │
│    - Load SAKT model                                            │
│    - Predict difficulty                                         │
│    - Call Gemini API for questions                             │
│    - Save to MongoDB                                            │
│    - Return response                                            │
└─────────────────────────────────────────────────────────────────┘
                 │
                 └─> MongoDB (Query/Insert)
                 └─> Gemini API (Generate content)
                 └─> SAKT Model (Predict mastery)
```

## Port Configuration Issues

```
CURRENT STATE (🚨 CONFLICT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend:           5173
Backend:            8000  ◄── Both trying to use 8000!
Adaptive Learning:  8000  ◄── PORT CONFLICT!


RECOMMENDED FIX:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Frontend:           5173
Backend:            8000
Adaptive Learning:  8001  or  5000

OR use Docker Compose:
Backend Container:     8000 (internally)
Adaptive Container:    8000 (internally, different container)
Traffic routed via container networking
```

## Data Flow Example: Student Quiz Submission

```mermaid
sequenceDiagram
    participant User as 👤 Student
    participant Fe as 🖥️ Frontend
    participant Be as ⚙️ Backend
    participant AL as 🧠 Adaptive
    participant DB as 🗄️ MongoDB
    participant ML as 🔬 SAKT Model

    User->>Fe: Submit quiz answers
    Fe->>Be: POST /students/adaptive/submit-quiz
    Be->>AL: POST /api/adaptive/submit-quiz
    AL->>DB: Query submission
    AL->>ML: Calculate mastery delta
    ML->>AL: Return confidence score
    AL->>DB: Update student progress
    AL->>DB: Save submission record
    AL->>Be: Return updated progress
    Be->>Fe: Return JSON response
    Fe->>User: Display results & next recommendation
```
