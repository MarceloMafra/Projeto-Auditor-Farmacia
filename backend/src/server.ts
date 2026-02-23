import express from 'express';
import cors from 'cors';
import * as trpcExpress from '@trpc/server/adapters/express';
import { createContext } from '@/api/trpc';
import { appRouter } from '@/api/router';
import { env } from '@/config/env';
import { testConnection } from '@/db';

/**
 * Criar aplicação Express
 */
const app = express();

// ==================== Middleware ====================
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== Health Check ====================
app.get('/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: dbConnected ? 'ok' : 'degraded',
    timestamp: new Date(),
    database: dbConnected ? 'connected' : 'disconnected',
  });
});

// ==================== tRPC ====================
app.use(
  '/trpc',
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      if (env.NODE_ENV === 'development') {
        console.error(`❌ tRPC Error [${path}]:`, error);
      }
    },
  })
);

// ==================== 404 Handler ====================
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    message: 'Esta rota não existe',
  });
});

// ==================== Error Handler ====================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: env.NODE_ENV === 'development' ? err.message : 'Um erro interno ocorreu',
  });
});

// ==================== Iniciar Servidor ====================
const PORT = env.PORT;

async function startServer() {
  try {
    // Testar conexão com banco de dados
    const connected = await testConnection();
    if (!connected && env.NODE_ENV === 'production') {
      throw new Error('Falha ao conectar com o banco de dados');
    }

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════╗
║   🚀 Auditor Digital Backend                   ║
║   Environment: ${env.NODE_ENV.padEnd(36)}║
║   Port: ${PORT.toString().padEnd(40)}║
║   tRPC: http://localhost:${PORT}/trpc${' '.repeat(23)}║
╚════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();

export { app };
