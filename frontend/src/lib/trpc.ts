import { createTRPCClient, httpBatchLink } from '@trpc/client';

const apiUrl = (import.meta as any).env?.VITE_TRPC_URL || `${(import.meta as any).env?.VITE_API_URL || 'http://localhost:3000'}/trpc`;

export const trpc = createTRPCClient<any>({
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
