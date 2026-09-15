/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Componente de Autenticação Segura com Verificação em Duas Etapas (2FA - TOTP RFC 6238)
 * Suporte a Google Authenticator, Microsoft Authenticator e Microsoft Entra ID
 * Criado por LRCriative
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Smartphone, 
  KeyRound, 
  QrCode, 
  Copy, 
  CheckCheck, 
  AlertCircle, 
  ArrowLeft, 
  User, 
  Signature,
  RefreshCw,
  Info
} from "lucide-react";
import { UserSession } from "../types";
import { loginWithMicrosoft } from "../auth/msalService";
import { isMsalConfigured } from "../auth/msalConfig";

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

type AuthStage = "login" | "mfa-setup" | "mfa-verify" | "register" | "forgot-password";

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Controle de estágios condicionais
  const [stage, setStage] = useState<AuthStage>("login");

  // Credenciais estritamente individuais (sem qualquer valor pré-preenchido ou mock)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registro de nova conta
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");

  // Redefinição de senha
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotPasswordConfirm, setForgotPasswordConfirm] = useState("");

  // Estado do fluxo de MFA / 2FA
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [mfaEmail, setMfaEmail] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [showManualSecret, setShowManualSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Estados de feedback e carregamento
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEnteringApp, setIsEnteringApp] = useState(false);

  /**
   * Chamada de API resiliente com retry automático contra quedas transitórias de proxy (404/502/503 em reinicialização)
   */
  const safeApiRequest = async <T = any,>(url: string, options: RequestInit, maxRetries = 2): Promise<T> => {
    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt++;
      try {
        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type") || "";
        const rawText = await response.text();

        // Se for resposta JSON do backend Express
        if (contentType.includes("application/json")) {
          let data: any = {};
          try {
            data = JSON.parse(rawText);
          } catch {
            data = {};
          }
          if (!response.ok) {
            throw new Error(data.error || `Erro (${response.status}): Não foi possível concluir a operação.`);
          }
          return data as T;
        }

        // Se for erro HTML de proxy ou gateway (404, 502, 503, 504 durante restart do servidor)
        const isProxyError = response.status === 404 || response.status === 502 || response.status === 503 || response.status === 504;
        if (isProxyError && attempt <= maxRetries) {
          // Aguarda 1.2s para o servidor concluir a inicialização e tenta novamente de forma transparente
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }

        if (!response.ok) {
          if (isProxyError) {
            throw new Error("O servidor está conectando. Por favor, aguarde alguns instantes e tente novamente.");
          }
          throw new Error(`Falha de conexão com o servidor (${response.status}).`);
        }

        try {
          return JSON.parse(rawText) as T;
        } catch {
          return {} as T;
        }
      } catch (err: any) {
        if (attempt <= maxRetries && (err.name === "TypeError" || err.message?.includes("Failed to fetch"))) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        throw err;
      }
    }
    throw new Error("Servidor temporariamente indisponível. Tente novamente.");
  };

  /**
   * 1. Submissão do Login de Credenciais (E-mail e Senha)
   * O backend valida a senha e decide condicionalmente se exige setup de QR Code ou desafio de 6 dígitos
   */
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setIsLoading(true);

    try {
      const data = await safeApiRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      setTempToken(data.tempToken);
      setMfaEmail(data.email || cleanEmail);
      setTotpCode("");

      // CENÁRIO A: Primeiro Login - Usuário precisa configurar o QR Code no app autenticador
      if (data.requireMfaSetup) {
        await initMfaSetup(data.tempToken, data.email || cleanEmail);
        return;
      }

      // CENÁRIO B: Usuário já possui 2FA ativo - Exige código de 6 dígitos
      if (data.requireMfaVerify) {
        setStage("mfa-verify");
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro de conexão ao servidor.");
      setIsLoading(false);
    }
  };

  /**
   * Inicia o fluxo de configuração do MFA chamando /api/auth/mfa-setup
   */
  const initMfaSetup = async (token: string, userEmail: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await safeApiRequest("/api/auth/mfa-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tempToken: token }),
      });

      setQrCodeUrl(data.qrCodeUrl);
      setMfaSecret(data.secret);
      setMfaEmail(userEmail);
      setStage("mfa-setup");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao gerar QR Code para 2FA.");
      setStage("login");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 2. Verificação do Código de 6 Dígitos (TOTP)
   * Válido tanto para o cadastro inicial (QR Code) quanto para o login diário
   */
  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = totpCode.trim().replace(/\s+/g, "");
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage("Digite o código completo de 6 dígitos numéricos.");
      return;
    }

    if (!tempToken) {
      setErrorMessage("Sessão expirada. Por favor, faça login novamente.");
      setStage("login");
      return;
    }

    setIsLoading(true);

    try {
      const data = await safeApiRequest("/api/auth/mfa-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({
          tempToken,
          code: cleanCode,
        }),
      });

      // Sessão individual autenticada com sucesso
      const newSession: UserSession = {
        email: data.user.email,
        name: data.user.name || data.user.email.split("@")[0],
        isAuthenticated: true,
        loginMethod: "credentials",
        mfaEnabled: true,
        token: data.token,
      };

      // Transição suave para o Workspace
      triggerSessionTransition(newSession);
    } catch (err: any) {
      setErrorMessage(err.message || "Falha na verificação de 2FA.");
      setIsLoading(false);
    }
  };

  /**
   * 3. Cadastro de Nova Conta Individual
   */
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regEmail.trim() || !regPassword) {
      setErrorMessage("Todos os campos obrigatórios devem ser preenchidos.");
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setErrorMessage("A confirmação de senha não confere.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const data = await safeApiRequest("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
        }),
      });

      setSuccessMessage(data.message || "Conta criada com sucesso! Entre com sua senha para ativar o 2FA via aplicativo.");
      setEmail(regEmail.trim().toLowerCase());
      setPassword("");
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      setRegPasswordConfirm("");
      setStage("login");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao registrar conta.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 4. Redefinição de Senha
   */
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim() || !forgotPassword) {
      setErrorMessage("Preencha o e-mail e a nova senha.");
      return;
    }

    if (forgotPassword !== forgotPasswordConfirm) {
      setErrorMessage("As senhas digitadas não são iguais.");
      return;
    }

    if (forgotPassword.length < 6) {
      setErrorMessage("A nova senha deve ter no mínimo 6 dígitos.");
      return;
    }

    setIsLoading(true);

    try {
      const data = await safeApiRequest("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          newPassword: forgotPassword,
        }),
      });

      setSuccessMessage(data.message || "Senha redefinida com sucesso! Ao entrar, configure seu novo código 2FA.");
      setEmail(forgotEmail.trim().toLowerCase());
      setPassword("");
      setStage("login");
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao redefinir senha.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 5. Login Corporativo Microsoft Entra ID (Opcional)
   */
  const handleMicrosoftLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const session = await loginWithMicrosoft();
      triggerSessionTransition(session);
    } catch (err: any) {
      setErrorMessage(err.message || "Falha no login Microsoft.");
      setIsLoading(false);
    }
  };

  const triggerSessionTransition = (finalSession: UserSession) => {
    setIsEnteringApp(true);
    setTimeout(() => {
      onLoginSuccess(finalSession);
    }, 1500);
  };

  const copySecretToClipboard = () => {
    if (!mfaSecret) return;
    navigator.clipboard.writeText(mfaSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const cancelToLogin = () => {
    setStage("login");
    setTempToken(null);
    setTotpCode("");
    setErrorMessage(null);
  };

  return (
    <div id="login-container" className="min-h-screen relative overflow-hidden bg-[#fafcfb] flex flex-col items-center justify-between font-sans p-4">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-brand-50 blur-[130px] -z-10 pointer-events-none opacity-80" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50rem] h-[50rem] rounded-full bg-emerald-50/50 blur-[150px] -z-10 pointer-events-none opacity-80" />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 milanote-grid opacity-[0.35] pointer-events-none" />

      {/* Vertical Spacer */}
      <div className="w-full h-2 hidden sm:block pointer-events-none" />

      {/* Main Container */}
      <div className="w-full flex-1 flex items-center justify-center my-auto z-10 py-6">
        <AnimatePresence mode="wait">
          {!isEnteringApp ? (
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white rounded-2xl border border-gray-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.04)] p-8 relative"
            >
              {/* Header Logo */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 text-brand-600 mb-3 shadow-sm border border-brand-100">
                  <Signature className="w-6 h-6 rotate-6" />
                </div>
                <h1 className="text-2xl font-bold font-display tracking-tight text-gray-900">
                  NoteNext Workspace
                </h1>
                <p className="text-gray-500 text-xs mt-1">
                  Ambiente seguro com verificação em duas etapas (2FA)
                </p>
              </div>

              {/* Feedback Notifications */}
              {errorMessage && (
                <div className="mb-5 p-3.5 bg-red-50/90 rounded-xl border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-5 p-3.5 bg-emerald-50/90 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{successMessage}</span>
                </div>
              )}

              {/* ============================================================ */}
              {/* TELA 1: LOGIN PRINCIPAL (INDIVIDUAL)                         */}
              {/* ============================================================ */}
              {stage === "login" && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Identificação Individual
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-150">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      2FA Obrigatório
                    </span>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1.5">
                        Endereço de E-mail
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          id="login-email-input"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="seu.email@empresa.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-xs font-medium text-gray-700">
                          Senha de Acesso
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setErrorMessage(null);
                            setSuccessMessage(null);
                            setStage("forgot-password");
                          }}
                          className="text-[11px] text-brand-600 hover:text-brand-700 hover:underline cursor-pointer"
                        >
                          Esqueceu a senha?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          id="login-password-input"
                          type={showPassword ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          placeholder="Digite sua senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      id="btn-login-submit"
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Validando credenciais...</span>
                        </>
                      ) : (
                        <>
                          <span>Avançar para Verificação</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Cadastro de nova conta */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Primeiro acesso no sistema?</span>
                    <button
                      id="btn-switch-register"
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setStage("register");
                      }}
                      className="text-brand-600 font-semibold hover:text-brand-700 hover:underline cursor-pointer"
                    >
                      Criar Conta
                    </button>
                  </div>

                  {/* Login Corporativo Microsoft (se configurado) */}
                  {isMsalConfigured && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={handleMicrosoftLogin}
                        disabled={isLoading}
                        className="w-full py-2 px-3 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 23 23">
                          <rect fill="#f35325" width="10.5" height="10.5" />
                          <rect fill="#81bc06" x="12.5" width="10.5" height="10.5" />
                          <rect fill="#05a6f0" y="12.5" width="10.5" height="10.5" />
                          <rect fill="#ffba08" x="12.5" y="12.5" width="10.5" height="10.5" />
                        </svg>
                        <span>Entrar com Microsoft Entra ID</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* TELA 2: CADASTRO DO QR CODE (MFA NO PRIMEIRO LOGIN)          */}
              {/* ============================================================ */}
              {stage === "mfa-setup" && (
                <div id="mfa-setup-view">
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <QrCode className="w-3.5 h-3.5 text-amber-600" />
                      Configuração de Segurança • 1º Login
                    </span>
                    <button
                      type="button"
                      onClick={cancelToLogin}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Voltar
                    </button>
                  </div>

                  <div className="text-center mb-4">
                    <h2 className="text-base font-bold text-gray-900">
                      Vincule seu Aplicativo Autenticador
                    </h2>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      Escaneie o QR Code usando o <strong className="text-gray-700">Google Authenticator</strong> ou <strong className="text-gray-700">Microsoft Authenticator</strong> no seu celular.
                    </p>
                  </div>

                  {/* QR Code Frame */}
                  <div className="flex flex-col items-center justify-center p-3 bg-gray-50 rounded-xl border border-gray-150 mb-4">
                    {qrCodeUrl ? (
                      <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                        <img
                          id="totp-qrcode-image"
                          src={qrCodeUrl}
                          alt="QR Code TOTP 2FA"
                          className="w-48 h-48 block"
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-gray-400 text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Gerando QR Code...
                      </div>
                    )}

                    <div className="mt-2 text-center">
                      <span className="text-[10px] text-gray-500 font-mono">
                        Conta: {mfaEmail}
                      </span>
                    </div>

                    {/* Opção de Visualizar Segredo Manual */}
                    <div className="w-full mt-3 pt-2 border-t border-gray-200/70 text-center">
                      {!showManualSecret ? (
                        <button
                          type="button"
                          onClick={() => setShowManualSecret(true)}
                          className="text-[11px] text-brand-600 hover:underline cursor-pointer"
                        >
                          Não consegue escanear? Digite o segredo manualmente
                        </button>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-gray-500 block">Chave Secreta TOTP (Base32):</span>
                          <div className="flex items-center justify-center gap-1.5">
                            <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 font-mono font-semibold text-gray-800 tracking-wider">
                              {mfaSecret}
                            </code>
                            <button
                              type="button"
                              onClick={copySecretToClipboard}
                              className="p-1 text-gray-500 hover:text-gray-800 rounded bg-white border border-gray-200 cursor-pointer"
                              title="Copiar Chave"
                            >
                              {copiedSecret ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Campo para confirmar o código de 6 dígitos */}
                  <form onSubmit={handleVerifyTotp} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-800 mb-1.5 text-center">
                        Digite o código de 6 dígitos gerado no aplicativo:
                      </label>
                      <input
                        id="totp-setup-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        autoFocus
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                        className="w-full py-2.5 text-center font-mono text-2xl font-bold tracking-[0.4em] bg-white border-2 border-brand-200 rounded-xl focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 text-gray-900 transition-all"
                      />
                    </div>

                    <button
                      id="btn-confirm-mfa-setup"
                      type="submit"
                      disabled={isLoading || totpCode.length !== 6}
                      className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Validando código e ativando 2FA...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Confirmar e Ativar 2FA</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ============================================================ */}
              {/* TELA 3: DIGITAR O CÓDIGO (MFA PARA USUÁRIO JÁ CADASTRADO)    */}
              {/* ============================================================ */}
              {stage === "mfa-verify" && (
                <div id="mfa-verify-view">
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                      Verificação em Duas Etapas
                    </span>
                    <button
                      type="button"
                      onClick={cancelToLogin}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Trocar conta
                    </button>
                  </div>

                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-3 text-blue-600">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h2 className="text-base font-bold text-gray-900">
                      Confirme sua Identidade
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Abra o <strong className="text-gray-700">Google Authenticator</strong> ou <strong className="text-gray-700">Microsoft Authenticator</strong> e informe o código atual para:
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-700 font-mono text-[11px] rounded font-medium">
                      {mfaEmail}
                    </span>
                  </div>

                  <form onSubmit={handleVerifyTotp} className="space-y-4">
                    <div>
                      <input
                        id="totp-verify-input"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        required
                        autoFocus
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                        className="w-full py-3 text-center font-mono text-3xl font-bold tracking-[0.4em] bg-white border-2 border-brand-300 rounded-xl focus:outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 text-gray-900 transition-all shadow-inner"
                      />
                    </div>

                    <button
                      id="btn-verify-totp-submit"
                      type="submit"
                      disabled={isLoading || totpCode.length !== 6}
                      className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Validando acesso...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Validar e Entrar no Workspace</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ============================================================ */}
              {/* TELA 4: REGISTRO DE NOVA CONTA INDIVIDUAL                    */}
              {/* ============================================================ */}
              {stage === "register" && (
                <div id="register-view">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Novo Cadastro
                    </span>
                    <button
                      type="button"
                      onClick={cancelToLogin}
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Já tenho conta
                    </button>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nome Completo
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          id="register-name-input"
                          type="text"
                          required
                          placeholder="Seu nome"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        E-mail
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          id="register-email-input"
                          type="email"
                          required
                          placeholder="seu.email@empresa.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Senha (mínimo 6 caracteres)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          id="register-password-input"
                          type="password"
                          required
                          placeholder="Crie uma senha forte"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Confirmar Senha
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          id="register-confirm-password-input"
                          type="password"
                          required
                          placeholder="Repita a senha"
                          value={regPasswordConfirm}
                          onChange={(e) => setRegPasswordConfirm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    <button
                      id="btn-register-submit"
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Cadastrando...</span>
                        </>
                      ) : (
                        <span>Cadastrar e Configurar 2FA</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* ============================================================ */}
              {/* TELA 5: ESQUECI A SENHA                                      */}
              {/* ============================================================ */}
              {stage === "forgot-password" && (
                <div id="forgot-password-view">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Redefinição de Senha
                    </span>
                    <button
                      type="button"
                      onClick={cancelToLogin}
                      className="text-xs text-brand-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Voltar ao login
                    </button>
                  </div>

                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        E-mail Cadastrado
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          id="forgot-email-input"
                          type="email"
                          required
                          placeholder="seu.email@empresa.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Nova Senha
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          id="forgot-new-password-input"
                          type="password"
                          required
                          placeholder="Digite a nova senha"
                          value={forgotPassword}
                          onChange={(e) => setForgotPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Confirmar Nova Senha
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          id="forgot-confirm-password-input"
                          type="password"
                          required
                          placeholder="Repita a nova senha"
                          value={forgotPasswordConfirm}
                          onChange={(e) => setForgotPasswordConfirm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    <button
                      id="btn-forgot-submit"
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Atualizando...</span>
                        </>
                      ) : (
                        <span>Salvar Nova Senha</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Assinatura LRCriative no rodapé do Card */}
              <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                <span className="text-[11px] text-gray-400">
                  Criado por <strong className="text-gray-600 font-semibold">LRCriative</strong>
                </span>
              </div>
            </motion.div>
          ) : (
            /* Transição visual de entrada ao Workspace após 2FA verificado */
            <motion.div
              key="entering-box"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-10 text-center flex flex-col items-center justify-center"
            >
              <div className="relative mb-6 w-20 h-20">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100 animate-pulse" />
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-600"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="w-9 h-9 text-emerald-600" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-900 mb-1">
                Acesso Seguro Autorizado!
              </h2>
              <p className="text-xs text-gray-500">
                2FA verificado via TOTP. Carregando seu ambiente de trabalho...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rodapé institucional com marca LRCriative */}
      <footer className="w-full py-4 text-center text-xs text-gray-400 border-t border-gray-100/60 bg-white/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>NoteNext Workspace • Gestão Segura de Notas, Ideias e Projetos</span>
          <span>Criado por <strong className="font-semibold text-gray-600">LRCriative</strong></span>
        </div>
      </footer>
    </div>
  );
}
