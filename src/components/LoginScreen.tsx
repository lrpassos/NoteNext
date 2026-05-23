/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  Layers, 
  Signature,
  KeyRound
} from "lucide-react";
import { UserSession } from "../types";

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Navigation views
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

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

  // Handle Credentials Submit (Login)
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
      setTimeout(() => {
        setIsVerifying(false);
        triggerSuccessTransition();
      }, 800);
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
    setStatusText("Registrando credenciais no banco de dados...");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, password: regPassword })
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setStatusText(data.error || "Erro ao registrar usuário.");
        setIsVerifying(false);
        return;
      }

      setStatusText("Cadastro efetuado com sucesso! Fazendo login...");
      setEmail(regEmail);
      setPassword(regPassword);
      setIsRegistering(false);
      setIsVerifying(false);

      // Transition to space automatic login sequence
      setTimeout(() => {
        setIsVerifying(true);
        triggerSuccessTransition();
      }, 500);
    } catch (err) {
      console.error(err);
      setStatusText("Erro de rede ao salvar novo cadastro.");
      setIsVerifying(false);
    }
  };

  // Handle Reset/Forgot Password Submit
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotNewPassword || !forgotNewPasswordConfirm) {
      setStatusText("Preencha todos os campos do formulário.");
      return;
    }

    if (forgotNewPassword !== forgotNewPasswordConfirm) {
      setStatusText("As senhas inseridas não coincidem!");
      return;
    }

    if (forgotNewPassword.length < 6) {
      setStatusText("Sua nova senha deve conter pelo menos 6 caracteres.");
      return;
    }

    setIsVerifying(true);
    setStatusText("Pesquisando cadastro e redefinindo senha...");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, newPassword: forgotNewPassword })
      });
      const data = await response.json();

      if (!response.ok || data.error) {
        setStatusText(data.error || "Erro ao redefinir a senha.");
        setIsVerifying(false);
        return;
      }

      setStatusText("Senha atualizada no banco de dados! Retorne ao login.");
      // Pre-fill fields for them
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

  const triggerSuccessTransition = () => {
    setIsEnteringApp(true);
    setStatusText("Inicializando NoteNext Workspace...");
    setTimeout(() => {
      onLoginSuccess({
        email: email || "usuario@workspace.com",
        name: email.split("@")[0] || "Criativo Premium",
        isAuthenticated: true,
        loginMethod: "credentials",
        mfaEnabled: false,
      });
    }, 2800);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#fafcfb] flex items-center justify-center font-sans p-4">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-brand-50 blur-[130px] -z-10 pointer-events-none opacity-80" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50rem] h-[50rem] rounded-full bg-emerald-50/50 blur-[150px] -z-10 pointer-events-none opacity-80" />
      
      {/* Grid Overlay */}
      <div className="absolute inset-0 milanote-grid opacity-[0.4] pointer-events-none" />

      <AnimatePresence mode="wait">
        {!isEnteringApp ? (
          <motion.div
            key="login-box"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] p-8 relative"
          >
            {/* Top Badge */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-medium tracking-tight">
                <Layers className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
                <span>Next-Gen Visual Productivity</span>
              </div>
            </div>

            {/* Logo Header */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 flex items-center justify-center gap-2">
                <Signature className="text-brand-600 w-8 h-8 rotate-6 animate-pulse" />
                <span>NoteNext</span>
              </h1>
              <p className="text-gray-500 text-sm mt-2">
                Organize e conecte suas ideias em um canvas infinito inteligente.
              </p>
            </div>

            {/* Forms Container */}
            {isForgotPassword ? (
              /* Forgot password redefinition form */
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <h3 className="text-base font-bold text-gray-900 font-display flex items-center justify-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-brand-600" />
                    <span>Redefinir Senha de Acesso</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Informe seu e-mail cadastrado e digite a nova senha desejada.
                  </p>
                </div>

                <form onSubmit={handleForgotPasswordSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      E-mail Cadastrado
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="seu-email@notenext.sh"
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 font-sans"
                      />
                      <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Nova Senha Secreta
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="No mínimo 6 caracteres"
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 font-sans"
                      />
                      <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Confirmar Nova Senha
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={forgotNewPasswordConfirm}
                        onChange={(e) => setForgotNewPasswordConfirm(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 font-sans"
                      />
                      <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <span>Confirmar Redefinição</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setIsForgotPassword(false); setStatusText(""); }}
                      className="text-xs text-gray-500 hover:text-brand-700 hover:underline font-semibold"
                    >
                      Voltar para Tela de Login
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : isRegistering ? (
              /* User Registration Form */
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center mb-4">
                  <h3 className="text-base font-bold text-gray-900 font-display flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-5 h-5 text-brand-600" />
                    <span>Cadastro de Nova Conta</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Insira seus dados para salvar sua conta permanente no banco de dados.
                  </p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Endereço de E-mail
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="exemplo@notenext.sh"
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 font-sans"
                      />
                      <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Senha de Acesso
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="No mínimo 6 caracteres"
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 font-sans"
                      />
                      <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Confirmar Senha
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={regPasswordConfirm}
                        onChange={(e) => setRegPasswordConfirm(e.target.value)}
                        placeholder="Repita sua senha acima"
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 font-sans"
                      />
                      <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <span>Finalizar Cadastro</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setIsRegistering(false); setStatusText(""); }}
                      className="text-xs text-gray-500 hover:text-brand-700 hover:underline font-semibold"
                    >
                      Já possui uma conta? Realizar Login
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              /* Standard login form with Email and Password only */
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                      Endereço de E-mail
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemplo@notenext.sh"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-250 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all font-sans"
                      />
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Senha de Acesso
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setForgotEmail(email);
                          setStatusText("");
                        }}
                        className="text-xs text-brand-600 hover:underline hover:text-brand-850 cursor-pointer font-bold"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Sua senha secreta"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-250 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all font-sans"
                      />
                      <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 border-gray-300"
                      />
                      <span className="text-xs text-gray-500 select-none">Lembrar neste navegador</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-brand-600/10 hover:shadow-brand-600/20 flex items-center justify-center gap-2 relative overflow-hidden cursor-pointer"
                  >
                    {isVerifying ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"></span>
                      </span>
                    ) : (
                      <>
                        <span>Entrar no NoteNext</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Account registration trigger */}
                <div className="mt-5 pt-3 border-t border-gray-100 text-center">
                  <button 
                    type="button" 
                    onClick={() => { setIsRegistering(true); setRegEmail(""); setRegPassword(""); setRegPasswordConfirm(""); setStatusText(""); }}
                    className="text-xs text-brand-700 font-bold hover:underline bg-brand-50 hover:bg-brand-100/90 px-3.5 py-1.5 rounded-xl border border-brand-100 shadow-sm transition-all cursor-pointer"
                  >
                    🔒 Criar Conta no Banco de Dados
                  </button>
                </div>
              </motion.div>
            )}

            {/* Bottom Status Feed */}
            {statusText && (
              <div className="mt-4 p-3 bg-brand-50/50 rounded-xl border border-brand-100/40 text-xs text-brand-800 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                <span className="font-medium animate-pulse">{statusText}</span>
              </div>
            )}

            {/* Simulated Demo Accounts Footer */}
            <div className="mt-6 pt-5 border-t border-gray-100 text-center text-xs text-gray-400">
              <span className="block font-medium mb-1">Acesso Demonstração Rápido:</span>
              <span className="block italic text-gray-400">Padrão: admin@notenext.sh | senha: password123</span>
            </div>
          </motion.div>
        ) : (
          /* Transitioning/Entering Platform Animation (Fluid Premium Loading Screen) */
          <motion.div
            key="entering-box"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white/60 backdrop-blur-md rounded-2xl border border-gray-50 shadow-[0_12px_40px_rgba(0,0,0,0.015)] p-12 text-center flex flex-col items-center justify-center"
          >
            {/* Visual Node Connection Loader */}
            <div className="relative mb-8 w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-brand-100 animate-pulse" />
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-600"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Layers className="w-8 h-8 text-brand-600 animate-bounce" />
              </div>

              {/* Connecting orbit particles */}
              <div className="absolute left-[-10px] top-[40%] w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
              <div className="absolute right-[5px] top-[10%] w-2 h-2 rounded-full bg-teal-500" />
              <div className="absolute bottom-[5px] right-[40%] w-2.5 h-2.5 rounded-full bg-green-300" />
            </div>

            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold font-display tracking-tight text-gray-900"
            >
              Autenticado com Sucesso
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-gray-500 text-sm mt-2 max-w-xs"
            >
              {statusText || "Conectando ao núcleo decentralizado do NoteNext..."}
            </motion.p>

            {/* Premium Loading Steps */}
            <div className="mt-8 space-y-2.5 w-full max-w-xs text-left">
              <EnteringStep delay={0.6} text="Sincronizando banco de dados de usuários" status="Concluído" />
              <EnteringStep delay={1.4} text="Acessando segurança e criptografia local" status="Concluído" />
              <EnteringStep delay={2.1} text="Estabelecendo conexão com o Canvas Infinito" status="Conectando..." />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact row helper for loading steps
interface EnteringStepProps {
  delay: number;
  text: string;
  status: string;
}

function EnteringStep({ delay, text, status }: EnteringStepProps) {
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  React.useEffect(() => {
    const actTimeout = setTimeout(() => setActive(true), delay * 1000);
    const doneTimeout = setTimeout(() => setDone(true), (delay * 1000) + 700);
    return () => {
      clearTimeout(actTimeout);
      clearTimeout(doneTimeout);
    };
  }, [delay]);

  if (!active) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex justify-between items-center text-xs py-1.5 border-b border-gray-50"
    >
      <span className="text-gray-600 font-medium">{text}</span>
      <span className={`font-semibold ${done ? "text-emerald-600" : "text-brand-500 animate-pulse"}`}>
        {done ? "OK" : status}
      </span>
    </motion.div>
  );
}
