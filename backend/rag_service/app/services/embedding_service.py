"""
Embedding Service - Handles document chunking and embedding using Google AI
"""
import asyncio
import os
import re
import httpx
from typing import List, Dict, Any, Optional
from datetime import datetime

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter

from app.config import settings
from app.db import get_database
from app.logger import log_info, log_success, log_error, log_embed, log_db

class EmbeddingService:
    def __init__(self):
        self.embeddings = None
        self.initialized = False

        # Chunking config
        self.chunk_size = 1000
        self.chunk_overlap = 200
        # Embedding requests are batched; one HTTP round trip per chunk made
        # embedding a large PDF take minutes.
        self.embed_batch_size = 16

        # Stop words for keyword extraction
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
            'what', 'which', 'who', 'when', 'where', 'how', 'why', 'all', 'each',
            'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
            'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'just'
        }
    
    def initialize(self):
        """Initialize the embedding model"""
        if not settings.google_api_key:
            log_error("Google API key not set")
            return False
        
        try:
            os.environ["GOOGLE_API_KEY"] = settings.google_api_key
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/gemini-embedding-001",
                google_api_key=settings.google_api_key
            )
            self.initialized = True
            log_success("Embedding service initialized")
            return True
        except Exception as e:
            log_error("Failed to initialize embedding service", e)
            return False
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Embed a search query.

        The underlying client is synchronous, so it runs in a worker thread —
        calling it directly blocked the whole event loop for the duration of the
        request, stalling every other user of the service.
        """
        if not self.initialized:
            raise Exception("Embedding service not initialized")

        try:
            return await asyncio.to_thread(self.embeddings.embed_query, text)
        except Exception as e:
            log_error("Failed to generate embedding", e)
            raise e

    async def generate_document_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Embed stored document chunks.

        Uses the document embedding task type rather than the query one — Google's
        embeddings are task-specific and mixing the two measurably degrades
        retrieval quality.
        """
        if not self.initialized:
            raise Exception("Embedding service not initialized")

        vectors: List[List[float]] = []
        for start in range(0, len(texts), self.embed_batch_size):
            batch = texts[start:start + self.embed_batch_size]
            vectors.extend(await asyncio.to_thread(self.embeddings.embed_documents, batch))
        return vectors
    
    def split_text_into_chunks(self, text: str) -> List[Dict[str, Any]]:
        """Split text into chunks with metadata"""
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", "! ", "? ", " ", ""]
        )
        
        texts = splitter.split_text(text)
        
        chunks = []
        for i, chunk_text in enumerate(texts):
            chunks.append({
                "index": i,
                "text": chunk_text.strip(),
                "word_count": len(chunk_text.split())
            })
        
        log_embed(f"Split text into {len(chunks)} chunks")
        return chunks
    
    def extract_keywords(self, text: str, max_keywords: int = 20) -> List[str]:
        """Extract keywords from text"""
        words = re.findall(r'\b[a-z]{3,}\b', text.lower())
        word_count = {}
        
        for word in words:
            if word not in self.stop_words:
                word_count[word] = word_count.get(word, 0) + 1
        
        # Sort by frequency
        sorted_words = sorted(word_count.items(), key=lambda x: x[1], reverse=True)
        return [word for word, _ in sorted_words[:max_keywords]]
    
    async def fetch_unit_from_node(self, unit_id: str) -> Optional[Dict[str, Any]]:
        """Fetch unit data from Node.js backend"""
        try:
            async with httpx.AsyncClient() as client:
                # Try to fetch unit from Node backend
                url = f"{settings.node_backend_url}/api/v1/units/{unit_id}"
                log_info(f"Fetching unit from: {url}")
                
                response = await client.get(url, timeout=30.0)
                
                if response.status_code == 200:
                    data = response.json()
                    # Handle different response structures
                    if "data" in data:
                        return data["data"]
                    return data
                else:
                    log_error(f"Failed to fetch unit: {response.status_code}")
                    return None
                    
        except Exception as e:
            log_error("Failed to fetch unit from Node backend", e)
            return None
    
    async def get_unit_from_db(self, unit_id: str) -> Optional[Dict[str, Any]]:
        """Get unit directly from MongoDB"""
        try:
            db = get_database()
            from bson import ObjectId
            
            unit = await db.units.find_one({"_id": ObjectId(unit_id)})
            if unit:
                unit["_id"] = str(unit["_id"])
                log_db(f"Found unit: {unit.get('title', 'Unknown')}")
                return unit
            return None
        except Exception as e:
            log_error("Failed to get unit from database", e)
            return None
    
    async def embed_unit(self, unit_id: str, force: bool = False) -> Dict[str, Any]:
        """Embed all documents in a unit"""
        log_embed(f"Starting embedding for unit: {unit_id}")
        
        db = get_database()
        
        # Check if already embedded
        if not force:
            existing = await db.document_summaries.find_one({
                "unit_id": unit_id,
                "embedding_status": "completed"
            })
            if existing:
                log_info("Unit already embedded")
                return {
                    "success": True,
                    "message": "Unit already embedded",
                    "chunks_created": existing.get("total_chunks", 0),
                    "status": "completed"
                }
        
        # Get unit data
        unit = await self.get_unit_from_db(unit_id)
        if not unit:
            # Try fetching from Node backend
            unit = await self.fetch_unit_from_node(unit_id)
        
        if not unit:
            raise Exception("Unit not found")
        
        log_info(f"Processing unit: {unit.get('title', 'Unknown')}")
        
        # Update status to processing
        await db.document_summaries.update_one(
            {"unit_id": unit_id},
            {
                "$set": {
                    "unit_id": unit_id,
                    "title": unit.get("title", "Unknown"),
                    "embedding_status": "processing",
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        try:
            # Collect all text content - ONLY from textExtract
            all_text = ""
            text_extract_found = False
            
            # Add text from files - ONLY textExtract field
            for file in unit.get("files", []):
                if file.get("textExtract"):
                    all_text += file["textExtract"] + "\n\n"
                    text_extract_found = True
            
            # Check if any textExtract was found
            if not text_extract_found:
                log_error("No PDF found", Exception("No textExtract field in any file"))
                # Update status to failed
                await db.document_summaries.update_one(
                    {"unit_id": unit_id},
                    {
                        "$set": {
                            "embedding_status": "failed",
                            "embedding_error": "No PDF found - textExtract not available in any file"
                        }
                    }
                )
                raise Exception("No PDF found - textExtract not available in any file")
            
            if not all_text.strip():
                raise Exception("No text content found in extracted PDFs")
            
            # Split into chunks
            chunks = self.split_text_into_chunks(all_text)

            # Embed in batches, then swap the stored chunks in one go. Deleting
            # first meant a failure part way through left the unit with no
            # retrievable content at all while still reporting a chunk count.
            saved_count = 0
            pending = []
            for start in range(0, len(chunks), self.embed_batch_size):
                batch = chunks[start:start + self.embed_batch_size]
                log_embed(
                    f"Embedding chunks {start + 1}-{start + len(batch)} of {len(chunks)}"
                )
                try:
                    vectors = await self.generate_document_embeddings(
                        [c["text"] for c in batch]
                    )
                except Exception as e:
                    log_error(f"Failed to embed chunk batch starting at {start}", e)
                    continue

                for chunk, embedding in zip(batch, vectors):
                    pending.append({
                        "unit_id": unit_id,
                        "chunk_index": chunk["index"],
                        "text": chunk["text"],
                        "word_count": chunk["word_count"],
                        "keywords": self.extract_keywords(chunk["text"]),
                        "embedding": embedding,
                        "created_at": datetime.utcnow()
                    })

            if not pending:
                raise Exception("Every chunk failed to embed")

            await db.document_chunks.delete_many({"unit_id": unit_id})
            await db.document_chunks.insert_many(pending)
            saved_count = len(pending)

            # Generate summary
            main_topics = self.extract_keywords(all_text, 8)
            key_concepts = self.extract_keywords(all_text, 15)
            
            # Update summary
            await db.document_summaries.update_one(
                {"unit_id": unit_id},
                {
                    "$set": {
                        "title": unit.get("title", "Unknown"),
                        "main_topics": main_topics,
                        "key_concepts": key_concepts,
                        "document_type": "educational",
                        "brief_summary": f"This unit covers {unit.get('title', 'the topic')}. Main topics include: {', '.join(main_topics[:5])}.",
                        "detailed_summary": f"{unit.get('title', 'This unit')} is an educational unit covering {', '.join(main_topics)}. {unit.get('description', '')}",
                        "suggested_questions": [
                            f"What is the main topic of {unit.get('title', 'this unit')}?",
                            "Can you explain the key concepts in this unit?",
                            "What are the learning objectives of this unit?",
                            "Can you summarize the most important points?",
                            "How does this topic relate to other concepts?"
                        ],
                        "total_chunks": saved_count,
                        "embedding_status": "completed",
                        "embedding_error": None
                    }
                }
            )
            
            log_success(f"Unit embedded successfully: {saved_count} chunks")
            
            return {
                "success": True,
                "message": "Unit embedded successfully",
                "chunks_created": saved_count,
                "status": "completed"
            }
            
        except Exception as e:
            log_error("Embedding failed", e)
            
            # Update status to failed
            await db.document_summaries.update_one(
                {"unit_id": unit_id},
                {
                    "$set": {
                        "embedding_status": "failed",
                        "embedding_error": str(e)
                    }
                }
            )
            
            raise e
    
    async def get_embedding_status(self, unit_id: str) -> Dict[str, Any]:
        """Get embedding status for a unit"""
        db = get_database()
        
        summary = await db.document_summaries.find_one({"unit_id": unit_id})
        
        if not summary:
            return {"status": "not_started", "chunks_count": 0}
        
        chunks_count = await db.document_chunks.count_documents({"unit_id": unit_id})
        
        return {
            "status": summary.get("embedding_status", "unknown"),
            "chunks_count": chunks_count,
            "error": summary.get("embedding_error")
        }
    
    async def is_unit_embedded(self, unit_id: str) -> bool:
        """Check if unit is embedded"""
        db = get_database()
        summary = await db.document_summaries.find_one({
            "unit_id": unit_id,
            "embedding_status": "completed"
        })
        return summary is not None

# Singleton instance
embedding_service = EmbeddingService()
