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
  HelpCircle
} from "lucide-react";
import { EditorBlock, BlockType, WorkspaceItem } from "../types";

interface BlockEditorProps {
  item: WorkspaceItem;
  onChangeItem: (updatedItem: WorkspaceItem) => void;
  onTriggerAi: (prompt: string, blockIndex: number) => void;
  isAiLoading: boolean;
}

export default function BlockEditor({
  item,
  onChangeItem,
  onTriggerAi,
  isAiLoading
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
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Workspace Documento
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-brand-700 bg-brand-50 border border-brand-100 font-semibold px-2 py-0.5 rounded-full">
            Salvamento Automático Ativo
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        </div>
      </div>

      {/* Actual Notion Editor Canvas Area */}
      <div className="max-w-3xl w-full mx-auto px-8 lg:px-14 py-10 flex-1">
        
        {/* Creative Title Input */}
        <input
          type="text"
          value={item.title}
          onChange={handleTitleChange}
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
            className="w-60 bg-white rounded-xl border border-gray-150 shadow-2xl py-1.5 z-50 text-xs font-sans max-h-60 overflow-y-auto animate-fade-in-up"
          >
            <div className="px-3 py-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-1.5 mb-1 flex items-center justify-between">
              <span>Formatação em Bloco</span>
              <span>“/”</span>
            </div>

            <button
              onClick={() => setBlockType(slashMenuIndex, "paragraph")}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700"
            >
              <div className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center text-gray-600">
                <AlignLeft className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold block leading-tight">Texto Normal</span>
                <span className="text-[9.5px] text-gray-400 block mt-0.5">Comece a digitar seu texto</span>
              </div>
            </button>

            <button
              onClick={() => setBlockType(slashMenuIndex, "h1")}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700 border-t border-gray-50"
            >
              <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                <Heading1 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold block leading-tight">Título Principal</span>
                <span className="text-[9.5px] text-gray-400 block mt-0.5">Título tamanho grande h1</span>
              </div>
            </button>

            <button
              onClick={() => setBlockType(slashMenuIndex, "h2")}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700 border-t border-gray-50"
            >
              <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Heading2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold block leading-tight">Subtítulo Secundário</span>
                <span className="text-[9.5px] text-gray-400 block mt-0.5">Subtítulo médio h2</span>
              </div>
            </button>

            <button
              onClick={() => setBlockType(slashMenuIndex, "todo")}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700 border-t border-gray-50"
            >
              <div className="w-6 h-6 rounded bg-emerald-50 flex items-center justify-center text-emerald-600">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold block leading-tight">Lista de Tarefas</span>
                <span className="text-[9.5px] text-gray-400 block mt-0.5">Checklist interativo de meta</span>
              </div>
            </button>

            <button
              onClick={() => setBlockType(slashMenuIndex, "code")}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700 border-t border-gray-50"
            >
              <div className="w-6 h-6 rounded bg-red-50 flex items-center justify-center text-red-600">
                <Code className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold block leading-tight">Bloco de Código</span>
                <span className="text-[9.5px] text-gray-400 block mt-0.5">Janela de script terminal</span>
              </div>
            </button>

            <button
              onClick={() => setBlockType(slashMenuIndex, "list")}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 text-gray-700 border-t border-gray-50"
            >
              <div className="w-6 h-6 rounded bg-amber-50 flex items-center justify-center text-amber-600">
                <List className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold block leading-tight">Marcadores</span>
                <span className="text-[9.5px] text-gray-400 block mt-0.5">Lista com bullet points</span>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
