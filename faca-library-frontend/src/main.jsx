import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';
// ---- AZURE AD (SSO) — TẠM COMMENT để chia sẻ qua mạng LAN (--host) ----
// MSAL yêu cầu redirect URI đăng ký chính xác trên Azure Portal,
// khi mở từ IP mạng LAN (VD: http://192.168.x.x:5173) sẽ bị từ chối.
// Muốn bật lại SSO: bỏ comment 2 dòng dưới + khối <MsalProvider> ở dưới.
// import { MsalProvider } from '@azure/msal-react';
// import { msalInstance } from './services/authConfig.js';
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
            {/* AZURE AD — TẠM COMMENT (xem ghi chú ở đầu file) */}
            {/* <MsalProvider instance={msalInstance}> */}
                <App />
            {/* </MsalProvider> */}
        </QueryClientProvider>
    </React.StrictMode>,
);