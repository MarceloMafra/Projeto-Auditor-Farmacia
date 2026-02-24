import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../../backend/src/api/router';

const apiUrl = import.meta.env.VITE_TRPC_URL || `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/trpc`;

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: apiUrl,
      async fetch(url, options) {
        const response = await fetch(url, {
          ...options,
          credentials: 'include', // Para cookies/auth
        });
        if (!response.ok && response.status === 401) {
          // Redirecionar para login se não autenticado
          window.location.href = '/login';
        }
        return response;
      },
    }),
  ],
});
