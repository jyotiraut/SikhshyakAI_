"""
Pydantic Models for RAG Service
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from bson import ObjectId

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v, handler=None):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str) and ObjectId.is_valid(v):
            return v
        raise ValueError("Invalid ObjectId")

# ============ Request Models ============

class ChatRequest(BaseModel):
    # Bounded so a pasted document cannot blow up the prompt or the bill.
    message: str = Field(min_length=1, max_length=4000)
    session_id: Optional[str] = None
    user_id: str

class EmbedRequest(BaseModel):
    unit_id: str
    force: bool = False  # Force re-embed even if already embedded

class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    limit: int = Field(default=5, ge=1, le=25)


class ChatSource(BaseModel):
    chunk_index: int
    similarity: float
    excerpt: str

# ============ Response Models ============

class ChatResponse(BaseModel):
    success: bool
    message: str
    session_id: str
    relevance_score: float = 0.0
    response_time_ms: int = 0
    used_chunks: List[int] = []
    # Whether the answer is actually backed by this unit's material.
    grounded: bool = False
    sources: List[ChatSource] = []

class EmbedResponse(BaseModel):
    success: bool
    message: str
    chunks_created: int = 0
    status: str = "pending"

class SessionResponse(BaseModel):
    id: str
    unit_id: str
    user_id: str
    title: str
    message_count: int
    last_message_at: datetime
    created_at: datetime

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    relevance_score: Optional[float] = None

class HistoryResponse(BaseModel):
    session: SessionResponse
    messages: List[MessageResponse]

class StatusResponse(BaseModel):
    status: str
    chunks_count: int = 0
    error: Optional[str] = None

class SummaryResponse(BaseModel):
    title: str
    main_topics: List[str] = []
    key_concepts: List[str] = []
    brief_summary: str = ""
    suggested_questions: List[str] = []
    total_chunks: int = 0

class SearchResult(BaseModel):
    chunk_index: int
    text: str
    similarity: float
    keywords: List[str] = []

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    services: Dict[str, bool]

# ============ Database Document Models ============

class ChatSession(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: str
    unit_id: str
    title: str = "New Chat"
    status: str = "active"
    message_count: int = 0
    last_message_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class ChatMessage(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    session_id: str
    role: str  # "user" or "assistant"
    content: str
    used_chunks: List[int] = []
    relevance_score: Optional[float] = None
    response_time_ms: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class DocumentChunk(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    unit_id: str
    chunk_index: int
    text: str
    word_count: int = 0
    keywords: List[str] = []
    embedding: List[float] = []
    source_file: Dict[str, Any] = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class DocumentSummary(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    unit_id: str
    title: str
    main_topics: List[str] = []
    key_concepts: List[str] = []
    document_type: str = "educational"
    brief_summary: str = ""
    detailed_summary: str = ""
    suggested_questions: List[str] = []
    total_chunks: int = 0
    embedding_status: str = "pending"  # pending, processing, completed, failed
    embedding_error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
