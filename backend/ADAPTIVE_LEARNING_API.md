# Adaptive Learning API Integration

## Overview
The Node.js backend now integrates with the FastAPI adaptive learning service running on port 4000. All adaptive learning features are exposed through the student routes with automatic user ID extraction from the authenticated middleware.

## Configuration

### Environment Setup
Add the following to your `.env` file:
```env
ADAPTIVE_LEARNING_URL=http://localhost:4000
```

The FastAPI service is expected to be running at `http://localhost:4000`.

## API Endpoints

All endpoints require authentication (JWT token in Authorization header).  
Base URL: `http://localhost:8000/api/v1/students/adaptive`

### 1. Initialize Adaptive Learning
**POST** `/adaptive/initialize`

Initialize adaptive learning for a student in a course.

**Request Body:**
```json
{
  "courseId": "course_mongodb_id"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Adaptive learning initialized successfully",
    "adaptive_learning": {
      "_id": "...",
      "student": "...",
      "course": "...",
      "currentUnit": "...",
      "masteryScore": 0,
      "difficultyLevel": "low",
      "createdAt": "..."
    }
  }
}
```

---

### 2. Generate Adaptive Quiz
**POST** `/adaptive/generate-quiz`

Generate a single adaptive quiz question based on the student's learning progress.

**Request Body:**
```json
{
  "courseId": "course_mongodb_id"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Quiz generated successfully",
    "quiz_id": "quiz_id",
    "adaptive_output": {
      "recommended_unit_id": "...",
      "recommended_learning_objective": "...",
      "difficulty_distribution": {
        "low": 70,
        "mid": 20,
        "high": 10
      },
      "next_topic": "..."
    },
    "quiz": {
      "questions": [
        {
          "text": "Question text...",
          "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
          "correctAnswer": 0,
          "difficulty": "low",
          "learningObjectiveIndex": 0
        }
      ]
    }
  }
}
```

---

### 3. Get Adaptive Quizzes
**GET** `/adaptive/quizzes`

Retrieve all adaptive quizzes for the student (optionally filtered by course).

**Query Parameters:**
- `courseId` (optional): Filter by specific course

**Response:**
```json
{
  "status": "success",
  "data": {
    "total_quizzes": 5,
    "quizzes": [
      {
        "_id": "quiz_id",
        "student_id": "student_id",
        "course_id": "course_id",
        "quiz": { ... },
        "adaptive_output": { ... },
        "created_at": "2024-01-15T10:30:00"
      }
    ]
  }
}
```

---

### 4. Submit Adaptive Quiz
**POST** `/adaptive/submit-quiz`

Submit quiz answers and update adaptive learning statistics.

**Request Body:**
```json
{
  "quizId": "quiz_id",
  "courseId": "course_id",
  "answers": [
    {
      "questionIndex": 0,
      "selectedOption": 2
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "message": "Quiz submitted and adaptive stats updated successfully",
    "updates": [
      {
        "unit": "unit_id",
        "learningObjectiveIndex": 0,
        "attempted": 1,
        "correct": 1,
        "difficulty": "low"
      }
    ],
    "submission": {
      "_id": "submission_id",
      "quiz_id": "quiz_id",
      "student_id": "student_id",
      "course_id": "course_id",
      "answers": [...],
      "submitted_at": "2024-01-15T10:35:00"
    }
  }
}
```

---

### 5. Get Adaptive Progress
**GET** `/adaptive/progress`

Retrieve comprehensive adaptive learning progress for the student.

**Query Parameters:**
- `courseId` (optional): Get progress for specific course only

**Response (Course-specific):**
```json
{
  "status": "success",
  "data": {
    "student_id": "student_id",
    "course_id": "course_id",
    "current_unit": "unit_id",
    "mastery_score": 75,
    "pace_score": 80,
    "difficulty_level": "mid",
    "unit_progress": [
      {
        "unit_id": "unit_id",
        "unit_name": "Unit 1",
        "learning_objectives": [
          {
            "index": 0,
            "name": "LO 1",
            "mastery_status": "proficient",
            "accuracy": 85
          }
        ]
      }
    ]
  }
}
```

---

### 6. Get Adaptive Progress Summary
**GET** `/adaptive/progress-summary`

Retrieve a summary of adaptive learning progress.

**Query Parameters:**
- `limit` (optional, default=50): Number of records to return

**Response:**
```json
{
  "status": "success",
  "data": {
    "student_id": "student_id",
    "total_courses": 3,
    "total_quizzes_attempted": 15,
    "course_summaries": [
      {
        "course_id": "course_id",
        "course_name": "Course Name",
        "mastery_score": 78,
        "quiz_count": 5,
        "last_activity": "2024-01-15T10:35:00"
      }
    ]
  }
}
```

---

## Error Handling

All endpoints may return error responses:

```json
{
  "status": "error",
  "message": "Error description"
}
```

**Common Error Codes:**
- `400 Bad Request` - Missing or invalid required fields
- `403 Forbidden` - Course not published
- `404 Not Found` - Course/Quiz/Student not found
- `500 Internal Server Error` - Server-side error

---

## User ID Extraction

All endpoints automatically extract the student ID from the authenticated JWT token in the middleware (`req.user.id`). No need to pass student ID in request body.

## Example Usage

### Initialize and Generate Quiz Flow

```bash
# 1. Initialize adaptive learning
curl -X POST http://localhost:8000/api/v1/students/adaptive/initialize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "67a1234567890abcdef12345"}'

# 2. Generate adaptive quiz
curl -X POST http://localhost:8000/api/v1/students/adaptive/generate-quiz \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"courseId": "67a1234567890abcdef12345"}'

# 3. Submit quiz response
curl -X POST http://localhost:8000/api/v1/students/adaptive/submit-quiz \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "quizId": "quiz_response_id",
    "courseId": "67a1234567890abcdef12345",
    "answers": [{"questionIndex": 0, "selectedOption": 2}]
  }'

# 4. Check progress
curl -X GET "http://localhost:8000/api/v1/students/adaptive/progress?courseId=67a1234567890abcdef12345" \
  -H "Authorization: Bearer <token>"
```

---

## Service Files

### Files Modified/Created:

1. **`.env`** - Added `ADAPTIVE_LEARNING_URL` configuration
2. **`src/utils/adaptiveService.js`** - New service layer for FastAPI communication
3. **`src/controllers/studentController.js`** - Added 6 new adaptive learning controllers
4. **`src/routes/studentRoute.js`** - Added 6 new adaptive learning routes

### Service Layer Functions

The `adaptiveService.js` module exports:
- `createAdaptiveLearning(studentId, courseId)`
- `generateAdaptiveQuiz(studentId, courseId)`
- `viewAdaptiveQuizzes(studentId, courseId)`
- `submitAdaptiveQuiz(quizId, studentId, courseId, answers)`
- `getStudentProgress(studentId, courseId)`
- `getStudentCourseProgress(studentId, courseId)`
- `getProgressSummary(studentId, courseId, limit)`
- `checkAdaptiveServiceHealth()`

All functions handle error management and automatically throw errors that are caught by the controllers.

---

## Important Notes

1. **Course Must Be Published** - All adaptive learning features require the course to be in "published" status
2. **FastAPI Service** - Ensure the FastAPI service is running on port 4000 before calling these endpoints
3. **Authentication** - All endpoints require valid JWT authentication
4. **No Breaking Changes** - Existing student APIs remain unchanged and functional
5. **Database** - The adaptive learning data is stored in the FastAPI MongoDB, not the Node MongoDB

---

## Troubleshooting

### Service Connection Error
- Check if FastAPI is running: `http://localhost:4000/health`
- Verify `.env` has correct `ADAPTIVE_LEARNING_URL`

### Quiz Generation Fails
- Ensure course is published
- Verify MongoDB connection in FastAPI
- Check if course has units and learning objectives

### Progress Not Updating
- Verify quiz submission was successful
- Check FastAPI logs for update errors
- Ensure answers match expected format
