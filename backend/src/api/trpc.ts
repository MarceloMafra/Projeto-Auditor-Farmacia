import { initTRPC, TRPCError } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { type Database } from '@/db';

/**
 * Context type para tRPC
 */
export interface Context {
  db: Database;
  user?: {
    id: number;
    email: string;
    role: 'Admin' | 'Analyst';
  };
  req?: CreateExpressContextOptions['req'];
  res?: CreateExpressContextOptions['res'];
}

/**
 * Criar context para cada request
 */
export async function createContext(opts?: CreateExpressContextOptions): Promise<Context> {
  const { db } = await import('@/db');

  return {
    db,
    user: (opts?.req as any)?.user, // Será preenchido por middleware de autenticação
  };
}

/**
 * Inicializar tRPC
 */
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? null : error.cause,
      },
    };
  },
});

/**
 * Exportar helpers úteis
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware de autenticação
 */
export const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Você não está autenticado',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Middleware para validar papel de admin
 */
export const isAdmin = isAuthenticated.pipe(({ ctx, next }) => {
  if (ctx.user?.role !== 'Admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Você não tem permissão para acessar este recurso',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Protected procedure (requer autenticação)
 */
export const protectedProcedure = publicProcedure.use(isAuthenticated);

/**
 * Admin procedure (requer admin role)
 */
export const adminProcedure = publicProcedure.use(isAdmin);
