# RAG Chatbot Service

A FastAPI-based RAG (Retrieval-Augmented Generation) chatbot service for educational content.

## Setup

### 1. Create Virtual Environment

```bash
cd rag_service
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy the example env file and add your Google API key:

```bash
copy .env.example .env
```

Edit `.env` and set:
- `GOOGLE_API_KEY` - Get from https://aistudio.google.com/apikey
- `MONGODB_URI` - Your MongoDB connection string
- `DB_NAME` - Database name (should match your Node.js backend)

### 4. Run the Service

```bash
# Development mode with auto-reload
uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload

# Or using Python directly
python -m app.main
```

## API Endpoints

### Health Check
```
GET /api/rag/health
```

### Embed a Unit
```
POST /api/rag/embed/{unit_id}
Query params: force=true (optional, to re-embed)
```

### Check Embedding Status
```
GET /api/rag/embed/{unit_id}/status
```

### Chat with Unit
```
POST /api/rag/chat/{unit_id}
Body: {
  "message": "Your question here",
  "user_id": "user_id_here",
  "session_id": "optional_session_id"
}
```

### Get User Sessions
```
GET /api/rag/sessions?user_id=xxx&unit_id=xxx
```

### Get Session History
```
GET /api/rag/sessions/{session_id}
```

### Delete Session
```
DELETE /api/rag/sessions/{session_id}?user_id=xxx
```

### Get Unit Summary
```
GET /api/rag/units/{unit_id}/summary
```

### Get Suggested Questions
```
GET /api/rag/units/{unit_id}/suggestions
```

### Search Unit Content
```
POST /api/rag/units/{unit_id}/search
Body: {
  "query": "search query",
  "limit": 5
}
```

## Usage Flow

1. **Embed Unit**: When a teacher uploads content to a unit, call `/api/rag/embed/{unit_id}` to embed the content
2. **Chat**: Students can then chat with the unit using `/api/rag/chat/{unit_id}`
3. **Sessions**: Each student gets their own chat session that persists conversation history

## Integration with Node.js Backend

The RAG service connects to the same MongoDB database as the Node.js backend. It reads unit data directly from the `units` collection.

You can also call the Node.js backend to fetch unit data if needed (configure `NODE_BACKEND_URL` in `.env`).

## Database Collections

The service creates these collections:
- `document_chunks` - Embedded text chunks
- `document_summaries` - Unit summaries and metadata
- `chat_sessions` - User chat sessions
- `chat_messages` - Individual chat messages
