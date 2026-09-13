import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './services/authConfig.js';
import './i18n';
import { startDomTranslation } from './services/domTranslator';

// TanStack Query — global cache for async data
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,   // 30 s — avoid unnecessary refetches
            retry: 1,            // retry failed queries once
            refetchOnWindowFocus: false,
        },
    },
});

startDomTranslation();

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <MsalProvider instance={msalInstance}>
                <App />
            </MsalProvider>
        </QueryClientProvider>
    </React.StrictMode>,
);