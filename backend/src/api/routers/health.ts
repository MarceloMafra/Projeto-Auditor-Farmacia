import { publicProcedure, router } from '../trpc';
import { z } from 'zod';

export const healthRouter = router({
  check: publicProcedure.query(async ({ ctx }) => {
    return {
      status: 'ok',
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
    };
  }),

  database: publicProcedure.query(async ({ ctx }) => {
    try {
      const [result] = await (ctx.db as any).execute('SELECT 1 as check');
      return {
        status: 'connected',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),
});
