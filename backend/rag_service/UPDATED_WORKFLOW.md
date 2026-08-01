## Updated RAG Workflow

### ✅ What Changed

1. **Embedding**: Now ONLY embeds `textExtract` from uploaded PDF files
   - If no `textExtract` found → Returns: `"No PDF found"`
   - No longer embeds description or outlineText

2. **Session Creation**: Explicit creation required (not automatic)
   - Users must create session FIRST
   - Then use that session_id for chats
   - Sessions are user-specific and cannot be accessed by other users

3. **Chat**: Now REQUIRES valid session_id
   - Without session_id → Error: "Session ID is required"
   - Cannot chat without creating session first

---

## Updated Workflow in Postman

### Step 1: Embed Unit (Teacher Action)
```
POST http://localhost:3000/api/rag/embed/{unit_id}
```
**Body:** Empty  
**Response:**
```json
{
  "success": true,
  "message": "Unit embedded successfully",
  "chunks_created": 25,
  "status": "completed"
}
```

❌ If no PDF: 
```json
{
  "success": false,
  "message": "No PDF found - textExtract not available in any file"
}
```

---

### Step 2: Create Session (Student Action - NEW STEP)
```
POST http://localhost:3000/api/rag/sessions/{unit_id}?user_id={user_id}
```

**Parameters:**
- `unit_id` (URL param) - MongoDB ObjectId of the unit
- `user_id` (query param) - MongoDB ObjectId of the student

**Example:**
```
http://localhost:3000/api/rag/sessions/65a1b2c3d4e5f6g7h8i9j0k3?user_id=65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session_id": "65a1b2c3d4e5f6g7h8i9j0k2",
    "unit_id": "65a1b2c3d4e5f6g7h8i9j0k3",
    "user_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "created_at": "2026-02-01T12:00:00"
  }
}
```

✅ **Save the `session_id`** for next steps!

---

### Step 3: Send Chat Message (Using Existing Session)
```
POST http://localhost:3000/api/rag/chat/{unit_id}
```

**Body:**
```json
{
  "message": "What is this unit about?",
  "user_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "session_id": "65a1b2c3d4e5f6g7h8i9j0k2"
}
```

**Required fields:**
- `message` - Student's question
- `user_id` - Student's ID (must match who created session)
- `session_id` - ⚠️ REQUIRED NOW (from Step 2)

**Response:**
```json
{
  "success": true,
  "message": "The unit covers...",
  "session_id": "65a1b2c3d4e5f6g7h8i9j0k2",
  "relevance_score": 0.85,
  "response_time_ms": 2341,
  "used_chunks": [0, 3, 5]
}
```

❌ If no session_id:
```json
{
  "detail": "Session ID is required. Create a session first using POST /sessions/{unit_id}"
}
```

---

### Step 4: Continue Chatting (Same Session)
```
POST http://localhost:3000/api/rag/chat/{unit_id}
```

**Body:**
```json
{
  "message": "Tell me more about the first topic",
  "user_id": "65a1b2c3d4e5f6g7h8i9j0k1",
  "session_id": "65a1b2c3d4e5f6g7h8i9j0k2"
}
```

✅ Uses SAME session_id - conversation history is preserved

---

### Step 5: Get Session History
```
GET http://localhost:3000/api/rag/sessions/{session_id}
```

**Example:**
```
http://localhost:3000/api/rag/sessions/65a1b2c3d4e5f6g7h8i9j0k2
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "unit_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "user_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "What is this unit about?",
      "message_count": 4,
      "last_message_at": "2026-02-01T12:05:00"
    },
    "messages": [
      {"role": "user", "content": "What is this unit about?"},
      {"role": "assistant", "content": "The unit covers..."},
      {"role": "user", "content": "Tell me more about the first topic"},
      {"role": "assistant", "content": "The first topic is..."}
    ]
  }
}
```

---

### Step 6: List All Sessions for a Student
```
GET http://localhost:3000/api/rag/sessions?user_id={user_id}
```

**Example:**
```
http://localhost:3000/api/rag/sessions?user_id=65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "unit_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "user_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "What is this unit about?",
      "message_count": 4
    },
    {
      "id": "65a1b2c3d4e5f6g7h8i9j0k4",
      "unit_id": "65a1b2c3d4e5f6g7h8i9j0k5",
      "user_id": "65a1b2c3d4e5f6g7h8i9j0k1",
      "title": "How do I solve problems?",
      "message_count": 3
    }
  ]
}
```

---

### Step 7: Delete a Session
```
DELETE http://localhost:3000/api/rag/sessions/{session_id}?user_id={user_id}
```

**Example:**
```
http://localhost:3000/api/rag/sessions/65a1b2c3d4e5f6g7h8i9j0k2?user_id=65a1b2c3d4e5f6g7h8i9j0k1
```

**Response:**
```json
{
  "success": true,
  "message": "Session deleted"
}
```

---

## Complete Flow Summary

| Step | Action | Endpoint | User Type | Session? |
|------|--------|----------|-----------|----------|
| 1 | Embed unit | `POST /embed/{unitId}` | Teacher | N/A |
| 2 | **Create session** | `POST /sessions/{unitId}` | Student | ✅ NEW |
| 3 | Send message | `POST /chat/{unitId}` | Student | ✅ REQUIRED |
| 4 | Continue chat | `POST /chat/{unitId}` | Student | ✅ SAME |
| 5 | View history | `GET /sessions/{sessionId}` | Student | N/A |
| 6 | List sessions | `GET /sessions?user_id=X` | Student | N/A |
| 7 | Delete session | `DELETE /sessions/{sessionId}` | Student | N/A |

---

## Key Differences

### ❌ OLD (Auto-create session)
```json
{
  "message": "What is this unit about?",
  "user_id": "xxx"
  // No session_id needed - auto-created
}
```

### ✅ NEW (Explicit session)
```
1. First: POST /sessions/{unitId}?user_id=xxx
   → Get session_id

2. Then: POST /chat/{unitId}
   {
     "message": "What is this unit about?",
     "user_id": "xxx",
     "session_id": "xxx"  // REQUIRED
   }
```

---

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `"Session ID is required"` | Missing session_id in chat | Create session first: `POST /sessions/{unitId}` |
| `"No PDF found"` | Embedding unit without textExtract | Upload unit with PDF containing extracted text |
| `"Unit is not embedded yet"` | Creating session before embedding | Call `POST /embed/{unitId}` first |
| `"Session not found or access denied"` | Wrong user_id or session_id | Verify you're using correct user_id that created the session |

