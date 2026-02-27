import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pdfRoutes from './routes/pdf';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';

// Middleware
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ==================== HEALTH CHECK ====================
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    ok: true,
    environment: nodeEnv,
    timestamp: new Date().toISOString(),
    service: 'ucc-ipo-pdf-generator',
    endpoints: {
      health: 'GET /health',
      pdf: 'POST /api/generate-full-record-pdf',
    },
  });
});

// ==================== API ROUTES ====================
// PDF Generation endpoints
app.use('/api', pdfRoutes);

// ==================== 404 HANDLER ====================
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

// ==================== ERROR HANDLER ====================
app.use((err: any, req: Request, res: Response) => {
  console.error('[ERROR] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: nodeEnv === 'development' ? err.message : undefined,
  });
});

// ==================== SERVER STARTUP ====================
app.listen(port, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║   PDF Generation Server (UCC IPO)                     ║
╚════════════════════════════════════════════════════════╝

✅ Server running on port ${port}
📝 Environment: ${nodeEnv}

📊 Endpoints:
   └─ GET  /health                               (Health check)
   └─ POST /api/generate-full-record-pdf         (Generate PDF)

🔗 Documentation:
   └─ See server/README.md

🧪 Quick test:
   curl http://localhost:${port}/health
  `);
});
