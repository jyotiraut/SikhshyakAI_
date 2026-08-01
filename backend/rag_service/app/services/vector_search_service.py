"""
Vector Search Service - Similarity search on embedded documents
"""
import numpy as np
from typing import List, Dict, Any

from app.db import get_database
from app.services.embedding_service import embedding_service
from app.logger import log_search, log_info, log_error, log_success

class VectorSearchService:
    def __init__(self):
        self.default_top_k = 5
        self.similarity_threshold = 0.3
    
    def cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0
        
        a = np.array(vec_a)
        b = np.array(vec_b)
        
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return float(dot_product / (norm_a * norm_b))

    def _rank_chunks(
        self,
        query_embedding: List[float],
        chunks: List[Dict[str, Any]],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """Cosine-rank all chunks against the query in a single vectorised pass."""
        dimension = len(query_embedding)
        usable = [
            c for c in chunks
            if isinstance(c.get("embedding"), list) and len(c["embedding"]) == dimension
        ]
        if not usable:
            log_info("No chunk embeddings matched the query embedding dimension")
            return []

        query_vector = np.asarray(query_embedding, dtype=np.float32)
        query_norm = np.linalg.norm(query_vector)
        if query_norm == 0:
            return []

        matrix = np.asarray([c["embedding"] for c in usable], dtype=np.float32)
        norms = np.linalg.norm(matrix, axis=1)
        # Guard against zero vectors instead of emitting NaN similarities.
        safe_norms = np.where(norms == 0, 1.0, norms)
        scores = (matrix @ query_vector) / (safe_norms * query_norm)
        scores = np.where(norms == 0, -1.0, scores)

        # argpartition avoids a full sort when there are many chunks.
        count = min(top_k, len(usable))
        candidate_indices = np.argpartition(-scores, count - 1)[:count]
        candidate_indices = candidate_indices[np.argsort(-scores[candidate_indices])]

        results = []
        for i in candidate_indices:
            score = float(scores[i])
            if score < self.similarity_threshold:
                continue
            chunk = usable[i]
            results.append({
                "chunk_index": chunk["chunk_index"],
                "text": chunk["text"],
                "keywords": chunk.get("keywords", []),
                "similarity": score,
                "_id": str(chunk["_id"])
            })
        return results
    
    async def search_similar_chunks(
        self,
        unit_id: str,
        query: str,
        top_k: int = None
    ) -> List[Dict[str, Any]]:
        """Search for similar chunks using vector similarity"""
        top_k = top_k or self.default_top_k
        log_search(f'Searching for: "{query[:50]}..."')

        try:
            # Generate embedding for query
            query_embedding = await embedding_service.generate_embedding(query)

            # Get all chunks for this unit
            db = get_database()
            cursor = db.document_chunks.find({"unit_id": unit_id})
            chunks = await cursor.to_list(length=None)

            if not chunks:
                log_info(f"No chunks found for unit {unit_id}")
                return []

            log_search(f"Comparing against {len(chunks)} chunks")

            # Score every chunk in one matrix operation. The previous
            # chunk-at-a-time Python loop rebuilt a numpy array per comparison,
            # which dominated search time on units with many chunks.
            results = self._rank_chunks(query_embedding, chunks, top_k)

            if results:
                log_success(f"Found {len(results)} relevant chunks", {
                    "top_score": round(results[0]["similarity"], 3),
                    "avg_score": round(sum(c["similarity"] for c in results) / len(results), 3)
                })
            else:
                log_info("No chunks above similarity threshold")
            
            return results
            
        except Exception as e:
            log_error("Vector search failed", e)
            # Fallback to keyword search
            return await self.keyword_search(unit_id, query, top_k)
    
    async def keyword_search(
        self, 
        unit_id: str, 
        query: str, 
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """Fallback keyword search"""
        log_search("Falling back to keyword search")
        
        try:
            db = get_database()
            
            # Extract keywords from query
            import re
            keywords = re.findall(r'\b[a-z]{3,}\b', query.lower())
            
            if not keywords:
                return []
            
            # Search chunks with matching keywords
            chunks = await db.document_chunks.find({
                "unit_id": unit_id,
                "keywords": {"$in": keywords}
            }).limit(top_k).to_list(length=None)
            
            # Calculate simple relevance score
            results = []
            for chunk in chunks:
                text_lower = chunk["text"].lower()
                match_count = sum(1 for kw in set(keywords) if kw in text_lower)
                similarity = match_count / max(len(set(keywords)), 1)

                results.append({
                    "chunk_index": chunk["chunk_index"],
                    "text": chunk["text"],
                    "keywords": chunk.get("keywords", []),
                    "similarity": similarity,
                    # Flag the weaker scoring path so callers do not present a
                    # keyword overlap ratio as if it were semantic relevance.
                    "match_type": "keyword",
                    "_id": str(chunk["_id"])
                })
            
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results
            
        except Exception as e:
            log_error("Keyword search failed", e)
            return []
    
    def format_context_from_chunks(self, chunks: List[Dict[str, Any]]) -> str:
        """Format chunks into context string"""
        if not chunks:
            return ""
        
        context_parts = []
        for i, chunk in enumerate(chunks):
            relevance = chunk.get("similarity", 0) * 100
            context_parts.append(
                f"[Context {i + 1}] (Relevance: {relevance:.1f}%)\n{chunk['text']}"
            )
        
        return "\n\n---\n\n".join(context_parts)

# Singleton instance
vector_search_service = VectorSearchService()
