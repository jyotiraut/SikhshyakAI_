import multer from 'multer';
import path from 'path';

// Use memory storage so controller can read `req.file.buffer`
const storage = multer.memoryStorage();

// Initialize upload to accept PDFs (and optionally text/markdown)
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMime = [
      'application/pdf',
      'text/plain',
      'text/markdown'
    ];
    const allowedExt = [
      '.pdf',
      '.txt',
      '.md'
    ];
    const isMimeOk = allowedMime.includes(file.mimetype);
    const isExtOk = allowedExt.includes(path.extname(file.originalname).toLowerCase());
    if (isMimeOk || isExtOk) return cb(null, true);
    return cb(new Error('Only PDF or text files are allowed'));
  }
});

export default upload;