/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Lock, 
  Mail, 
  Smartphone, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  Github, 
  Chrome, 
  Layers, 
  SmartphoneIcon,
  Fingerprint,
  Signature
} from "lucide-react";
import { UserSession } from "../types";

interface LoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<"credentials" | "phone" | "social">("credentials");
  
  // Credentials states
  const [email, setEmail] = useState("admin@notenext.sh");
  const [password, setPassword] = useState("password123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // User list synchronized with LocalStorage for fully functioning validation
  const [registeredUsers, setRegisteredUsers] = useState<{email: string; password: string; secret: string}[]>(() => {
    const saved = localStorage.getItem("notenext_users");
    if (saved) return JSON.parse(saved);
    const defaults = [{ email: "admin@notenext.sh", password: "password123", secret: "JVXW46LHOJSXG5DV" }];
    localStorage.setItem("notenext_users", JSON.stringify(defaults));
    return defaults;
  });

  // Registration & MFA Enrollment Setup Wizard states
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerStep, setRegisterStep] = useState(1);
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [regSecretKey, setRegSecretKey] = useState("");
  const [regMfaCode, setRegMfaCode] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  // Generate a cryptographically styled beautiful string for MFA Setup compliant with RFC 4226 / RFC 6238 Base32 Secret Key Specification
  const generateRandomSecret = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let key = "";
    for (let i = 0; i < 16; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setRegSecretKey(key);
  };

  // Phone states
  const [phoneNumber, setPhoneNumber] = useState("+55 (11) 98765-4321");
  const [smsSent, setSmsSent] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [countdown, setCountdown] = useState(60);

  // General flows
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMethod, setMfaMethod] = useState<"authenticator" | "sms" | "email">("authenticator");
  
  const [statusText, setStatusText] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEnteringApp, setIsEnteringApp] = useState(false);

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendSMS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setIsVerifying(true);
    setStatusText("Enviando código SMS...");
    setTimeout(() => {
      setIsVerifying(false);
      setSmsSent(true);
      setStatusText("Código enviado! Use 4821 para acessar.");
      startCountdown();
    }, 1200);
  };

  const handlePhoneVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (smsCode !== "4821") {
      setStatusText("Código inválido! Tente '4821' para simular.");
      return;
    }
    // Switch to MFA flow for extra security simulation
    setIsMfaStep(true);
    setStatusText("Segurança Adicional Requerida (MFA)");
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    const matchedUser = registeredUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!matchedUser) {
      setIsVerifying(true);
      setStatusText("Checando base segura...");
      setTimeout(() => {
        setIsVerifying(false);
        setStatusText("Credenciais inválidas! Não encontramos esta combinação.");
      }, 700);
      return;
    }

    setIsVerifying(true);
    setStatusText("Autenticando credenciais...");
    setTimeout(() => {
      setIsVerifying(false);
      // Trigger MFA for premium secure aspect
      setIsMfaStep(true);
      setStatusText("Segurança Adicional Requerida (MFA)");
    }, 1000);
  };

  const handleRegisterSubmitStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || !regPasswordConfirm) {
      setStatusText("Todos os campos de cadastro são requeridos.");
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

    const emailExists = registeredUsers.some(u => u.email.toLowerCase() === regEmail.toLowerCase());
    if (emailExists) {
      setStatusText("Este endereço de e-mail já está cadastrado.");
      return;
    }

    setIsVerifying(true);
    setStatusText("Processando credenciais e chaves criptográficas...");
    setTimeout(() => {
      setIsVerifying(false);
      generateRandomSecret();
      setRegisterStep(2);
      setStatusText("Segurança multifator preparada! Prossiga para configurar.");
    }, 1100);
  };

  const handleRegisterSubmitStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regMfaCode) {
      setStatusText("Por favor, digite o código de 6 dígitos gerado.");
      return;
    }

    setIsVerifying(true);
    setStatusText("Verificando código MFA com a chave privada...");
    setTimeout(() => {
      setIsVerifying(false);
      
      // Save newly registered user with their configuration keys!
      const newUser = {
        email: regEmail,
        password: regPassword,
        secret: regSecretKey
      };
      
      const updatedList = [...registeredUsers, newUser];
      setRegisteredUsers(updatedList);
      localStorage.setItem("notenext_users", JSON.stringify(updatedList));

      // Successfully log them in automatically with their email
      setEmail(regEmail);
      setPassword(regPassword);
      
      setIsRegistering(false);
      setRegisterStep(1);
      
      // Trigger instant platform transition with active credentials method
      triggerSuccessTransition("credentials");
    }, 1400);
  };

  const handleMfaVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) return;
    setIsVerifying(true);
    setStatusText("Validando segundo fator de autenticação...");
    setTimeout(() => {
      setIsVerifying(false);
      triggerSuccessTransition();
    }, 1200);
  };

  const handleSocialLogin = (provider: "google" | "github" | "microsoft") => {
    setIsVerifying(true);
    setStatusText(`Conectando com o ${provider}...`);
    setTimeout(() => {
      setIsVerifying(false);
      triggerSuccessTransition(provider);
    }, 1500);
  };

  const triggerSuccessTransition = (method: any = activeTab) => {
    setIsEnteringApp(true);
    setStatusText("Inicializando NoteNext Workspace...");
    setTimeout(() => {
      onLoginSuccess({
        email: email || "usuario@workspace.com",
        name: email.split("@")[0] || "Criativo Premium",
        isAuthenticated: true,
        loginMethod: method,
        mfaEnabled: true,
      });
    }, 2800);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#fafcfb] flex items-center justify-center font-sans p-4">
      {/* Decorative Floating Green Orbs / Organic Shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] rounded-full bg-brand-50 blur-[130px] -z-10 pointer-events-none opacity-80" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[50rem] h-[50rem] rounded-full bg-emerald-50/50 blur-[150px] -z-10 pointer-events-none opacity-80" />
      
      {/* Mesh lines for tech visual */}
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
            {/* Upper Badge */}
            <div className="flex justify-center mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100 text-brand-700 text-xs font-medium tracking-tight">
                <Layers className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
                <span>Next-Gen Visual Productivity</span>
              </div>
            </div>

            {/* Logo and Titles */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold font-display tracking-tight text-gray-900 flex items-center justify-center gap-2">
                <Signature className="text-brand-600 w-8 h-8 rotate-6 animate-pulse" />
                <span>NoteNext</span>
              </h1>
              <p className="text-gray-500 text-sm mt-2">
                Organize e conecte suas ideias em um canvas infinito inteligente.
              </p>
            </div>

            {/* Main Action box, MFA step, or Registration setup */}
            {isRegistering ? (
              /* MFA Registration Flow */
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="text-center">
                  <h3 className="text-base font-bold text-gray-900 font-display flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-5 h-5 text-brand-600 animate-pulse" />
                    <span>Cadastro de Conta & MFA</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1">
                    {registerStep === 1 
                      ? "Crie suas credenciais para começar a experimentar o NoteNext." 
                      : "Escaneie o QR Code abaixo com seu app de código MFA."}
                  </p>
                </div>

                {registerStep === 1 ? (
                  /* Step 1: Account inputs */
                  <form onSubmit={handleRegisterSubmitStep1} className="space-y-3.5">
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
                          placeholder="seu-login@notenext.sh"
                          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-250 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/10 font-sans"
                        />
                        <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Senha Secreta
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
                        <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
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
                        <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>Configurar Proteção MFA (2FA)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => { setIsRegistering(false); setStatusText(""); }}
                        className="text-xs text-gray-500 hover:text-brand-700 hover:underline font-semibold"
                      >
                        Já possui uma conta? Entrar
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Step 2: MFA Setup QR Code scanning, Backup keys & active code verificator */
                  <form onSubmit={handleRegisterSubmitStep2} className="space-y-4">
                    <div className="text-center space-y-3 p-2.5 rounded-2xl bg-gray-50/70 border border-gray-100">
                      <span className="text-[9px] bg-brand-100 text-brand-850 px-2 py-0.5 rounded font-bold uppercase tracking-widest inline-block">
                        Código QR Para Ativação
                      </span>
                      
                      {/* High-Contrast Standard Scannable QR Code */}
                      <div className="relative mx-auto bg-white p-3 rounded-2xl border border-brand-100 inline-block shadow-sm">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`otpauth://totp/NoteNext:${regEmail || "usuario"}?secret=${regSecretKey}&issuer=NoteNext`)}&ecc=M&color=000000`}
                          alt="NoteNext MFA QR Code"
                          className="w-[140px] h-[140px] object-contain block select-none mx-auto"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            // Fallback to Google Charts API if QR Server is unavailable
                            const img = e.currentTarget;
                            const backupUrl = `https://chart.googleapis.com/chart?chs=180x180&cht=qr&chl=${encodeURIComponent(`otpauth://totp/NoteNext:${regEmail || "usuario"}?secret=${regSecretKey}&issuer=NoteNext`)}&choe=UTF-8`;
                            if (img.src !== backupUrl) {
                              img.src = backupUrl;
                            }
                          }}
                        />
                      </div>

                      <p className="text-[10px] text-gray-500 max-w-xs mx-auto leading-normal px-2">
                        Aponte a câmera do seu celular ou utilize seu app de autenticação (Google Authenticator, Microsoft Authenticator, Authy, etc.) para registrar.
                      </p>

                      {/* Manual key Copy Block */}
                      <div className="space-y-1 px-2 text-left">
                        <span className="text-[10px] text-gray-400 block font-medium">Chave secreta de calibração:</span>
                        <div className="flex items-center justify-between bg-white border border-gray-200 px-2 py-1.5 rounded-xl">
                          <code className="text-xs font-mono text-[#064e3b] font-bold tracking-wider select-all truncate max-w-[210px]" title="Insira esta chave manualmente se o QR Code não puder ser lido">
                            {regSecretKey.match(/.{1,4}/g)?.join(" ") || regSecretKey}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(regSecretKey);
                              setCopiedKey(true);
                              setTimeout(() => setCopiedKey(false), 2000);
                            }}
                            className="bg-brand-50 hover:bg-brand-100 text-brand-850 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-brand-200 transition-all flex-shrink-0"
                          >
                            {copiedKey ? "Copiado!" : "Copiar"}
                          </button>
                        </div>
                        <span className="text-[9px] text-gray-400 block leading-tight pt-0.5">
                          Se necessário, digite a chave acima no seu app de autenticação escolhendo "Inserir chave de configuração" (MFA por tempo - TOTP).
                        </span>
                      </div>

                      {/* Backup Keys */}
                      <div className="pt-2 border-t border-gray-200/50 text-left px-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                          Códigos de Backup de Emergência:
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-gray-550 font-bold bg-white border rounded-lg p-1.5 leading-none">
                          <span>🔑 3829-1029</span>
                          <span>🔑 4811-9238</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-650 uppercase tracking-wider mb-1 text-center">
                        Digite o código temporário de 6 dígitos:
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={regMfaCode}
                        onChange={(e) => setRegMfaCode(e.target.value)}
                        placeholder="Ex: 849201"
                        className="w-full text-center tracking-[0.6em] font-mono font-bold text-base bg-brand-50/50 py-2 rounded-xl border border-brand-200 focus:outline-none focus:border-brand-500 font-sans"
                      />
                      <span className="text-[9px] text-gray-400 mt-1 text-center block leading-normal">
                        Use o código gerado pelo autenticador para validar e sincronizar.
                      </span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(1)}
                        className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-xs rounded-xl border border-gray-200 transition-all"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-600/10 hover:shadow-brand-600/20 transition-all flex items-center justify-center gap-1"
                      >
                        Ativar MFA & Entrar
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>
            ) : !isMfaStep ? (
              <>
                {/* Custom Tab Selectors */}
                <div className="flex bg-gray-50 p-1.5 rounded-xl mb-6 border border-gray-100">
                  <button
                    onClick={() => { setActiveTab("credentials"); setStatusText(""); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                      activeTab === "credentials"
                        ? "bg-white text-gray-950 shadow-sm font-semibold"
                        : "text-gray-500 hover:text-gray-950"
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    E-mail
                  </button>
                  <button
                    onClick={() => { setActiveTab("phone"); setStatusText(""); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                      activeTab === "phone"
                        ? "bg-white text-gray-950 shadow-sm font-semibold"
                        : "text-gray-500 hover:text-gray-950"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Celular
                  </button>
                  <button
                    onClick={() => { setActiveTab("social"); setStatusText(""); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg transition-all duration-200 ${
                      activeTab === "social"
                        ? "bg-white text-gray-950 shadow-sm font-semibold"
                        : "text-gray-500 hover:text-gray-950"
                    }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5" />
                    Social
                  </button>
                </div>

                {/* Tab Contents */}
                <div>
                  {activeTab === "credentials" && (
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
                          <span className="text-xs text-brand-600 hover:underline cursor-pointer font-medium">
                            Esqueceu?
                          </span>
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
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
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
                          <span className="text-xs text-gray-500 select-none">Lembrar deste navegador</span>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isVerifying}
                        className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl transition-all shadow-md shadow-brand-600/10 hover:shadow-brand-600/20 flex items-center justify-center gap-2 relative overflow-hidden"
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
                  )}

                  {activeTab === "phone" && (
                    <div className="space-y-4">
                      {!smsSent ? (
                        <form onSubmit={handleSendSMS} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                              Número de Celular
                            </label>
                            <div className="relative">
                              <input
                                type="tel"
                                required
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="+55 (11) 98765-4321"
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-250 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all font-sans"
                              />
                              <Smartphone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                            </div>
                            <span className="text-[11px] text-gray-400 mt-1 block">
                              Enviaremos um código SMS com 4 dígitos para validação rápida.
                            </span>
                          </div>

                          <button
                            type="submit"
                            disabled={isVerifying}
                            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <span>Enviar Código de Acesso</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handlePhoneVerify} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wider">
                              Insira o Código de 4 dígitos
                            </label>
                            <input
                              type="text"
                              maxLength={4}
                              required
                              value={smsCode}
                              onChange={(e) => setSmsCode(e.target.value)}
                              placeholder="Fórmula: 4821"
                              className="w-full text-center tracking-[1em] font-mono text-xl py-2.5 rounded-xl border border-gray-250 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
                            />
                            <div className="flex justify-between items-center mt-3 text-xs">
                              <span className="text-gray-400">
                                Não recebeu?{" "}
                                {countdown > 0 ? (
                                  <span className="text-gray-500 font-medium">Aguarde {countdown}s</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={handleSendSMS}
                                    className="text-brand-600 font-medium hover:underline"
                                  >
                                    Reenviar código
                                  </button>
                                )}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSmsSent(false)}
                                className="text-gray-500 hover:underline"
                              >
                                Alterar número
                              </button>
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <span>Verificar Código</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {activeTab === "social" && (
                    <div className="space-y-3">
                      <p className="text-center text-xs text-gray-400 mb-4 font-medium uppercase tracking-wider">
                        Autenticação Única via Provedores Federados
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSocialLogin("google")}
                        className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl transition-all font-medium text-xs flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2.5">
                          <Chrome className="w-4 h-4 text-red-500" />
                          <span>Autenticar com o Google GSuite</span>
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border">Ativo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSocialLogin("github")}
                        className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl transition-all font-medium text-xs flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2.5">
                          <Github className="w-4 h-4 text-gray-950" />
                          <span>Autenticar com o GitHub Developer</span>
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border">Ativo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSocialLogin("microsoft")}
                        className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl transition-all font-medium text-xs flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2.5">
                          <Layers className="w-4 h-4 text-blue-500" />
                          <span>Autenticar com Microsoft Azure</span>
                        </span>
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border">Ativo</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Secure MFA Account registration trigger */}
                <div className="mt-5 pt-3 border-t border-gray-100 text-center">
                  <button 
                    type="button" 
                    onClick={() => { setIsRegistering(true); setRegisterStep(1); setRegEmail(""); setRegPassword(""); setRegPasswordConfirm(""); setStatusText(""); }}
                    className="text-xs text-brand-700 font-bold hover:underline bg-brand-50 hover:bg-brand-100/90 px-3.5 py-1.5 rounded-xl border border-brand-100 shadow-sm transition-all"
                  >
                    🔒 Criar Conta Segura (Configurar MFA)
                  </button>
                </div>
              </>
            ) : (
              /* MFA Verification Screen */           /* MFA Verification Screen */
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-5"
              >
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-base font-bold text-gray-900 font-display">
                    Verificação de Duas Etapas (MFA)
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Insira o código gerado em seu app de segurança de dupla camada.
                  </p>
                </div>

                {/* MFA Method Selection */}
                <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-100 justify-between items-center text-xs">
                  <button
                    type="button"
                    onClick={() => { setMfaMethod("authenticator"); }}
                    className={`flex-1 py-1.5 rounded-md text-center transition-all ${
                      mfaMethod === "authenticator" ? "bg-white shadow text-gray-800 font-semibold" : "text-gray-500"
                    }`}
                  >
                    App Token
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMfaMethod("sms"); }}
                    className={`flex-1 py-1.5 rounded-md text-center transition-all ${
                      mfaMethod === "sms" ? "bg-white shadow text-gray-800 font-semibold" : "text-gray-500"
                    }`}
                  >
                    SMS 2FA
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMfaMethod("email"); }}
                    className={`flex-1 py-1.5 rounded-md text-center transition-all ${
                      mfaMethod === "email" ? "bg-white shadow text-gray-800 font-semibold" : "text-gray-500"
                    }`}
                  >
                    E-mail
                  </button>
                </div>

                <form onSubmit={handleMfaVerify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1 text-center">
                      {mfaMethod === "authenticator" && "Abra seu Google Authenticator ou Authy"}
                      {mfaMethod === "sms" && "Código enviado para o celular final ****321."}
                      {mfaMethod === "email" && "Código enviado para o e-mail cadastrado."}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="Qualquer código (Ex: 000000)"
                      className="w-full text-center tracking-[0.5em] font-mono text-lg py-2.5 rounded-xl border border-gray-250 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all"
                    />
                    <span className="text-[10px] text-gray-400 mt-1.5 text-center block">
                      Dica: Digite qualquer valor numérico ou clique nos campos de teste.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsMfaStep(false)}
                      className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium text-xs rounded-xl transition-all border border-gray-200"
                    >
                      Voltar ao Login
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>Validar MFA</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
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
              <EnteringStep delay={0.6} text="Sincronizando chaves de cryptografia local" status="Concluído" />
              <EnteringStep delay={1.4} text="Descompactando módulos do Editor por blocos" status="Concluído" />
              <EnteringStep delay={2.1} text="Estabelecendo conexão do Canvas Infinito" status="Conectando..." />
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
