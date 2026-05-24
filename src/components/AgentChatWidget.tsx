/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Bot, Send, X, Sparkles, Copy, Check, MessageSquare } from "lucide-react";
import { GeminiAgent } from "../types";

interface AgentChatWidgetProps {
  agents: GeminiAgent[];
}

interface ChatMessage {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: string;
}

export default function AgentChatWidget({ agents }: AgentChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find active agent
  const activeAgent = agents.find((a) => a.isActive) || agents[0];

  // Logic to determine if feminine name
  const isAgentFeminine = (agentName: string) => {
    const nameLower = agentName.toLowerCase().trim();
    return (
      nameLower.endsWith("a") ||
      nameLower === "júlia" ||
      nameLower === "julia" ||
      nameLower === "camila" ||
      nameLower === "ana" ||
      nameLower.startsWith("dra.")
    );
  };

  const isFeminine = activeAgent ? isAgentFeminine(activeAgent.name) : false;

  // Set background and highlights colors
  const mainColorClass = isFeminine ? "bg-[#ec4899]" : "bg-[#2563eb]";
  const hoverColorClass = isFeminine ? "hover:bg-[#db2777]" : "hover:bg-[#1d4ed8]";
  const bannerColorClass = isFeminine ? "from-pink-500 to-rose-600" : "from-blue-600 to-indigo-700";
  const glowShadowClass = isFeminine ? "shadow-pink-300/40" : "shadow-blue-300/40";
  const ringColorClass = isFeminine ? "focus:ring-pink-300" : "focus:ring-blue-300";
  const textColorClass = isFeminine ? "text-pink-650" : "text-blue-650";
  const lightBgClass = isFeminine ? "bg-pink-50" : "bg-blue-50";

  // When active agent changes, reset/initialize messages
  useEffect(() => {
    if (!activeAgent) return;
    
    // Welcome message specific to agent personality
    let welcomeText = `Olá! Sou o ${activeAgent.name}, seu assistente inteligente. Como posso ajudar você hoje com suas tarefas criativas?`;
    if (activeAgent.name.toLowerCase().includes("heitor")) {
      welcomeText = `Olá! Sou o Heitor, seu Copywriter Pro. O que deseja criar de fascinante, altamente persuasivo e transformador hoje?`;
    } else if (activeAgent.name.toLowerCase().includes("júlia") || activeAgent.name.toLowerCase().includes("julia")) {
      welcomeText = `Olá! Sou a Júlia, sua Engenheira de Software. Me apresente seus desafios em TypeScript, algoritmos, ou arquitetura e vamos resolvê-los com precisão corporativa.`;
    }

    setMessages([
      {
        id: "welcome",
        sender: "agent",
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  }, [activeAgent?.id]);

  // Auto scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const prompt = inputVal.trim();
    if (!prompt || isLoading || !activeAgent) return;

    // Add user message to history
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          systemInstruction: `${activeAgent.systemInstruction}. Seu nome é ${activeAgent.name} e atua como ${activeAgent.role}. Responda de forma completa, instrutiva e elegante.`,
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        text: data.text || "Desculpe, não consegui processar a resposta.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "agent",
        text: "Houve um problema ao conectar com o servidor da IA. Certifique-se de que a GEMINI_API_KEY está configurada adequadamente no painel de Segredos (Secrets).",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Suggestion helpers based on agent
  const suggestions = activeAgent?.name.toLowerCase().includes("heitor")
    ? ["Criar slogan para SaaS", "Copywriter de Post", "Email de vendas elegante"]
    : ["Explicar loop re-render", "Função TypeScript limpa", "Revisar código de API"];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Gemini-styled inquiry window panel */}
      {isOpen && (
        <div className="mb-4 w-[420px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[85vh] bg-white rounded-2xl border border-gray-150 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className={`p-4 bg-gradient-to-r ${bannerColorClass} text-white flex items-center justify-between`}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 animate-pulse">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm font-sans tracking-wide">{activeAgent?.name || "Agente Inteligente"}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-ping" />
                  <span className="text-[10px] bg-white/25 border border-white/10 px-1.5 py-0.2 rounded font-mono font-bold leading-none uppercase">
                    ONLINE
                  </span>
                </div>
                <span className="text-[10px] text-white/80 block font-light leading-none pt-0.5">{activeAgent?.role || "Consultor Pro"}</span>
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/90 hover:text-white transition-all cursor-pointer"
              title="Fechar chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages view list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div key={msg.id} className={`flex gap-2 w-full ${isUser ? "justify-end animate-in fade-in-50 duration-200" : "justify-start"}`}>
                  {!isUser && (
                    <div className={`w-7 h-7 rounded-lg ${lightBgClass} border border-gray-150 flex items-center justify-center flex-shrink-0`}>
                      <Sparkles className={`w-3.5 h-3.5 ${textColorClass}`} />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] rounded-2xl p-3 shadow-3xs ${
                    isUser 
                      ? "bg-gray-850 text-white rounded-tr-xs" 
                      : "bg-white border border-gray-200 text-gray-800 rounded-tl-xs"
                    }`}
                  >
                    <p className="text-xs font-sans leading-relaxed whitespace-pre-wrap select-text">{msg.text}</p>
                    
                    <div className={`flex items-center justify-between mt-1 pt-1.5 border-t ${isUser ? "border-white/15 text-white/60" : "border-gray-150 text-gray-400"}`}>
                      <span className="text-[9px] font-mono">{msg.timestamp}</span>
                      {!isUser && msg.id !== "welcome" && (
                        <button
                          onClick={() => copyToClipboard(msg.text, msg.id)}
                          className="flex items-center gap-1 text-[9px] hover:text-brand-700 font-semibold"
                          title="Copiar resposta"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600 font-extrabold">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Typing loading indicator */}
            {isLoading && (
              <div className="flex gap-2 w-full justify-start animate-pulse">
                <div className={`w-7 h-7 rounded-lg ${lightBgClass} border border-transparent flex items-center justify-center flex-shrink-0`}>
                  <Sparkles className={`w-3.5 h-3.5 ${textColorClass} animate-spin`} />
                </div>
                <div className="bg-white border border-gray-150 rounded-2xl p-3.5 shadow-3xs text-gray-450 text-xs font-medium rounded-tl-xs flex items-center gap-2">
                  <div className="flex space-x-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-225" />
                  </div>
                  <span>{activeAgent?.name} está redigindo...</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestion Helpers */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-white flex flex-wrap gap-1.5">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputVal(sug);
                  }}
                  className="text-[10px] bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-650 font-medium px-2.5 py-1 rounded-full transition-all cursor-pointer shadow-3xs shrink-0"
                >
                  💡 {sug}
                </button>
              ))}
            </div>
          )}

          {/* Form input bottom bar */}
          <form onSubmit={handleSend} className="p-3 border-t border-gray-150 bg-white flex items-center gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={`Pergunte algo para ${activeAgent?.name || "o agente"}...`}
              disabled={isLoading}
              className={`flex-1 text-xs bg-gray-50 hover:bg-gray-100/70 border border-gray-200 max-h-12 rounded-xl px-3.5 py-2.5 outline-none font-sans ring-2 ring-transparent ${ringColorClass} focus:bg-white transition-all`}
            />
            
            <button
              type="submit"
              disabled={!inputVal.trim() || isLoading}
              className={`p-2.5 rounded-xl text-white transition-all cursor-pointer shadow-md flex items-center justify-center ${
                inputVal.trim() && !isLoading ? `${mainColorClass} hover:scale-105 active:scale-95` : "bg-gray-250 text-gray-400 cursor-not-allowed"
              }`}
              title="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          
        </div>
      )}

      {/* Primary gorgeous active Robot Floating Button */}
      {activeAgent && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl ${mainColorClass} ${hoverColorClass} text-white transition-all transform hover:-translate-y-1 active:translate-y-0 cursor-pointer group select-none ${glowShadowClass} border border-white/10`}
          title={`Agente Ativo: ${activeAgent.name}`}
          id="assistant-floating-robot-trigger"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white animate-bounce-short" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-450 border-2 border-white rounded-full" />
          </div>
          
          <div className="flex flex-col text-left font-sans">
            <span className="text-[10px] text-white/70 font-bold tracking-widest leading-none uppercase">IA Ativa</span>
            <span className="text-xs font-black leading-none pt-0.5">{activeAgent.name}</span>
          </div>
        </button>
      )}

    </div>
  );
}
