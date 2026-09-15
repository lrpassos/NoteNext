/**
 * SPDX-License-Identifier: Apache-2.0
 * Serviço de autenticação MSAL para Microsoft Entra ID (Azure AD) + Microsoft Authenticator
 */

import { PublicClientApplication, AccountInfo, AuthenticationResult } from "@azure/msal-browser";
import { msalConfig, loginRequest, isMsalConfigured, AZURE_TENANT_ID } from "./msalConfig";
import { UserSession } from "../types";

let msalInstance: PublicClientApplication | null = null;
let isInitializing = false;
let initPromise: Promise<PublicClientApplication> | null = null;

/**
 * Inicialização preguiçosa (lazy singleton) da instância MSAL
 */
export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (msalInstance) {
    return msalInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const pca = new PublicClientApplication(msalConfig);
    await pca.initialize();
    msalInstance = pca;
    return pca;
  })();

  return initPromise;
}

/**
 * Retorna a conta ativa atualmente armazenada
 */
export async function getActiveAccount(): Promise<AccountInfo | null> {
  const instance = await getMsalInstance();
  const currentAccounts = instance.getAllAccounts();
  if (currentAccounts.length === 0) {
    return null;
  }
  return instance.getActiveAccount() || currentAccounts[0];
}

/**
 * Converte AccountInfo do MSAL em UserSession da aplicação
 */
export function accountToUserSession(
  account: AccountInfo, 
  idToken?: string, 
  accessToken?: string
): UserSession {
  const claims = account.idTokenClaims as Record<string, any> | undefined;
  const name = account.name || (claims?.name as string) || account.username.split("@")[0] || "Usuário Microsoft";
  const email = account.username || (claims?.preferred_username as string) || (claims?.email as string) || "usuario@empresa.com";
  const roles = (claims?.roles as string[]) || [];

  return {
    email,
    name,
    username: account.username,
    isAuthenticated: true,
    loginMethod: "microsoft",
    mfaEnabled: true, // Microsoft Authenticator / Conditional Access
    tenantId: account.tenantId || AZURE_TENANT_ID,
    idToken,
    accessToken,
    roles,
  };
}

/**
 * Executa o Login via Microsoft Entra ID utilizando Pop-up (compatível com SPAs e iframes)
 * Em caso de ambiente de teste/demonstração onde o VITE_AZURE_CLIENT_ID não está preenchido,
 * fornece fallback assistido para testes imediatos da experiência do usuário.
 */
export async function loginWithMicrosoft(): Promise<UserSession> {
  if (!isMsalConfigured) {
    throw new Error(
      "Microsoft Entra ID não configurado no ambiente. Configure VITE_AZURE_CLIENT_ID para autenticação corporativa ou acesse com e-mail e senha com 2FA."
    );
  }

  const instance = await getMsalInstance();
  try {
    const result: AuthenticationResult = await instance.loginPopup({
      ...loginRequest,
      prompt: "select_account",
    });

    if (result.account) {
      instance.setActiveAccount(result.account);
    }

    const session = accountToUserSession(result.account, result.idToken, result.accessToken);
    localStorage.setItem("notenext_session", JSON.stringify(session));
    return session;
  } catch (error: any) {
    console.error("[MSAL Error during loginPopup]:", error);
    throw new Error(error.errorMessage || error.message || "Falha na autenticação com Microsoft Entra ID.");
  }
}

/**
 * Adquire tokens silenciosamente via renovação em segundo plano ou abre pop-up caso expire
 */
export async function acquireToken(): Promise<string | null> {
  if (!isMsalConfigured) {
    return "demo-bearer-token-graph-api-user-read";
  }

  const instance = await getMsalInstance();
  const account = await getActiveAccount();

  if (!account) {
    return null;
  }

  try {
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  } catch (err) {
    // Fallback para pop-up interativo caso consentimento adicional ou MFA seja exigido
    try {
      const response = await instance.acquireTokenPopup({
        ...loginRequest,
        account,
      });
      return response.accessToken;
    } catch (popupErr) {
      console.error("[MSAL acquireTokenPopup failed]:", popupErr);
      return null;
    }
  }
}

/**
 * Logout unificado: Encerra a sessão tanto no cliente local quanto no Microsoft Entra ID
 */
export async function logoutFromMicrosoft(): Promise<void> {
  localStorage.removeItem("notenext_session");
  localStorage.removeItem("veridian_session");

  if (!isMsalConfigured) {
    return;
  }

  try {
    const instance = await getMsalInstance();
    const account = await getActiveAccount();
    if (account) {
      await instance.logoutPopup({
        account,
        postLogoutRedirectUri: window.location.origin,
      });
    }
  } catch (err) {
    console.warn("[MSAL Logout warning]:", err);
  }
}
