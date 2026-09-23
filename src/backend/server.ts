import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/authRoutes';
import kitRoutes from './routes/kitRoutes';
import practiceRoutes from './routes/practiceRoutes';

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_interview_prep';

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/kits', kitRoutes);
app.use('/api/practice', practiceRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'SERVER_ERROR',
    message: err.message || 'An unexpected internal server error occurred',
  });
});

// Start Server & Connect MongoDB
export const startServer = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
      console.log('Connected to MongoDB successfully');
    }
  } catch (err) {
    console.warn('MongoDB connection warning (continuing in-memory/degraded mode if needed):', err);
  }

  return app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

export default app;
