import { PublicClientApplication } from "@azure/msal-browser";

// Cấu hình kết nối Azure AD / Microsoft Entra ID
export const msalConfig = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "YOUR_AZURE_CLIENT_ID", // Lấy từ Azure App Registration
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "common"}`,
        redirectUri: window.location.origin, // Tự động lấy URL hiện tại (http://localhost:5173)
    },
    cache: {
        cacheLocation: "sessionStorage", // Lưu token ở sessionStorage để bảo mật
        storeAuthStateInCookie: false,
    }
};

// Yêu cầu quyền truy cập cơ bản (Lấy Email & Profile)
export const loginRequest = {
    scopes: ["User.Read", "openid", "profile", "email"]
};

export const msalInstance = new PublicClientApplication(msalConfig);