import os
from dotenv import load_dotenv
import torch

load_dotenv()

class Settings:
    # MongoDB
    MONGODB_URI = os.getenv('MONGODB_URI')
    DATABASE_NAME = os.getenv('DATABASE_NAME')
    
    # Model
    MODEL_CHECKPOINT_PATH = os.getenv('MODEL_CHECKPOINT_PATH', 'checkpoints/adaptive_sakt.pth')
    MAX_SEQ_LEN = 50
    DEVICE = torch.device(os.getenv('DEVICE', 'cpu'))
    
    # LLM
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
    
    # Learning thresholds
    MASTERY_THRESHOLD_ADVANCE = 0.85
    MASTERY_THRESHOLD_STRUGGLING = 0.3
    HINT_DEPENDENCY_THRESHOLD = 0.5
    TIME_STRUGGLE_MULTIPLIER = 1.5
    
settings = Settings()