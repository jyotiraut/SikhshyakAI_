"""
MongoDB Database Client
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    """Connect to MongoDB"""
    try:
        logger.info(f"🔌 Connecting to MongoDB: {settings.mongodb_uri}/{settings.db_name}")
        db.client = AsyncIOMotorClient(settings.mongodb_uri)
        db.db = db.client[settings.db_name]
        
        # Test connection
        await db.client.admin.command('ping')
        logger.info("✅ Connected to MongoDB successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {str(e)}")
        raise e

async def ensure_indexes():
    """
    Indexes for the lookups on the hot path. Without them every chat message ran
    a collection scan over document_chunks and chat_messages.
    """
    try:
        await db.db.document_chunks.create_index([("unit_id", 1), ("chunk_index", 1)])
        await db.db.document_chunks.create_index([("unit_id", 1), ("keywords", 1)])
        await db.db.document_summaries.create_index([("unit_id", 1)], unique=True)
        await db.db.chat_messages.create_index([("session_id", 1), ("created_at", 1)])
        await db.db.chat_sessions.create_index([("user_id", 1), ("status", 1), ("last_message_at", -1)])
        logger.info("✅ RAG indexes ensured")
    except Exception as e:
        logger.error(f"⚠️  Failed to ensure indexes: {e}")


async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        logger.info("🔌 MongoDB connection closed")

def get_database():
    """Get database instance"""
    return db.db
