import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import UserProvider from './lib/provider/use-auth-provider.tsx';
import { router } from './routes/routes.tsx';

const queryClient = new QueryClient({
  defaultOptions: {},
});
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <RouterProvider router={router} />
        <Toaster position='top-center' />
      </UserProvider>
    </QueryClientProvider>
  </StrictMode>,
);
