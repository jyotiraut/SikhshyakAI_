// Loaded here, not in index.js: ES imports are evaluated before the importing
// module's body runs, so a dotenv.config() call in index.js lands too late for
// the cors() setup below.
import 'dotenv/config';
import express from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';

const app = express();

// CORS_ORIGIN may be '*' or a comma-separated allow-list. A literal '*' cannot
// be sent alongside credentials, so reflect the caller's origin instead.
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Non-browser callers (curl, server-to-server) send no Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
}))
app.use(helmet());


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: Number(process.env.RATE_LIMIT_MAX || 3000), 
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);


app.use(express.json({
    limit: "16kb"
}))


app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))


app.use(mongoSanitize());


app.use(hpp());



app.use(express.static("public"))


app.use(cookieParser());




import userRoutes from './routes/userRoute.js'
import authRoutes from './routes/authRoute.js'
import courseRoutes from './routes/courseRoute.js'
import resourceRoutes from './routes/resourceRoute.js'
import pdfResourceRoutes from './routes/pdfResourceRoute.js'
import assessmentRoutes from './routes/assessmentRoute.js'
import submissionRoutes from './routes/submissionRoute.js'
import tutorialAssignmentRoutes from './routes/tutorialAssignmentRoute.js'
import enrollmentRoutes from './routes/enrollmentRoute.js'
import unitRoutes from './routes/unitRoute.js'
import quizRoutes from './routes/quizRoute.js'
import tutorialRoutes from './routes/tutorialRoute.js'
import studentRoutes from './routes/studentRoute.js'
import teacherRoutes from './routes/teacherRoute.js'
import schoolRoutes from './routes/schoolRoute.js'
import departmentRoutes from './routes/departmentRoute.js'
import ragRoutes from './routes/ragRoute.js'
import adminRoutes from './routes/adminRoute.js'

app.use('/api/v1/admin/',adminRoutes);
app.use('/api/v1/assessments/',assessmentRoutes);
app.use('/api/v1/submissions/',submissionRoutes);
app.use('/api/v1/tutorial-assignments/',tutorialAssignmentRoutes);
app.use('/api/v1/enrollments/',enrollmentRoutes); 
app.use('/api/v1/courses/',courseRoutes); 
app.use('/api/v1/resources/',resourceRoutes);
app.use('/api/v1/units/', unitRoutes);
app.use('/api/v1/quizzes/', quizRoutes);
app.use('/api/v1/tutorials/', tutorialRoutes);
app.use('/api/v1/students/', studentRoutes);
app.use('/api/v1/teachers/', teacherRoutes);
app.use('/api/v1/schools/', schoolRoutes);
app.use('/api/v1/departments/', departmentRoutes);
app.use('/api/v1/resources/pdf/', pdfResourceRoutes);
app.use('/api/v1/rag/', ragRoutes);


app.use('/api/v1/users/',userRoutes);
app.use('/api/v1/auth/',authRoutes);


export { app }


