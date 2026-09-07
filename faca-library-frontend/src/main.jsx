import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './services/authConfig.js';
import './i18n'; // Khởi tạo đa ngôn ngữ (vi/en/ko) cho toàn ứng dụng
import { startDomTranslation } from './services/domTranslator';

// Bật "catch-all" translator: tự dịch mọi text/placeholder mới xuất hiện
// trên DOM (React re-render, dữ liệu API, popup...) khi ngôn ngữ != vi
startDomTranslation();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>,
);