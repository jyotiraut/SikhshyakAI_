"""
Colored Logger for RAG Service
"""
import logging
import sys
from datetime import datetime

# ANSI color codes
class Colors:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    WHITE = '\033[37m'

class ColoredFormatter(logging.Formatter):
    """Custom formatter with colors"""
    
    LEVEL_COLORS = {
        logging.DEBUG: Colors.DIM,
        logging.INFO: Colors.BLUE,
        logging.WARNING: Colors.YELLOW,
        logging.ERROR: Colors.RED,
        logging.CRITICAL: Colors.RED + Colors.BOLD,
    }
    
    def format(self, record):
        # Get color for level
        color = self.LEVEL_COLORS.get(record.levelno, Colors.WHITE)
        
        # Format timestamp
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Format message
        level_name = record.levelname.ljust(8)
        message = record.getMessage()
        
        # Build formatted string
        formatted = f"{Colors.CYAN}[{timestamp}]{Colors.RESET} {color}{level_name}{Colors.RESET} {message}"
        
        return formatted

def setup_logging():
    """Setup colored logging"""
    # Create handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(ColoredFormatter())
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = [handler]
    
    # Reduce noise from third-party libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    
    return root_logger

# Custom log functions with icons
logger = logging.getLogger(__name__)

def log_info(message: str, data: dict = None):
    logger.info(f"ℹ️  {message}")
    if data:
        logger.info(f"   └─ {data}")

def log_success(message: str, data: dict = None):
    logger.info(f"✅ {message}")
    if data:
        logger.info(f"   └─ {data}")

def log_warning(message: str, data: dict = None):
    logger.warning(f"⚠️  {message}")
    if data:
        logger.warning(f"   └─ {data}")

def log_error(message: str, error: Exception = None):
    logger.error(f"❌ {message}")
    if error:
        logger.error(f"   └─ {str(error)}")

def log_chat(role: str, message: str):
    icon = "👤" if role == "user" else "🤖"
    color = Colors.MAGENTA if role == "user" else Colors.GREEN
    preview = message[:100] + "..." if len(message) > 100 else message
    logger.info(f"{icon} {color}{role.upper()}{Colors.RESET}: {preview}")

def log_embed(message: str, data: dict = None):
    logger.info(f"🔮 EMBED: {message}")
    if data:
        logger.info(f"   └─ {data}")

def log_search(message: str, data: dict = None):
    logger.info(f"🔍 SEARCH: {message}")
    if data:
        logger.info(f"   └─ {data}")

def log_db(message: str, data: dict = None):
    logger.info(f"💾 DB: {message}")
    if data:
        logger.info(f"   └─ {data}")

def log_api(method: str, path: str, status: int = None):
    status_color = Colors.GREEN if status and status < 400 else Colors.RED if status else Colors.WHITE
    status_str = f" {status_color}[{status}]{Colors.RESET}" if status else ""
    logger.info(f"→ {method} {path}{status_str}")

def log_divider():
    logger.info("─" * 60)

def log_header(title: str):
    logger.info("")
    logger.info(f"{Colors.BOLD}{Colors.CYAN}═══ {title} ═══{Colors.RESET}")
    logger.info("")
