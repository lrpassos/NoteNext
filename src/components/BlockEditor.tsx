/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  AlignLeft, 
  Heading1, 
  Heading2, 
  Square, 
  CheckSquare, 
  Code, 
  List, 
  Sparkles,
  Command,
  PlusCircle,
  HelpCircle,
  Image,
  Table as TableIcon,
  Video,
  FileSpreadsheet
} from "lucide-react";
import { EditorBlock, BlockType, WorkspaceItem } from "../types";

/**
 * @description Document workspace block-level editor (Notion style workspace).
 * Serves authentication, auto-save status indicators, and Gemini AI blocks.
 * Maintains state variables and rich text parsing rules.
 */
interface BlockEditorProps {
  item: WorkspaceItem;
  onChangeItem: (updatedItem: WorkspaceItem) => void;
  onTriggerAi: (prompt: string, blockIndex: number) => void;
  isAiLoading: boolean;
  onOpenNotebook?: () => void;
  onValidateTitle?: (itemId: string, title: string) => string;
}

export default function BlockEditor({
  item,
  onChangeItem,
  onTriggerAi,
  isAiLoading,
  onOpenNotebook,
  onValidateTitle
}: BlockEditorProps) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(item.blocks || []);
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null);
  const [slashMenuIndex, setSlashMenuIndex] = useState<number | null>(null);
  const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });
  const blockInputRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setBlocks(item.blocks || []);
  }, [item.id, item.blocks]);

  const updateParent = (newBlocks: EditorBlock[]) => {
    onChangeItem({
      ...item,
      blocks: newBlocks,
      updatedAt: new Date().toISOString()
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChangeItem({
      ...item,
      title: e.target.value,
      updatedAt: new Date().toISOString()
    });
  };

  const handleBlockChange = (index: number, content: string) => {
    const updated = [...blocks];
    updated[index].content = content;
    setBlocks(updated);
    updateParent(updated);

    // Watch for slash command trigger
    if (content.endsWith("/")) {
      setSlashMenuIndex(index);
      // Roughly place the menu
      const rect = blockInputRefs.current[index]?.getBoundingClientRect();
      if (rect) {
        setCursorPosition({
          top: rect.bottom + window.scrollY - 100, // safety offset
          left: rect.left + window.scrollX + 20
        });
      }
    } else if (slashMenuIndex === index && !content.includes("/")) {
      setSlashMenuIndex(null);
    }
  };

  const setBlockType = (index: number, type: BlockType) => {
    const updated = [...blocks];
    updated[index].type = type;
    // Strip the slash of the content if any
    if (updated[index].content.endsWith("/")) {
      updated[index].content = updated[index].content.slice(0, -1);
    }
    setBlocks(updated);
    updateParent(updated);
    setSlashMenuIndex(null);
  };

  const addBlock = (index: number) => {
    const newBlock: EditorBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type: "paragraph",
      content: ""
    };
    const updated = [...blocks];
    updated.splice(index + 1, 0, newBlock);
    setBlocks(updated);
    updateParent(updated);
    setTimeout(() => {
      blockInputRefs.current[index + 1]?.focus();
    }, 50);
  };

  const deleteBlock = (index: number) => {
    if (blocks.length <= 1) {
      // Keep at least one empty block
      const updated = [{ id: blocks[0].id, type: "paragraph" as BlockType, content: "" }];
      setBlocks(updated);
      updateParent(updated);
      return;
    }
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated);
    updateParent(updated);
    const focusTarget = index > 0 ? index - 1 : 0;
    setTimeout(() => {
      blockInputRefs.current[focusTarget]?.focus();
    }, 50);
  };

  const toggleTodo = (index: number) => {
    const updated = [...blocks];
    if (updated[index].type === "todo") {
      updated[index].checked = !updated[index].checked;
      setBlocks(updated);
      updateParent(updated);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addBlock(index);
    } else if (e.key === "Backspace" && blocks[index].content === "") {
      e.preventDefault();
      deleteBlock(index);
    }
  };

  // Pre-configured templates to populate empty spaces with premium styling
  const insertMockSnippet = (style: string) => {
    let mockBlocks: EditorBlock[] = [];
    if (style === "mural") {
      mockBlocks = [
        { id: "1", type: "h1", content: "Mural de Referência: Design Minimalista 2026" },
        { id: "2", type: "paragraph", content: "Este espaço Notion se integra à nossa paleta de verde moderno e branco clean. Use este painel para documentar as metas principais da semana." },
        { id: "3", type: "h2", content: "Etapas Essenciais" },
        { id: "4", type: "todo", content: "Revisar as margens de visualização nos dispositivos móveis", checked: true },
        { id: "5", type: "todo", content: "Calibrar os cinzas suaves e contrastes no backend", checked: false },
        { id: "6", type: "code", content: "const theme = {\n  primary: '#10b981',\n  background: '#ffffff',\n  glass: 'rgba(255, 255, 255, 0.85)'\n};" }
      ];
    } else if (style === "ideias") {
      mockBlocks = [
        { id: "10", type: "h1", content: "Brainstorming: Nova Feature SaaS" },
        { id: "11", type: "h2", content: "Idéias Levantadas" },
        { id: "12", type: "list", content: "Criar atalho rápido para resumos inteligentes por voz." },
        { id: "13", type: "list", content: "Importador direto do Notion via iframe sandbox." },
        { id: "14", type: "paragraph", content: "Solicite ajuda de nossa IA no menu abaixo inserindo sua premissa." }
      ];
    }
    setBlocks(mockBlocks);
    updateParent(mockBlocks);
  };

  return (
    <div className="flex-1 bg-white overflow-y-auto h-screen relative flex flex-col font-sans">
      
      {/* Upper Navigation / Document Stats Bar */}
      <div className="px-8 py-4 border-b border-[#f0f5f2] flex justify-between items-center bg-[#fafdfb]">
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Workspace Documento
          </span>
          
          {/* Botão Caderno Inteligente */}
          <button
            type="button"
            id="central-notebook-btn"
            onClick={onOpenNotebook}
            className="ml-4 px-3 py-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-[11px] rounded-xl flex items-center gap-1.5 shadow-sm shadow-brand-600/10 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <BookOpen className="w-3.5 h-3.5 text-white" />
            <span>Caderno Inteligente</span>
          </button>
        </div>

      </div>

      {/* Actual Notion Editor Canvas Area */}
      <div className="max-w-3xl w-full mx-auto px-8 lg:px-14 py-10 flex-1">
        
        {/* Creative Title Input */}
        <input
          type="text"
          value={item.title}
          onChange={handleTitleChange}
          onBlur={(e) => {
            const val = e.target.value.trim();
            if (!val) return;
            if (onValidateTitle) {
              const checkedTitle = onValidateTitle(item.id, val);
              if (checkedTitle.toLowerCase() !== val.toLowerCase()) {
                alert(`O nome de workspace "${val}" já está em uso nesta plataforma. Ajustado para "${checkedTitle}".`);
                onChangeItem({
                  ...item,
                  title: checkedTitle,
                  updatedAt: new Date().toISOString()
                });
              }
            }
          }}
          placeholder="Documento Sem Título"
          className="w-full text-4xl lg:text-5xl font-extrabold font-display text-gray-900 border-none outline-none pb-4 mb-8 border-b border-gray-100 focus:border-brand-200 transition-all placeholder-gray-200"
        />

        {/* Empty State Templates options */}
        {blocks.length === 0 || (blocks.length === 1 && blocks[0].content === "") ? (
          <div className="mb-8 p-6 bg-[#fafcfb] border border-[#eaf3ee] rounded-xl text-center">
            <span className="text-xs font-semibold text-gray-600 block mb-3">
              Gostaria de carregar um layout modelo?
            </span>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => insertMockSnippet("mural")}
                className="px-3 py-1.5 bg-white border border-gray-200 hover:border-brand-500 text-[11px] font-medium rounded-lg text-gray-700 hover:text-brand-800 transition-all"
              >
                Planejador de Projetos
              </button>
              <button
                onClick={() => insertMockSnippet("ideias")}
                className="px-3 py-1.5 bg-white border border-gray-200 hover:border-brand-500 text-[11px] font-medium rounded-lg text-gray-700 hover:text-brand-800 transition-all"
              >
                Painel de Idéias
              </button>
            </div>
          </div>
        ) : null}

        {/* Dynamic Blocks Map */}
        <div className="space-y-3 relative pb-24">
          {blocks.map((block, index) => (
            <div
              key={block.id}
              className="group flex items-start gap-2.5 relative left-[-24px] px-6 py-1 hover:bg-[#fafdfb] rounded-lg transition-all"
              onMouseEnter={() => setActiveBlockIndex(index)}
              onMouseLeave={() => setActiveBlockIndex(null)}
            >
              {/* Drag/Plus block panel indicators left */}
              <div 
                className={`flex items-center gap-1 mt-1 transition-all duration-150 ${
                  activeBlockIndex === index ? "opacity-100" : "opacity-0"
                }`}
              >
                <button
                  onClick={() => addBlock(index)}
                  title="Novo bloco abaixo"
                  className="w-5 h-5 rounded hover:bg-gray-100 text-gray-400 hover:text-brand-650 flex items-center justify-center transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteBlock(index)}
                  title="Deletar este bloco"
                  className="w-5 h-5 rounded hover:bg-red-50 text-gray-400 hover:text-red-650 flex items-center justify-center transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Editable Block Node Custom Styling */}
              <div className="flex-1 min-w-0">
                {block.type === "h1" && (
                  <input
                    type="text"
                    value={block.content}
                    ref={(el) => { blockInputRefs.current[index] = el as any; }}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="Título 1"
                    className="w-full text-2xl lg:text-3xl font-bold font-display text-gray-900 border-none outline-none focus:ring-0 placeholder-gray-200"
                  />
                )}

                {block.type === "h2" && (
                  <input
                    type="text"
                    value={block.content}
                    ref={(el) => { blockInputRefs.current[index] = el as any; }}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="Título 2"
                    className="w-full text-xl font-bold font-display text-gray-800 border-none outline-none focus:ring-0 placeholder-gray-200"
                  />
                )}

                {block.type === "paragraph" && (
                  <input
                    type="text"
                    value={block.content}
                    ref={(el) => { blockInputRefs.current[index] = el as any; }}
                    onChange={(e) => handleBlockChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    placeholder="Digite seu texto, ou digite '/' para comandos..."
                    className="w-full text-sm font-sans text-gray-650 leading-relaxed border-none outline-none focus:ring-0 placeholder-gray-300"
                  />
                )}

                {block.type === "todo" && (
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => toggleTodo(index)}
                      className="text-brand-650 hover:scale-105 transition-transform flex-shrink-0"
                    >
                      {block.checked ? (
                        <CheckSquare className="w-4 h-4 text-brand-600 fill-brand-50" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={block.content}
                      ref={(el) => { blockInputRefs.current[index] = el as any; }}
                      onChange={(e) => handleBlockChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder="Elemento checklist"
                      className={`w-full text-sm font-sans border-none outline-none focus:ring-0 placeholder-gray-300 ${
                        block.checked ? "line-through text-gray-400 italic" : "text-gray-700"
                      }`}
                    />
                  </div>
                )}

                {block.type === "code" && (
                  <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl font-mono text-xs text-brand-900 relative">
                    <div className="absolute right-3 top-3 text-[10px] text-gray-400">Code region</div>
                    <textarea
                      value={block.content}
                      onChange={(e) => handleBlockChange(index, e.target.value)}
                      placeholder="const val = 'Code';"
                      className="w-full bg-transparent border-none outline-none focus:ring-0 font-mono text-xs pr-12 min-h-[60px]"
                    />
                  </div>
                )}

                {block.type === "list" && (
                  <div className="flex items-start gap-2">
                    <span className="text-brand-500 font-extrabold select-none mt-1">•</span>
                    <input
                      type="text"
                      value={block.content}
                      ref={(el) => { blockInputRefs.current[index] = el as any; }}
                      onChange={(e) => handleBlockChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      placeholder="Item com marcador"
                      className="w-full text-sm font-sans text-gray-700 border-none outline-none focus:ring-0 placeholder-gray-300"
                    />
                  </div>
                )}

                {/* 
                  SISTEMA DE EDITOR DE BLOCOS:
                  Bloco de Imagem com pré-visualização e suporte a links externos.
                */}
                {block.type === "image" && (
                  <div className="space-y-2 p-3 bg-gray-50/70 border border-gray-150 rounded-xl">
                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-gray-400">
                      <Image className="w-3 h-3 text-brand-600" />
                      <span>Bloco de Imagem</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Cole a URL externa de uma imagem ou fotografia..." 
                      value={block.content}
                      onChange={(e) => handleBlockChange(index, e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-brand-500 rounded-lg px-2.5 py-1 text-xs outline-none"
                    />
                    {block.content && (
                      <div className="relative rounded-lg overflow-hidden border border-gray-100 shadow-sm max-w-lg">
                        <img 
                          src={block.content} 
                          alt="Visual render" 
                          referrerPolicy="no-referrer"
                          className="w-full max-h-60 object-cover block"
                          onError={(e) => { 
                            e.currentTarget.src = "https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=300&q=80"; 
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 
                  SISTEMA DE EDITOR DE BLOCOS:
                  Tabela modular interativa para anotações organizadas por células.
                */}
                {block.type === "table" && (
                  <div className="space-y-2.5 p-3 bg-gray-50/70 border border-gray-150 rounded-xl overflow-x-auto text-xs">
                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-gray-400">
                      <TableIcon className="w-3.5 h-3.5 text-[#064e3b]" />
                      <span>Tabela Dinâmica</span>
                    </div>
                    <table className="min-w-full border-collapse border border-gray-200 bg-white">
                      <tbody>
                        {(block.rows || [["Cabeçalho 1", "Cabeçalho 2"], ["Célula 1", "Célula 2"]]).map((row, rIdx) => (
                          <tr key={rIdx}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="border border-gray-200 p-1 bg-white">
                                <input 
                                  type="text" 
                                  value={cell} 
                                  onChange={(e) => {
                                    const defaultRows = block.rows || [["Cabeçalho 1", "Cabeçalho 2"], ["Célula 1", "Célula 2"]];
                                    const updatedRows = [...defaultRows];
                                    updatedRows[rIdx][cIdx] = e.target.value;
                                    const updated = [...blocks];
                                    updated[index].rows = updatedRows;
                                    setBlocks(updated);
                                    updateParent(updated);
                                  }}
                                  className="w-full bg-transparent border-none outline-none font-sans text-xs focus:ring-0 p-0 text-gray-750"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => {
                          const defaultRows = block.rows || [["Cabeçalho 1", "Cabeçalho 2"], ["Célula 1", "Célula 2"]];
                          const newRow = Array(defaultRows[0].length).fill("");
                          const updatedRows = [...defaultRows, newRow];
                          const updated = [...blocks];
                          updated[index].rows = updatedRows;
                          setBlocks(updated);
                          updateParent(updated);
                        }}
                        className="bg-white border text-[10px] font-bold px-2 py-0.5 rounded-md hover:bg-gray-100 text-gray-600"
                      >
                        + Adicionar Linha
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          const defaultRows = block.rows || [["Cabeçalho 1", "Cabeçalho 2"], ["Célula 1", "Célula 2"]];
                          const updatedRows = defaultRows.map(row => [...row, ""]);
                          const updated = [...blocks];
                          updated[index].rows = updatedRows;
                          setBlocks(updated);
                          updateParent(updated);
                        }}
                        className="bg-white border text-[10px] font-bold px-2 py-0.5 rounded-md hover:bg-gray-100 text-gray-600"
                      >
                        + Adicionar Coluna
                      </button>
                    </div>
                  </div>
                )}

                {/* 
                  SISTEMA DE EDITOR DE BLOCOS:
                  Visualização de vídeos externos (Youtube, Vimeo, etc.) integrados ao espaço.
                */}
                {block.type === "video" && (
                  <div className="space-y-2 p-3 bg-gray-50/70 border border-gray-150 rounded-xl">
                    <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-gray-400">
                      <Video className="w-3.5 h-3.5 text-blue-600" />
                      <span>Módulo de Vídeo</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Cole URL do YouTube (Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ)..." 
                      value={block.content}
                      onChange={(e) => handleBlockChange(index, e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-brand-500 rounded-lg px-2.5 py-1 text-xs outline-none"
                    />
                    {block.content && (
                      <div className="relative pt-[56.25%] bg-black rounded-lg overflow-hidden border">
                        <iframe 
                          className="absolute inset-0 w-full h-full border-none"
                          src={block.content.includes("watch?v=") ? `https://www.youtube.com/embed/${block.content.split("v=")[1]}` : block.content}
                          title="Embedded Video player"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 
                  SISTEMA DE INTEGRAÇÃO IA GEMINI:
                  Prompt inteligente que gera conteúdos ou brainstorming e injeta no fluxo.
                */}
                {block.type === "ia" && (
                  <div className="space-y-2.5 p-3 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-brand-500/10 rounded-xl">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-brand-850 uppercase tracking-widest">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
                      <span>Perguntar à IA Copiloto</span>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Ex: Crie um parágrafo resumindo as vantagens do modelo assíncrono..." 
                        value={block.content}
                        onChange={(e) => handleBlockChange(index, e.target.value)}
                        className="flex-1 bg-white border border-gray-250 focus:border-brand-500 rounded-xl px-2.5 py-1 text-xs outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => onTriggerAi(`Gere um texto rico e refinado baseado no seguinte prompt: ${block.content}`, index)}
                        disabled={isAiLoading}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-1 px-3 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        {isAiLoading ? "Pensando..." : "Gerar com IA"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 
                  SISTEMA DE CADERNO INTELIGENTE:
                  Portão inline para folhear cadernos, organizar ideias ou tarefas em mídias.
                */}
                {block.type === "notebook" && (
                  <div className="p-4 bg-[#fbfdfc] border border-brand-100 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-[#eaf3ee] pb-2">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-brand-600" />
                        <span className="text-[10px] font-black text-[#064e3b] uppercase tracking-wider">Módulo de Caderno Integrado</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={onOpenNotebook}
                        className="text-[10px] font-bold text-[#064e3b] hover:bg-brand-100 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg transition-all"
                      >
                        Abrir Páginas Organizadas ↗
                      </button>
                    </div>
                    <p className="text-[11px] text-gray-500 leading-normal">
                      Páginas inteligentes de escopo Notion/OneNote. Crie múltiplas folhas, checklists, ordene, e faça rascunhos de alta fidelidade.
                    </p>
                    <div className="bg-white p-3 rounded-xl border border-gray-150 grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-600">
                      <span>📖 Folhas no Caderno: {item.notebookPages?.length || 0}</span>
                      <span className="text-emerald-700">✓ Auto Save Ativo</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI prompt quick-trigger floating menu on right hover */}
              {activeBlockIndex === index && block.content.trim().length > 3 && (
                <button
                  onClick={() => onTriggerAi(`Expanda e formate nobremente essa idéia sobre: ${block.content}`, index)}
                  disabled={isAiLoading}
                  className="w-6 h-6 rounded-full bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-600 hover:text-white flex items-center justify-center transition-all flex-shrink-0 animate-fade-in"
                  title="Melhorar com NoteNext AI"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Floating Keyboard Help Shortcut Banner */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-full px-5 py-2 text-[11px] font-semibold flex items-center gap-3.5 shadow-lg border border-gray-800 z-10 select-none">
        <div className="flex items-center gap-1.5">
          <Command className="w-3 h-3 text-brand-400" />
          <span>Atalhos do Teclado:</span>
        </div>
        <kbd className="bg-gray-800 text-gray-350 px-1.5 py-0.5 rounded text-[9px]">Enter</kbd>
        <span className="text-gray-500">Novo bloco</span>
        <kbd className="bg-gray-800 text-gray-350 px-1.5 py-0.5 rounded text-[9px]">/</kbd>
        <span className="text-gray-500">Comandos formatar</span>
      </div>

      {/* Notion-style Slash command popup menu */}
      {slashMenuIndex !== null && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setSlashMenuIndex(null)}
          />
          <div
            style={{ 
              position: "fixed", 
              top: `${cursorPosition.top}px`, 
              left: `${cursorPosition.left}px` 
            }}
            className="w-64 bg-white rounded-2xl border border-gray-150 shadow-2xl py-2 z-50 text-xs font-sans max-h-80 overflow-y-auto animate-fade-in-up"
          >
            <div className="px-3.5 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2 mb-1 flex items-center justify-between">
              <span>Inserir Bloco</span>
              <span>“/”</span>
            </div>

            {/* 1. Texto Normal */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "paragraph")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700"
            >
              <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600">
                <AlignLeft className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none">Texto Normal</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Comece a digitar seu texto</span>
              </div>
            </button>

            {/* 2. Título Principal */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "h1")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-gray-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Heading1 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none">Título Principal</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Título grande h1</span>
              </div>
            </button>

            {/* 3. Subtítulo Secundário */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "h2")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-gray-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Heading2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none">Subtítulo Secundário</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Subtítulo médio h2</span>
              </div>
            </button>

            {/* 4. Lista de Tarefas */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "todo")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-gray-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none">Lista de Tarefas (Checklist)</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Checklist interativo de metas</span>
              </div>
            </button>

            {/* 5. Imagem */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "image")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-gray-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <Image className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none">Imagem Externa</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Cole link ou anexe fotografia</span>
              </div>
            </button>

            {/* 6. Tabela Dinâmica */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "table")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-gray-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                <TableIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none">Tabela Dinâmica</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Crie colunas e linhas editáveis</span>
              </div>
            </button>

            {/* 7. Bloco de Código */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "code")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-gray-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-750">
                <Code className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none">Bloco de Código</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Terminal de script ou programação</span>
              </div>
            </button>

            {/* 8. Vídeo */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "video")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-gray-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-[#eff6ff] flex items-center justify-center text-blue-650">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none">Vídeo Incorporado</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Video Player Youtube ou Vimeo</span>
              </div>
            </button>

            {/* 9. Marcadores */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "list")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-gray-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                <List className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none">Marcadores (Bullets)</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Lista de itens marcados</span>
              </div>
            </button>

            {/* 10. IA Copiloto */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "ia")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-gray-50/50"
            >
              <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none">Bloco Copiloto Gemini IA</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Pergunte à IA e gere rascunhos</span>
              </div>
            </button>

            {/* 11. Caderno Inteligente */}
            <button
              onClick={() => setBlockType(slashMenuIndex, "notebook")}
              className="w-full px-3.5 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-gray-700 border-t border-[#eaf3ee]"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-850">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold block leading-none text-[#064e3b]">Caderno Inteligente</span>
                <span className="text-[9px] text-gray-400 block mt-0.5">Páginas multi-folhas reais</span>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
