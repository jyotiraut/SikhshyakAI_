"""
RAG Service Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Google AI
    google_api_key: str = ""
    
    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = "ShikshyakAI"
    
    # Server
    rag_port: int = 3000
    node_backend_url: str = "http://localhost:8000"
    cors_origins: str = "*"
    
    # Paths
    upload_path: str = "./uploads"
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Validate required settings
def validate_settings():
    if not settings.google_api_key or settings.google_api_key == "your_google_api_key_here":
        print("[warn]  WARNING: GOOGLE_API_KEY not set. Get one from https://aistudio.google.com/apikey")
        return False
    return True
