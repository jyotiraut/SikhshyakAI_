## RAG API - Complete Postman Testing Guide

> **IMPORTANT:** All RAG endpoints are now proxied through the Node.js backend.  
> Frontend only needs to call **Node.js (port 8000)** - not the FastAPI service directly.

**Base URL:** `http://localhost:8000/api/v1/rag`

**Authorization:** All routes (except health) require Bearer token in header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Health Check

```
GET http://localhost:8000/api/v1/rag/health
```

**Headers:** None required

**Body:** Empty

**Response:**
```json
{
  "status": "success",
  "data": {
    "status": "ok",
    "timestamp": "2026-02-01T12:00:00.123456",
    "services": {
      "embedding": true,
      "chat": true
    }
  }
}
```

---

## 2. Embed a Unit (Teacher Action - Usually Automatic)

> ⚡ **Note:** Embedding happens automatically when teacher uploads a PDF via unit routes.  
> This endpoint is for manual re-embedding if needed.

```
POST http://localhost:8000/api/v1/rag/embed/65a1b2c3d4e5f6g7h8i9j0k1
```

**URL Parameters:**
- `65a1b2c3d4e5f6g7h8i9j0k1` = Unit MongoDB ObjectId

**Query Parameters (Optional):**
- `force=true` - To re-embed even if already embedded

**Headers:**
```
Authorization: Bearer <teacher_token>
Content-Type: application/json
```

**Body:** Empty

**Access:** Teacher, Admin only

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "Unit embedded successfully",
    "chunks_created": 25,
    "status": "completed"
  }
}
```

**Error Response - No PDF Found (500):**
```json
{
  "status": "error",
  "message": "No PDF found - textExtract not available in any file"
}
```

---

## 3. Get Embedding Status

```
GET http://localhost:8000/api/v1/rag/embed/65a1b2c3d4e5f6g7h8i9j0k1/status
```

**Headers:**
```
Authorization: Bearer <token>
```

**Body:** Empty

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "status": "completed",
    "chunks_count": 25,
    "error": null
  }
}
```

---

## 4. Create Chat Session (Before Chatting)

```
POST http://localhost:8000/api/v1/rag/sessions/65a1b2c3d4e5f6g7h8i9j0k3
```

**URL Parameters:**
- `65a1b2c3d4e5f6g7h8i9j0k3` = Unit MongoDB ObjectId

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:** Empty

**Access:** Teacher, Student, Admin

**Success Response (201):**
```json
{
  "status": "success",
  "data": {
    "session_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "unit_id": "65a1b2c3d4e5f6g7h8i9j0k3",
    "user_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "created_at": "2026-02-01T12:00:00"
  }
}
```

---

## 5. Send Chat Message (Most Important)

```
POST http://localhost:8000/api/v1/rag/chat/65a1b2c3d4e5f6g7h8i9j0k3
```

**URL Parameters:**
- `65a1b2c3d4e5f6g7h8i9j0k3` = Unit MongoDB ObjectId

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (JSON):**
```json
{
  "message": "What is the main topic of this unit?",
  "session_id": "697ef8bebea5c17abcb10993"
}
```

**Field Descriptions:**
- `message` (string, required) - The user's question
- `session_id` (string, required) - Session ID from Step 4

> 📝 **Note:** `user_id` is automatically extracted from JWT token - no need to send it!

**Access:** Teacher, Student, Admin

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "success": true,
    "message": "The main topic of this unit covers the fundamentals of...",
    "session_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "relevance_score": 0.87,
    "response_time_ms": 2341,
    "used_chunks": [0, 3, 5, 8]
  }
}
```

---

## 6. Get User's All Chat Sessions

```
GET http://localhost:8000/api/v1/rag/sessions
```

**Query Parameters (Optional):**
- `unit_id=65a1b2c3d4e5f6g7h8i9j0k3` - Filter by specific unit

**Headers:**
```
Authorization: Bearer <token>
```

**Body:** Empty

> 📝 **Note:** Returns only sessions for the logged-in user (from JWT)

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "unit_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "user_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "What is the main topic of this unit?",
      "message_count": 4,
      "last_message_at": "2026-02-01T12:05:30",
      "created_at": "2026-02-01T12:00:00"
    }
  ]
}
```

---

## 7. Get Session Chat History

```
GET http://localhost:8000/api/v1/rag/sessions/65a1b2c3d4e5f6g7h8i9j0k2
```

**URL Parameters:**
- `65a1b2c3d4e5f6g7h8i9j0k2` = Session MongoDB ObjectId

**Headers:**
```
Authorization: Bearer <token>
```

**Body:** Empty

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "session": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "unit_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "user_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "What is the main topic of this unit?",
      "message_count": 4
    },
    "messages": [
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k6",
        "role": "user",
        "content": "What is the main topic of this unit?",
        "created_at": "2026-02-01T12:00:00"
      },
      {
        "id": "65a1b2c3d4e5f6g7h8i9j0k7",
        "role": "assistant",
        "content": "The main topic covers the fundamentals of...",
        "created_at": "2026-02-01T12:00:05",
        "relevance_score": 0.87
      }
    ]
  }
}
```

---

## 8. Delete a Chat Session

```
DELETE http://localhost:8000/api/v1/rag/sessions/65a1b2c3d4e5f6g7h8i9j0k2
```

**URL Parameters:**
- `65a1b2c3d4e5f6g7h8i9j0k2` = Session MongoDB ObjectId

**Headers:**
```
Authorization: Bearer <token>
```

**Body:** Empty

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Session deleted"
}
```

---

## 9. Get Suggested Questions for Unit

```
GET http://localhost:8000/api/v1/rag/units/65a1b2c3d4e5f6g7h8i9j0k3/suggestions
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": [
    "What is the main topic of this unit?",
    "Can you explain the key concepts in this unit?",
    "What are the learning objectives of this unit?",
    "Can you summarize the most important points?",
    "How does this topic relate to other concepts?"
  ]
}
```

---

## 10. Get Unit Summary

```
GET http://localhost:8000/api/v1/rag/units/65a1b2c3d4e5f6g7h8i9j0k3/summary
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "status": "success",
  "data": {
    "title": "Introduction to Mathematics",
    "main_topics": ["algebra", "geometry", "calculus"],
    "key_concepts": ["equations", "functions", "derivatives"],
    "brief_summary": "This unit covers Introduction to Mathematics...",
    "suggested_questions": ["What is the main topic?", "..."],
    "total_chunks": 25
  }
}
```

---

## 11. Search Unit Content

```
POST http://localhost:8000/api/v1/rag/units/65a1b2c3d4e5f6g7h8i9j0k3/search
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (JSON):**
```json
{
  "query": "explain algebraic equations",
  "limit": 5
}
```

**Response (200):**
```json
{
  "status": "success",
  "data": [
    {
      "chunk_index": 3,
      "text": "Algebraic equations are mathematical statements...",
      "similarity": 0.92,
      "keywords": ["algebraic", "equations", "variables"]
    }
  ]
}
```

---

## Quick Postman Setup

### 1. Create Variables

```
baseUrl         http://localhost:8000/api/v1
unitId          <your_unit_id>
sessionId       <from_create_session>
token           <your_jwt_token>
```

### 2. Use in Requests

**URL:** `{{baseUrl}}/rag/chat/{{unitId}}`

**Headers:**
```
Authorization: Bearer {{token}}
```

---

## Complete Testing Sequence

| Step | Action | Endpoint |
|------|--------|----------|
| 1 | Login to get JWT | `POST /api/v1/auth/login` |
| 2 | Upload unit with PDF | `POST /api/v1/units/with-pdf` (auto-embeds) |
| 3 | Check embedding status | `GET /api/v1/rag/embed/:unitId/status` |
| 4 | Create chat session | `POST /api/v1/rag/sessions/:unitId` |
| 5 | Send chat message | `POST /api/v1/rag/chat/:unitId` |
| 6 | Continue chatting | `POST /api/v1/rag/chat/:unitId` |
| 7 | Get chat history | `GET /api/v1/rag/sessions/:sessionId` |
| 8 | List all sessions | `GET /api/v1/rag/sessions` |
| 9 | Delete session | `DELETE /api/v1/rag/sessions/:sessionId` |

---

## Important Notes

✅ **Auto-Embedding:** When teacher uploads PDF via:
  - `POST /api/v1/units/with-pdf`
  - `POST /api/v1/units/resource`
  - `POST /api/v1/units/:unitId/pdf`
  
  Embedding happens automatically!

✅ **User ID from Token:** No need to send `user_id` - extracted from JWT

✅ **Roles:**
  - **Teacher/Admin:** Can embed, create sessions, chat
  - **Student:** Can create sessions, chat (no embed)
  - **All authenticated:** Can view sessions, history, search

⚠️ **Session Required:** Must create session before chatting

⚠️ **Unit Must Be Embedded:** Cannot chat until unit has textExtract and is embedded
