/**
 * SPDX-License-Identifier: Apache-2.0
 * Configuração da Microsoft Authentication Library (MSAL) para Single-Page Applications (SPA)
 * Suporte a Microsoft Entra ID (Azure AD), Contas Pessoais e Microsoft Authenticator
 * Fluxo: Authorization Code Flow com PKCE (RFC 7636)
 */

import { Configuration, LogLevel } from "@azure/msal-browser";

export const AZURE_CLIENT_ID: string = (import.meta as any).env?.VITE_AZURE_CLIENT_ID || "";
export const AZURE_TENANT_ID: string = (import.meta as any).env?.VITE_AZURE_TENANT_ID || "common";
export const AZURE_REDIRECT_URI: string = 
  (import.meta as any).env?.VITE_AZURE_REDIRECT_URI || 
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

// Identifica se as variáveis de ambiente reais foram fornecidas
export const isMsalConfigured = Boolean(
  AZURE_CLIENT_ID && 
  AZURE_CLIENT_ID.trim() !== "" && 
  AZURE_CLIENT_ID !== "00000000-0000-0000-0000-000000000000"
);

/**
 * Configuração oficial da MSAL Browser v3/v4 para SPA
 */
export const msalConfig: Configuration = {
  auth: {
    clientId: isMsalConfigured ? AZURE_CLIENT_ID : "00000000-0000-0000-0000-000000000000",
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    redirectUri: AZURE_REDIRECT_URI,
    postLogoutRedirectUri: AZURE_REDIRECT_URI,
  },
  cache: {
    // Armazena tokens em localStorage para persistência de sessão entre abas e recarregamentos
    cacheLocation: "localStorage",
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error("[MSAL Error]", message);
            break;
          case LogLevel.Warning:
            console.warn("[MSAL Warning]", message);
            break;
          case LogLevel.Info:
          default:
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

/**
 * Escopos padrão para login e leitura do perfil do usuário via Microsoft Graph
 */
export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};
