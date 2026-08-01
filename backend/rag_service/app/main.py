"""
RAG Service - FastAPI Main Application
Runs on port 3000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings, validate_settings
from app.db import connect_to_mongo, close_mongo_connection, ensure_indexes
from app.routes import router
from app.services import embedding_service, chat_service
from app.logger import setup_logging, log_header, log_info, log_success, log_divider, log_error

# Setup logging
setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    log_header("RAG CHATBOT SERVICE")
    
    # Validate settings
    if not validate_settings():
        log_error("Configuration validation failed")
    
    # Connect to MongoDB
    await connect_to_mongo()
    await ensure_indexes()

    # Initialize services
    embedding_initialized = embedding_service.initialize()
    chat_initialized = chat_service.initialize()
    
    log_divider()
    log_info("Service Status:")
    log_info(f"  Embedding: {'✓ Ready' if embedding_initialized else '✗ Not ready'}")
    log_info(f"  Chat: {'✓ Ready' if chat_initialized else '✗ Not ready'}")
    log_divider()
    
    log_success(f"RAG Service running on port {settings.rag_port}")
    log_info(f"API Base URL: http://localhost:{settings.rag_port}/api/rag")
    log_divider()
    log_info("Available Endpoints:")
    log_info("  POST /api/rag/embed/:unitId       - Embed a unit")
    log_info("  GET  /api/rag/embed/:unitId/status - Check embedding status")
    log_info("  POST /api/rag/chat/:unitId        - Chat with a unit")
    log_info("  GET  /api/rag/sessions            - Get user sessions")
    log_info("  GET  /api/rag/sessions/:id        - Get session history")
    log_info("  DELETE /api/rag/sessions/:id      - Delete a session")
    log_info("  GET  /api/rag/units/:id/summary   - Get unit summary")
    log_info("  GET  /api/rag/units/:id/suggestions - Get suggested questions")
    log_info("  POST /api/rag/units/:id/search    - Search unit content")
    log_info("  GET  /api/rag/health              - Health check")
    log_divider()
    
    yield
    
    # Cleanup
    await close_mongo_connection()
    log_info("RAG Service shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="RAG Chatbot Service",
    description="RAG-powered chatbot for educational content",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware. A wildcard origin combined with credentials is rejected by
# browsers, so fall back to the known front ends instead of "*".
if settings.cors_origins.strip() == "*":
    origins = ["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"]
else:
    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)

# Root endpoint
@app.get("/")
async def root():
    return {
        "name": "RAG Chatbot Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "GET /api/rag/health",
            "embed": "POST /api/rag/embed/:unitId",
            "embedStatus": "GET /api/rag/embed/:unitId/status",
            "chat": "POST /api/rag/chat/:unitId",
            "sessions": "GET /api/rag/sessions",
            "sessionHistory": "GET /api/rag/sessions/:sessionId",
            "deleteSession": "DELETE /api/rag/sessions/:sessionId",
            "suggestions": "GET /api/rag/units/:unitId/suggestions",
            "summary": "GET /api/rag/units/:unitId/summary",
            "search": "POST /api/rag/units/:unitId/search"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.rag_port,
        reload=True
    )
