"""
RAG API Routes
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime

from app.models import (
    ChatRequest, ChatResponse, 
    EmbedRequest, EmbedResponse,
    SearchRequest, SearchResult,
    StatusResponse, SummaryResponse,
    SessionResponse, HistoryResponse, MessageResponse,
    HealthResponse
)
from app.services import embedding_service, vector_search_service, chat_service
from app.db import get_database
from app.logger import log_api, log_error

router = APIRouter(prefix="/api/rag", tags=["RAG"])

# ============ Health Check ============

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    log_api("GET", "/api/rag/health")
    
    return HealthResponse(
        status="ok",
        timestamp=datetime.utcnow().isoformat(),
        services={
            "embedding": embedding_service.initialized,
            "chat": chat_service.initialized
        }
    )

# ============ Embedding Routes ============

@router.post("/embed/{unit_id}", response_model=EmbedResponse)
async def embed_unit(unit_id: str, force: bool = False):
    """Embed a unit's documents"""
    log_api("POST", f"/api/rag/embed/{unit_id}")
    
    try:
        result = await embedding_service.embed_unit(unit_id, force=force)
        return EmbedResponse(**result)
    except Exception as e:
        log_error("Embed failed", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/embed/{unit_id}/status", response_model=StatusResponse)
async def get_embedding_status(unit_id: str):
    """Get embedding status for a unit"""
    log_api("GET", f"/api/rag/embed/{unit_id}/status")
    
    try:
        status = await embedding_service.get_embedding_status(unit_id)
        return StatusResponse(**status)
    except Exception as e:
        log_error("Get status failed", e)
        raise HTTPException(status_code=500, detail=str(e))

# ============ Session Management Routes ============

@router.post("/sessions/{unit_id}")
async def create_session(unit_id: str, user_id: str = Query(..., description="User ID")):
    """Create a new chat session for a user and unit"""
    log_api("POST", f"/api/rag/sessions/{unit_id}")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID is required")
    
    try:
        # Check if unit is embedded
        is_embedded = await embedding_service.is_unit_embedded(unit_id)
        if not is_embedded:
            raise HTTPException(
                status_code=400, 
                detail="Unit is not embedded yet. Please embed the unit first."
            )
        
        # Create new session
        session = await chat_service.create_new_session(user_id, unit_id)
        
        return {
            "success": True,
            "message": "Session created successfully",
            "data": {
                "session_id": session["_id"],
                "unit_id": session["unit_id"],
                "user_id": session["user_id"],
                "created_at": session["created_at"].isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        log_error("Create session failed", e)
        raise HTTPException(status_code=500, detail=str(e))

# ============ Chat Routes ============

@router.post("/chat/{unit_id}", response_model=ChatResponse)
async def chat(unit_id: str, request: ChatRequest):
    """Chat with a unit's content - REQUIRES existing session"""
    log_api("POST", f"/api/rag/chat/{unit_id}")
    
    if not request.message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    if not request.user_id:
        raise HTTPException(status_code=401, detail="User ID is required")
    
    if not request.session_id:
        raise HTTPException(status_code=400, detail="Session ID is required. Create a session first using POST /sessions/{unit_id}")
    
    try:
        # Check if unit is embedded
        is_embedded = await embedding_service.is_unit_embedded(unit_id)
        if not is_embedded:
            raise HTTPException(
                status_code=400, 
                detail="Unit is not embedded yet. Please embed the unit first."
            )
        
        # Verify session exists and belongs to user
        session = await chat_service.verify_session(request.session_id, request.user_id, unit_id)
        
        # Process chat
        result = await chat_service.chat(request.session_id, unit_id, request.message)
        
        return ChatResponse(
            success=True,
            message=result["message"],
            session_id=result["session_id"],
            relevance_score=result.get("relevance_score", 0),
            response_time_ms=result.get("response_time_ms", 0),
            used_chunks=result.get("used_chunks", []),
            grounded=result.get("grounded", False),
            sources=result.get("sources", [])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        log_error("Chat failed", e)
        raise HTTPException(status_code=500, detail=str(e))

# ============ Session Routes ============

@router.get("/sessions")
async def get_sessions(
    user_id: str = Query(..., description="User ID"),
    unit_id: Optional[str] = Query(None, description="Filter by unit ID")
):
    """Get all chat sessions for a user"""
    log_api("GET", "/api/rag/sessions")
    
    try:
        sessions = await chat_service.get_user_sessions(user_id, unit_id)
        return {"success": True, "data": sessions}
    except Exception as e:
        log_error("Get sessions failed", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}")
async def get_session_history(session_id: str):
    """Get chat history for a session"""
    log_api("GET", f"/api/rag/sessions/{session_id}")
    
    try:
        history = await chat_service.get_session_history(session_id)
        return {"success": True, "data": history}
    except Exception as e:
        log_error("Get history failed", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str, user_id: str = Query(...)):
    """Delete a chat session"""
    log_api("DELETE", f"/api/rag/sessions/{session_id}")
    
    try:
        await chat_service.delete_session(session_id, user_id)
        return {"success": True, "message": "Session deleted"}
    except Exception as e:
        log_error("Delete session failed", e)
        raise HTTPException(status_code=500, detail=str(e))

# ============ Unit Info Routes ============

@router.get("/units/{unit_id}/suggestions")
async def get_suggested_questions(unit_id: str):
    """Get suggested questions for a unit"""
    log_api("GET", f"/api/rag/units/{unit_id}/suggestions")
    
    try:
        questions = await chat_service.get_suggested_questions(unit_id)
        return {"success": True, "data": questions}
    except Exception as e:
        log_error("Get suggestions failed", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/units/{unit_id}/summary", response_model=SummaryResponse)
async def get_unit_summary(unit_id: str):
    """Get summary for a unit"""
    log_api("GET", f"/api/rag/units/{unit_id}/summary")
    
    try:
        db = get_database()
        summary = await db.document_summaries.find_one({"unit_id": unit_id})
        
        if not summary:
            raise HTTPException(
                status_code=404, 
                detail="Unit summary not found. Please embed the unit first."
            )
        
        return SummaryResponse(
            title=summary.get("title", ""),
            main_topics=summary.get("main_topics", []),
            key_concepts=summary.get("key_concepts", []),
            brief_summary=summary.get("brief_summary", ""),
            suggested_questions=summary.get("suggested_questions", []),
            total_chunks=summary.get("total_chunks", 0)
        )
    except HTTPException:
        raise
    except Exception as e:
        log_error("Get summary failed", e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/units/{unit_id}/search")
async def search_unit(unit_id: str, request: SearchRequest):
    """Search within a unit's content"""
    log_api("POST", f"/api/rag/units/{unit_id}/search")
    
    if not request.query:
        raise HTTPException(status_code=400, detail="Query is required")
    
    try:
        results = await vector_search_service.search_similar_chunks(
            unit_id, 
            request.query, 
            request.limit
        )
        
        # Clean results (remove embeddings)
        clean_results = [
            SearchResult(
                chunk_index=r["chunk_index"],
                text=r["text"],
                similarity=r["similarity"],
                keywords=r.get("keywords", [])
            )
            for r in results
        ]
        
        return {"success": True, "data": clean_results}
    except Exception as e:
        log_error("Search failed", e)
        raise HTTPException(status_code=500, detail=str(e))
