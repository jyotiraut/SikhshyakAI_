from pymongo import MongoClient
from pymongo.database import Database
import os
from dotenv import load_dotenv

load_dotenv()

class DatabaseManager:
    _instance = None
    _client = None
    _db = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self.connect()
    
    def connect(self):
        """Establish MongoDB connection"""
        try:
            self._client = MongoClient(os.getenv('MONGODB_URI'))
            self._db = self._client[os.getenv('DATABASE_NAME')]
            # Test connection
            self._client.admin.command('ping')
            print("[ok] Connected to MongoDB successfully!")
        except Exception as e:
            print(f"[error] Failed to connect to MongoDB: {e}")
            raise
    
    def get_database(self) -> Database:
        """Get database instance"""
        if self._db is None:
            self.connect()
        return self._db
    
    def close(self):
        """Close database connection"""
        if self._client:
            self._client.close()
            print("MongoDB connection closed")

# Singleton instance
db_manager = DatabaseManager()
db = db_manager.get_database()

# Collections - NEW STRUCTURE
users_collection = db['users']
enrollments_collection = db['enrollments']
quiz_submissions_collection = db['quizsubmissions']
courses_collection = db['courses']
units_collection = db['units']
adaptive_learning_collection = db['adaptivelearnings']
adaptivequiz_collection = db['adaptivequiz']
adaptivequiz_submissions_collection = db['adaptivequiz_submissions']

# Online learner model: per-student ability and per-item difficulty, updated
# after every answer. This is the cold-start adaptive layer - it needs no
# training data and works from a student's very first question.
learner_ability_collection = db['learnerability']
item_parameters_collection = db['itemparameters']
# Champion/challenger records for the knowledge-tracing model.
model_evaluations_collection = db['modelevaluations']