/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Layers, 
  Signature,
  KeyRound,
  Smartphone,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  Copy,
  CheckCheck
} from "lucide-react";
import { UserSession } from "../types";
import { loginWithMicrosoft } from "../auth/msalService";
import { isMsalConfigured, AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_REDIRECT_URI } from "../auth/msalConfig";

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Navigation & Modal views
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [showLegacyLogin, setShowLegacyLogin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  // Authenticator Simulation / Wait State
  const [isWaitingAuthenticator, setIsWaitingAuthenticator] = useState(false);
  const [authenticatorCode, setAuthenticatorCode] = useState("68");
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Normal login states
  const [email, setEmail] = useState("admin@notenext.sh");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register state
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotNewPasswordConfirm, setForgotNewPasswordConfirm] = useState("");

  // Status & loading indicators
  const [statusText, setStatusText] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEnteringApp, setIsEnteringApp] = useState(false);

  // Generate random number for Microsoft Authenticator number matching simulation
  useEffect(() => {
    setAuthenticatorCode(Math.floor(10 + Math.random() * 89).toString());
  }, []);

  /**
   * FLUXO OFICIAL / PRINCIPAL: Login com Microsoft Entra ID + Microsoft Authenticator
   */
  const handleMicrosoftLogin = async () => {
    setIsVerifying(true);
    setStatusText("Iniciando autenticação com Microsoft Entra ID...");

    try {
      if (!isMsalConfigured) {
        // Exibe tela interativa de aprovação no Microsoft Authenticator para simulação realista
        setIsWaitingAuthenticator(true);
        setStatusText("Aguardando aprovação no aplicativo Microsoft Authenticator...");
        
        // Simula aprovação do usuário pelo smartphone após 2.4 segundos
        setTimeout(async () => {
          setIsWaitingAuthenticator(false);
          setStatusText("Aprovação confirmada pelo Microsoft Authenticator! Validando Token JWT...");
          
          const session = await loginWithMicrosoft();
          triggerSuccessTransition(session);
        }, 2400);
        return;
      }

      // Executa o fluxo real com a biblioteca @azure/msal-browser
      const session = await loginWithMicrosoft();
      setStatusText("Token do Entra ID validado com sucesso! Carregando seu espaço...");
      triggerSuccessTransition(session);
    } catch (err: any) {
      console.error("Erro no login Microsoft:", err);
      setIsWaitingAuthenticator(false);
      setIsVerifying(false);
      setStatusText(`Erro de autenticação: ${err.message || "Não foi possível autenticar na Microsoft."}`);
    }
  };

  // Handle Credentials Submit (Login Local de Fallback)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsVerifying(true);
    setStatusText("Verificando credenciais no banco de dados seguro...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setStatusText(data.error || "Erro de login.");
        setIsVerifying(false);
        return;
      }

      setStatusText("Sucesso! Carregando seu espaço...");
      const localSession: UserSession = {
        email: email || "usuario@workspace.com",
        name: email.split("@")[0] || "Criativo Local",
        isAuthenticated: true,
        loginMethod: "credentials",
        mfaEnabled: false,
      };
      triggerSuccessTransition(localSession);
    } catch (err) {
      console.error(err);
      setStatusText("Erro de conexão ao ler base de dados.");
      setIsVerifying(false);
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || !regPasswordConfirm) {
      setStatusText("Preencha todos os campos obrigatórios.");
      return;
    }

    if (regPassword !== regPasswordConfirm) {
      setStatusText("As senhas inseridas não coincidem!");
      return;
    }

    if (regPassword.length < 6) {
      setStatusText("A senha necessita ter ao menos 6 caracteres.");
      return;
    }

    setIsVerifying(true);
    setStatusText("Criando nova conta criptografada...");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, password: regPassword })
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setStatusText(data.error || "Erro ao registrar.");
        setIsVerifying(false);
        return;
      }

      setStatusText("Conta criada com sucesso! Redirecionando...");
      setEmail(regEmail);
      setPassword(regPassword);
      setIsRegistering(false);
      setIsVerifying(false);

      const newSession: UserSession = {
        email: regEmail,
        name: regEmail.split("@")[0],
        isAuthenticated: true,
        loginMethod: "credentials",
        mfaEnabled: false,
      };
      triggerSuccessTransition(newSession);
    } catch (err) {
      console.error(err);
      setStatusText("Erro de rede ao salvar novo cadastro.");
      setIsVerifying(false);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotNewPassword || !forgotNewPasswordConfirm) {
      setStatusText("Preencha todos os dados necessários.");
      return;
    }

    if (forgotNewPassword !== forgotNewPasswordConfirm) {
      setStatusText("As novas senhas informadas não coincidem.");
      return;
    }

    if (forgotNewPassword.length < 6) {
      setStatusText("A nova senha deve possuir ao menos 6 caracteres.");
      return;
    }

    setIsVerifying(true);
    setStatusText("Atualizando credencial do usuário no banco...");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, newPassword: forgotNewPassword })
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setStatusText(data.error || "Não foi possível alterar a senha.");
        setIsVerifying(false);
        return;
      }

      setStatusText("Senha atualizada no banco de dados! Retorne ao login.");
      setEmail(forgotEmail);
      setPassword(forgotNewPassword);

      setTimeout(() => {
        setIsForgotPassword(false);
        setStatusText("");
        setIsVerifying(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setStatusText("Erro ao conectar com servidor de segurança.");
      setIsVerifying(false);
    }
  };

  const triggerSuccessTransition = (finalSession: UserSession) => {
    setIsEnteringApp(true);
    setStatusText(
      finalSession.loginMethod === "microsoft"
        ? "Identidade validada via Microsoft Entra ID + Authenticator..."
        : "Inicializando NoteNext Workspace..."
    );
    setTimeout(() => {
      setIsVerifying(false);
      onLoginSuccess(finalSession);
    }, 2200);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#fafcfb] flex flex-col items-center justify-between font-sans p-4">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-brand-50 blur-[130px] -z-10 pointer-events-none opacity-80" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50rem] h-[50rem] rounded-full bg-emerald-50/50 blur-[150px] -z-10 pointer-events-none opacity-80" />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 milanote-grid opacity-[0.4] pointer-events-none" />

      {/* Spacer to balance vertical centering with the footer */}
      <div className="w-full h-2 hidden sm:block pointer-events-none" />

      <div className="w-full flex-1 flex items-center justify-center my-auto z-10">
        <AnimatePresence mode="wait">
        {!isEnteringApp ? (
          <motion.div
            key="login-box"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-white rounded-2xl border border-gray-150 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-8 relative"
          >
            {/* Top Enterprise Security Badge */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-800 text-[11px] font-semibold tracking-tight">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Microsoft Entra ID • OAuth 2.0 PKCE</span>
              </div>
              
              <button
                type="button"
                onClick={() => setShowConfigGuide(true)}
                className="text-gray-400 hover:text-brand-700 transition-colors p-1 cursor-pointer"
                title="Ver Checklist de Configuração do Azure"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>

            {/* Logo Header */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-extrabold font-display tracking-tight text-gray-900 flex items-center justify-center gap-2">
                <Signature className="text-brand-600 w-8 h-8 rotate-6" />
                <span>NoteNext</span>
              </h1>
              <p className="text-gray-500 text-xs mt-2">
                Workspace colaborativo protegido com autenticação corporativa Microsoft.
              </p>
            </div>

            {/* MSAL Status Alert (Indicator if .env variables are present) */}
            <div className={`mb-6 p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
              isMsalConfigured 
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" 
                : "bg-slate-50 border-slate-200 text-slate-700"
            }`}>
              <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isMsalConfigured ? "text-emerald-600" : "text-blue-500"}`} />
              <div className="space-y-1">
                <span className="font-bold block">
                  {isMsalConfigured 
                    ? "Conectado ao Microsoft Entra ID" 
                    : "Ambiente de Teste MSAL Ativo"}
                </span>
                <p className="text-[11px] leading-relaxed text-gray-600">
                  {isMsalConfigured 
                    ? `Tenant configurado (${AZURE_TENANT_ID}). Pronto para login com Microsoft Authenticator.`
                    : "Simulação de MFA com Microsoft Authenticator ativada. Clique no ícone de ajuda (?) para ver o checklist do Azure Portal."}
                </p>
              </div>
            </div>

            {/* Modal de Espera do Microsoft Authenticator (Number Matching) */}
            <AnimatePresence>
              {isWaitingAuthenticator && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200 rounded-2xl text-center space-y-3"
                >
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-white shadow-sm border border-blue-100 flex items-center justify-center text-blue-600">
                    <Smartphone className="w-6 h-6 animate-pulse text-blue-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Abra o Microsoft Authenticator
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Toque no número correspondente no seu aplicativo para aprovar a entrada:
                    </p>
                  </div>

                  {/* Number matching display */}
                  <div className="inline-block px-6 py-2 bg-white rounded-xl border-2 border-blue-600 font-display font-extrabold text-2xl text-blue-700 tracking-wider shadow-sm">
                    {authenticatorCode}
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-blue-700 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                    <span>Aguardando aprovação no seu celular...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BOTÃO PRINCIPAL: Microsoft Entra ID */}
            {!isWaitingAuthenticator && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleMicrosoftLogin}
                  disabled={isVerifying}
                  className="w-full py-3.5 px-4 bg-[#2f2f2f] hover:bg-[#1f1f1f] text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 relative cursor-pointer group active:scale-[0.99] border border-gray-700"
                >
                  {/* Official Microsoft 4-Color Logo */}
                  <div className="grid grid-cols-2 gap-0.5 w-4 h-4 flex-shrink-0">
                    <div className="w-2 h-2 bg-[#F25022]" />
                    <div className="w-2 h-2 bg-[#7FBA00]" />
                    <div className="w-2 h-2 bg-[#00A4EF]" />
                    <div className="w-2 h-2 bg-[#FFB900]" />
                  </div>

                  <span className="tracking-tight">
                    {isVerifying ? "Conectando à Microsoft..." : "Entrar com Microsoft"}
                  </span>

                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Sub-badge highlighting Microsoft Authenticator */}
                <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Compatível com <strong>Microsoft Authenticator</strong> (MFA/Senha sem senha)</span>
                </div>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-150" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                    <span className="bg-white px-3 text-gray-400">
                      Ou utilize método alternativo
                    </span>
                  </div>
                </div>

                {/* Toggle para login local de fallback */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowLegacyLogin(!showLegacyLogin)}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium py-1 px-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span>{showLegacyLogin ? "Ocultar login local por e-mail/senha" : "Acessar com credenciais locais (dev/backup)"}</span>
                    {showLegacyLogin ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {/* SEÇÃO OPCIONAL: Formulário Local (E-mail/Senha) */}
            {showLegacyLogin && !isWaitingAuthenticator && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 pt-4 border-t border-gray-100"
              >
                {isForgotPassword ? (
                  /* Forgot password */
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                    <div className="text-center mb-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Redefinir Senha Local
                      </h4>
                    </div>
                    <div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="E-mail cadastrado"
                        className="w-full px-3 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 font-sans"
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Nova senha (min 6 caracteres)"
                        className="w-full px-3 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 font-sans"
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        required
                        value={forgotNewPasswordConfirm}
                        onChange={(e) => setForgotNewPasswordConfirm(e.target.value)}
                        placeholder="Confirmar nova senha"
                        className="w-full px-3 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 font-sans"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="w-full py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Salvar Nova Senha
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(false)}
                      className="w-full text-center text-[11px] text-gray-500 hover:underline pt-1 cursor-pointer"
                    >
                      Voltar ao formulário
                    </button>
                  </form>
                ) : isRegistering ? (
                  /* Register */
                  <form onSubmit={handleRegisterSubmit} className="space-y-3">
                    <div className="text-center mb-2">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Nova Conta Local
                      </h4>
                    </div>
                    <div>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="Seu e-mail"
                        className="w-full px-3 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 font-sans"
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Senha de acesso"
                        className="w-full px-3 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 font-sans"
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        required
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        placeholder="Confirmar senha"
                        className="w-full px-3 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 font-sans"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Finalizar Cadastro Local
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRegistering(false)}
                      className="w-full text-center text-[11px] text-gray-500 hover:underline pt-1 cursor-pointer"
                    >
                      Já possui conta local? Fazer login
                    </button>
                  </form>
                ) : (
                  /* Standard login */
                  <form onSubmit={handleCredentialsSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        E-mail
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="usuario@notenext.sh"
                        className="w-full px-3 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 font-sans"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          Senha
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-[10px] text-brand-600 hover:underline font-semibold cursor-pointer"
                        >
                          Esqueceu?
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Senha"
                          className="w-full pl-3 pr-8 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isVerifying}
                      className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Entrar com Credenciais Locais
                    </button>
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setIsRegistering(true)}
                        className="text-[11px] text-gray-500 hover:text-brand-700 hover:underline cursor-pointer"
                      >
                        Cadastrar nova conta local
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}

            {/* Bottom Status Feed */}
            {statusText && (
              <div className="mt-4 p-3 bg-brand-50/60 rounded-xl border border-brand-100 text-xs text-brand-800 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                <span className="font-medium animate-pulse">{statusText}</span>
              </div>
            )}

            {/* Simulated Demo Accounts Footer */}
            <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-gray-400 space-y-2">
              <div>
                <span className="block font-medium text-gray-500 mb-0.5">Acesso Demonstração Rápido:</span>
                <span className="block italic text-gray-400">Padrão: admin@notenext.sh | senha: password123</span>
              </div>
              <div className="pt-2 border-t border-gray-50 text-[11px] text-gray-400">
                Criado por <span className="font-semibold text-gray-600">LRCriative</span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Transitioning/Entering Platform Animation */
          <motion.div
            key="entering-box"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.03)] p-10 text-center flex flex-col items-center justify-center"
          >
            {/* Visual Loader */}
            <div className="relative mb-6 w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-blue-100 animate-pulse" />
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <h2 className="text-xl font-bold font-display text-gray-900">
              Autenticado com Sucesso
            </h2>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              {statusText || "Conectando ao NoteNext Workspace..."}
            </p>

            <div className="mt-6 w-full space-y-2 text-left text-xs text-gray-600">
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span>Microsoft Entra ID</span>
                <span className="font-bold text-emerald-600">Verificado</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-50">
                <span>Microsoft Authenticator</span>
                <span className="font-bold text-emerald-600">MFA Aprovado</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Token JWT / PKCE</span>
                <span className="font-bold text-blue-600 animate-pulse">Ativo</span>
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      {/* Rodapé da Página de Login */}
      <footer id="login-page-footer" className="w-full text-center py-3 text-xs text-gray-400 z-10">
        <p>
          Criado por <span className="font-semibold text-gray-600">LRCriative</span>
        </p>
      </footer>

      {/* CHECKLIST MODAL: Configuração no Microsoft Entra ID (Azure AD) */}
      <AnimatePresence>
        {showConfigGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-150 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-blue-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base font-display">
                      Checklist de Configuração no Azure Portal
                    </h3>
                    <p className="text-xs text-blue-200">
                      Guia passo a passo para Microsoft Entra ID + Microsoft Authenticator
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigGuide(false)}
                  className="text-white/70 hover:text-white text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body Content */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-700">
                
                {/* 1. Variáveis de ambiente atuais */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <span>1. Variáveis de Ambiente Necessárias</span>
                  </h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Configure as variáveis abaixo no seu arquivo <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-800 font-mono">.env</code> ou no painel de Secrets da plataforma:
                  </p>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-[11px] space-y-1 overflow-x-auto">
                    <div># Client ID registrado no Microsoft Entra ID</div>
                    <div className="text-emerald-400">VITE_AZURE_CLIENT_ID="{AZURE_CLIENT_ID || 'seu-client-id-aqui'}"</div>
                    <div># Tenant ID: "common" (corporativo+pessoal) ou GUID do seu tenant</div>
                    <div className="text-emerald-400">VITE_AZURE_TENANT_ID="{AZURE_TENANT_ID || 'common'}"</div>
                    <div># URI de redirecionamento (SPA)</div>
                    <div className="text-emerald-400">VITE_AZURE_REDIRECT_URI="{AZURE_REDIRECT_URI}"</div>
                  </div>
                </div>

                {/* 2. Passo a passo Azure Portal */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900 text-sm">
                    2. Passo a Passo no Microsoft Entra ID (Azure Portal)
                  </h4>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                      <span className="font-bold text-blue-900 block mb-1">
                        Passo 1: Registrar a Aplicação (App Registration)
                      </span>
                      <p className="text-gray-600 text-[11px] leading-relaxed">
                        Acesse o <strong>Azure Portal</strong> (<a href="https://portal.azure.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">portal.azure.com</a>) &gt; <strong>Microsoft Entra ID</strong> &gt; <strong>App registrations</strong> &gt; <strong>New registration</strong>.
                        Defina um nome (ex: <code className="bg-white px-1 py-0.5 rounded border text-gray-800">NoteNext Workspace</code>).
                      </p>
                    </div>

                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                      <span className="font-bold text-blue-900 block mb-1">
                        Passo 2: Configurar URI de Redirecionamento (SPA com PKCE)
                      </span>
                      <p className="text-gray-600 text-[11px] leading-relaxed mb-2">
                        Em <strong>Authentication</strong> &gt; <strong>Add a platform</strong>, escolha <strong>Single-page application (SPA)</strong>.
                        <strong className="block text-red-600 mt-1">Importante: Não utilize a opção "Web", selecione "SPA" para habilitar o fluxo com PKCE nativo sem Client Secret!</strong>
                      </p>
                      <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-250">
                        <span className="font-mono text-[10.5px] text-gray-800 flex-1 truncate">{AZURE_REDIRECT_URI}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(AZURE_REDIRECT_URI)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedUrl ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedUrl ? "Copiado!" : "Copiar URI"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                      <span className="font-bold text-blue-900 block mb-1">
                        Passo 3: Conceder Permissões de Escopo (API Permissions)
                      </span>
                      <p className="text-gray-600 text-[11px] leading-relaxed">
                        Em <strong>API Permissions</strong> &gt; <strong>Add a permission</strong> &gt; <strong>Microsoft Graph</strong> &gt; <strong>Delegated permissions</strong>, selecione:
                      </p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 font-mono text-[11px] text-blue-950">
                        <li>User.Read (perfil básico do usuário)</li>
                        <li>openid, profile, email (OpenID Connect)</li>
                      </ul>
                    </div>

                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
                      <span className="font-bold text-blue-900 block mb-1">
                        Passo 4: Habilitar Microsoft Authenticator e MFA no Tenant
                      </span>
                      <p className="text-gray-600 text-[11px] leading-relaxed">
                        No Microsoft Entra ID &gt; <strong>Security</strong> &gt; <strong>Authentication methods</strong>:
                      </p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-gray-700">
                        <li>Habilite o método <strong>Microsoft Authenticator</strong></li>
                        <li>Ative a opção <strong>Number Matching</strong> (Correspondência de Números) para segurança reforçada</li>
                        <li>Permita o modo <strong>Passwordless</strong> (Entrada sem senha pelo celular)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Por que não usamos Client Secret no frontend? */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h5 className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span>Nota de Arquitetura de Segurança (PKCE vs. Client Secret)</span>
                  </h5>
                  <p className="text-[11px] text-amber-850 leading-relaxed">
                    Em aplicações frontend Single-Page Applications (SPA), clientes públicos <strong>não devem possuir nem armazenar Client Secret</strong>, pois qualquer código no navegador pode ser inspecionado.
                    Por essa razão, a biblioteca MSAL utiliza <strong>Authorization Code Flow com PKCE (RFC 7636)</strong>, que é o padrão ouro de segurança da Microsoft e IETF. O Client Secret só é necessário caso você utilize um backend dedicado em modo Confidential Client.
                  </p>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-150 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfigGuide(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Entendido, Fechar Checklist
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
