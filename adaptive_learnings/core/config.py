from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ================= API CONFIG =================
    API_TITLE: str = "SikshyakAI API"
    API_DESCRIPTION: str = "AI-powered educational content generation platform"
    API_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ================= LLM CONFIG =================
    GEMINI_API_KEY: str

    # ================= DATABASE CONFIG =================
    MONGODB_URI: str
    DATABASE_NAME: str = "sikshyakai"

    # ================= MODEL CONFIG =================
    MODEL_CHECKPOINT_PATH: str = "checkpoints/best_adaptive_sakt.pth"
    DEVICE: str = "cpu"

    # ================= OPTIONAL / FUTURE =================
    ANTHROPIC_API_KEY: Optional[str] = None

    # ================= RAG CONFIG =================
    VECTOR_STORE_PATH: str = "./vector_store"
    EMBEDDING_MODEL: str = "models/embedding-001"

    # ================= LOGGING =================
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/sikshyakai.log"

    # ================= PYDANTIC V2 CONFIG =================
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore"   #  THIS FIXES YOUR ERROR
    )


settings = Settings()
