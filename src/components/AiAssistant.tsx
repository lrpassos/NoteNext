/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Sparkles, 
  ChevronRight, 
  X, 
  Send, 
  Clipboard, 
  Check, 
  Lightbulb, 
  FileText, 
  ListOrdered,
  RefreshCw,
  Zap,
  Bot
} from "lucide-react";
import { WorkspaceItem, WorkspaceType } from "../types";

interface AiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentItem: WorkspaceItem | null;
  onApplyAiOutput: (text: string) => void;
}

export default function AiAssistant({
  isOpen,
  onClose,
  currentItem,
  onApplyAiOutput
}: AiAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<{ sender: "user" | "ai"; text: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastResponse, setLastResponse] = useState("");

  if (!isOpen) return null;

  // Extract text from the current workspace to send as context to Gemini
  const getContextString = () => {
    if (!currentItem) return "Sem contexto ativo.";
    
    let context = `Nome do Espaço: ${currentItem.title}\nTipo: ${currentItem.type}\n`;
    if (currentItem.type === WorkspaceType.NOTION_DOC && currentItem.blocks) {
      context += "Conteúdo dos Blocos:\n";
      context += currentItem.blocks.map(b => `[${b.type}] ${b.content}`).join("\n");
    } else if (currentItem.type === WorkspaceType.MILANOTE_CANVAS && currentItem.elements) {
      context += "Elementos no Canvas:\n";
      context += currentItem.elements.map(el => `[Card ${el.type}] ${el.title}: ${el.content}`).join("\n");
    } else if (currentItem.type === WorkspaceType.KEEP_NOTES && currentItem.notes) {
      context += "Coleção de Notas:\n";
      context += currentItem.notes.map(n => `[Nota] Título: ${n.title} - Conteúdo: ${n.content} (${n.checklist.map(c=>c.text).join(",")})`).join("\n");
    }
    return context;
  };

  const handleSendPrompt = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) return;

    if (!customPrompt) {
      setChatHistory(prev => [...prev, { sender: "user", text: finalPrompt }]);
      setPrompt("");
    }

    setIsLoading(true);
    try {
      const workspaceContext = getContextString();
      const systemInstruction = 
        "Você é o NoteNext IA, um copiloto SaaS de produtividade visual elegante inspirado no Notion, Google Keep e Milanote.\n" +
        "Seja extremamente objetivo, minimalista, cortês e escreva respostas bem estruturadas em português brasileiro.\n" +
        "Ajude no brainstorming, organização livre de ideias, resumos inteligentes e estruturação por blocos.\n" +
        "Use espaçamentos limpos e evite termos extremamente longos ou robóticos.";

      const fullPromptWithContext = 
        `Contexto do Usuário Atual:\n=== CONTINENTE WORKSPACE ===\n${workspaceContext}\n============================\n\n` +
        `Solicitação de Ação: ${finalPrompt}`;

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: fullPromptWithContext, 
          systemInstruction 
        })
      });

      const data = await response.json();
      if (response.ok) {
        const textOut = data.text || "Desculpe, o assistente gerou uma resposta vaga.";
        setChatHistory(prev => [...prev, { sender: "ai", text: textOut }]);
        setLastResponse(textOut);
      } else {
        const errMsg = data.error || "Ocorreu um erro ao chamar a inteligência artificial.";
        setChatHistory(prev => [...prev, { sender: "ai", text: `Erro: ${errMsg}` }]);
      }
    } catch (err: any) {
      setChatHistory(prev => [...prev, { sender: "ai", text: `Erro de Conexão: ${err.message || 'Falha de comunicação.'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (actionType: "summarize" | "ideas" | "title" | "fix") => {
    let actionPrompt = "";
    switch (actionType) {
      case "summarize":
        actionPrompt = "Crie um resumo inteligente, com pontos-chave acionáveis, baseando-se em nosso contexto de workspace.";
        break;
      case "ideas":
        actionPrompt = "Escreva 5 ideias criativas extraordinárias de brainstorming complementares para expandir o conteúdo atual.";
        break;
      case "title":
        actionPrompt = "Sugira 3 títulos alternativos atraentes e impactantes no estilo de startups modernas para esse projeto.";
        break;
      case "fix":
        actionPrompt = "Revise gramática, concordância e sugira melhorias na organização textual.";
        break;
    }
    setChatHistory(prev => [...prev, { sender: "user", text: actionPrompt }]);
    handleSendPrompt(actionPrompt);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-80 bg-white border-l border-[#eaf2ed] h-screen flex flex-col font-sans relative z-30 shadow-[0_-4px_30px_rgba(0,0,0,0.015)]">
      
      {/* Header bar */}
      <div className="p-4 border-b border-[#eaf2ed] flex items-center justify-between bg-[#fafdfb]">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand-600 animate-pulse" />
          <h3 className="text-xs font-bold font-display uppercase tracking-widest text-[#064e3b]">
            NoteNext IA Co-pilot
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick context actions card list */}
      <div className="p-3 border-b border-[#f0f5f2] bg-gray-50/40 space-y-2">
        <span className="text-[9px] font-bold text-gray-450 uppercase tracking-widest block px-1">
          Ações Contextuais de IA
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => handleQuickAction("summarize")}
            className="p-2 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 text-left rounded-lg text-[10px] text-gray-700 transition-all flex items-center gap-2"
          >
            <FileText className="w-3 h-3 text-brand-600 flex-shrink-0" />
            <span className="font-semibold truncate">Resumir Meta</span>
          </button>
          <button
            onClick={() => handleQuickAction("ideas")}
            className="p-2 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 text-left rounded-lg text-[10px] text-gray-700 transition-all flex items-center gap-2"
          >
            <Lightbulb className="w-3 h-3 text-brand-600 flex-shrink-0" />
            <span className="font-semibold truncate">Idéias Extra</span>
          </button>
          <button
            onClick={() => handleQuickAction("title")}
            className="p-2 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 text-left rounded-lg text-[10px] text-gray-700 transition-all flex items-center gap-2"
          >
            <Zap className="w-3 h-3 text-brand-600 flex-shrink-0" />
            <span className="font-semibold truncate">Títulos Premium</span>
          </button>
          <button
            onClick={() => handleQuickAction("fix")}
            className="p-2 bg-white hover:bg-brand-50 border border-gray-200 hover:border-brand-300 text-left rounded-lg text-[10px] text-gray-700 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3 text-brand-600 flex-shrink-0" />
            <span className="font-semibold truncate">Polir Texto</span>
          </button>
        </div>
      </div>

      {/* Prompt Response Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-3.5">
            <div className="w-10 h-10 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto text-brand-600">
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-800">Assistente Inteligente Ativo</h4>
              <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                NoteNext IA analisa de forma integrada seus blocos Notion, cards Keep e conexões Milanote para sugerir novos insights sem necessidade de chaves extras!
              </p>
            </div>
          </div>
        ) : (
          chatHistory.map((chat, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${chat.sender === "user" ? "items-end" : "items-start"}`}
            >
              <span className="text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                {chat.sender === "user" ? "Sua Solicitação" : "NoteNext Inteligência"}
              </span>
              <div
                className={`p-3 rounded-xl text-xs leading-relaxed max-w-[90%] font-sans whitespace-pre-line ${
                  chat.sender === "user"
                    ? "bg-gray-100 text-gray-800"
                    : "bg-brand-50 border border-brand-100/40 text-brand-950 font-medium"
                }`}
              >
                {chat.text}

                {/* Apply/Copy indicators left inside AI block */}
                {chat.sender === "ai" && !chat.text.startsWith("Erro") && (
                  <div className="mt-3.5 pt-2.5 border-t border-brand-100/40 flex items-center gap-2 justify-end">
                    <button
                      onClick={() => copyToClipboard(chat.text)}
                      className="px-2 py-0.5 bg-white border border-brand-200 hover:border-brand-500 rounded text-[9px] font-semibold text-brand-900 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Clipboard className="w-2.5 h-2.5" />}
                      <span>Copiar</span>
                    </button>
                    <button
                      onClick={() => onApplyAiOutput(chat.text)}
                      className="px-2 py-0.5 bg-brand-600 hover:bg-brand-700 text-white rounded text-[9px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                      title="Aplicar saída no editor atual"
                    >
                      <Check className="w-2.5 h-2.5" />
                      <span>Injetar</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Global Loading sparkles indicator */}
        {isLoading && (
          <div className="flex flex-col items-start animate-pulse">
            <span className="text-[9px] font-bold text-gray-400 mb-1 tracking-wider uppercase">NoteNext IA</span>
            <div className="p-3.5 bg-brand-50 border border-brand-100/40 rounded-xl text-xs text-brand-900 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-spin" />
              <span className="font-medium">Processando com Giga Gemini...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input container footer */}
      <div className="p-3 border-t border-[#eaf2ed] bg-gray-50/50">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendPrompt();
              }
            }}
            placeholder="Pergunte ao NoteNext IA..."
            className="w-full bg-white pl-3 pr-10 py-2.5 text-xs rounded-xl border border-gray-250 focus:outline-none focus:border-brand-550 transition-all font-sans resize-none h-14"
          />
          <button
            onClick={() => handleSendPrompt()}
            disabled={isLoading || !prompt.trim()}
            className="absolute right-2.5 bottom-2.5 w-7 h-7 rounded-lg bg-brand-600 hover:bg-brand-700 text-white disabled:bg-gray-100 disabled:text-gray-400 flex items-center justify-center transition-all cursor-pointer shadow-sm shadow-brand-500/10"
            title="Enviar Prompt"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>

    </aside>
  );
}
