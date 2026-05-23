/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Copy, 
  Move, 
  CheckSquare, 
  Square, 
  Image, 
  Tag, 
  X, 
  FileText, 
  ChevronUp, 
  ChevronDown,
  RefreshCw,
  Sparkles,
  Sliders
} from "lucide-react";
import { NotebookPage, WorkspaceItem, WorkspaceType } from "../types";

interface SmartNotebookProps {
  isOpen: boolean;
  onClose: () => void;
  currentItem: WorkspaceItem;
  workspaces: WorkspaceItem[];
  onChangeItem: (updatedItem: WorkspaceItem) => void;
  onChangeAllItems: (updatedItems: WorkspaceItem[]) => void;
  onTriggerAi?: (prompt: string, context: string) => void;
}

export default function SmartNotebook({
  isOpen,
  onClose,
  currentItem,
  workspaces,
  onChangeItem,
  onChangeAllItems,
  onTriggerAi
}: SmartNotebookProps) {
  // Extract or initialize notebook pages
  const [pages, setPages] = useState<NotebookPage[]>(currentItem.notebookPages || []);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [newChecklistText, setNewChecklistText] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showMoveDropdown, setShowMoveDropdown] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>("Todos");

  // Autocomplete auto-save notice state
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    setPages(currentItem.notebookPages || []);
    if ((currentItem.notebookPages || []).length > 0 && !activePageId) {
      setActivePageId(currentItem.notebookPages![0].id);
    }
  }, [currentItem.id, currentItem.notebookPages]);

  // Synchronize and Auto-save helper
  const syncWithParent = (updatedPages: NotebookPage[]) => {
    setSaveStatus("saving");
    onChangeItem({
      ...currentItem,
      notebookPages: updatedPages,
      updatedAt: new Date().toISOString()
    });
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }, 400);
  };

  // Create new pages
  const handleAddPage = () => {
    const newPage: NotebookPage = {
      id: `page-${Math.random().toString(36).substr(2, 9)}`,
      title: `Folha ${pages.length + 1} - Sem título`,
      content: "",
      checklist: [],
      color: "#ffffff",
      order: pages.length,
      workspaceId: currentItem.id
    };
    const updated = [...pages, newPage];
    setPages(updated);
    setActivePageId(newPage.id);
    syncWithParent(updated);
  };

  // Delete page
  const handleDeletePage = (pageId: string) => {
    const updated = pages.filter(p => p.id !== pageId);
    setPages(updated);
    if (activePageId === pageId) {
      setActivePageId(updated.length > 0 ? updated[0].id : null);
    }
    syncWithParent(updated);
  };

  // Re-arrange / Move up or down
  const movePageOrder = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === pages.length - 1) return;

    const updated = [...pages];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    // re-map orders
    const ordered = updated.map((p, idx) => ({ ...p, order: idx }));
    setPages(ordered);
    syncWithParent(ordered);
  };

  // Update visual parameters on selected notebook page
  const updateActivePage = (fields: Partial<NotebookPage>) => {
    if (!activePageId) return;
    const updated = pages.map(p => {
      if (p.id === activePageId) {
        return { ...p, ...fields };
      }
      return p;
    });
    setPages(updated);
    syncWithParent(updated);
  };

  const activePage = pages.find(p => p.id === activePageId) || null;

  // Add checklist item
  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePage || !newChecklistText.trim()) return;

    const newItem = {
      id: `chk-${Math.random().toString(36).substr(2, 5)}`,
      text: newChecklistText.trim(),
      checked: false
    };

    updateActivePage({
      checklist: [...(activePage.checklist || []), newItem]
    });
    setNewChecklistText("");
  };

  // Toggle checklist item
  const toggleChecklistItem = (itemId: string) => {
    if (!activePage) return;
    const updatedChecklist = activePage.checklist.map(item => {
      if (item.id === itemId) return { ...item, checked: !item.checked };
      return item;
    });
    updateActivePage({ checklist: updatedChecklist });
  };

  // Remove checklist item
  const removeChecklistItem = (itemId: string) => {
    if (!activePage) return;
    const updatedChecklist = activePage.checklist.filter(item => item.id !== itemId);
    updateActivePage({ checklist: updatedChecklist });
  };

  // Move page to another Workspace entirely
  const handleMovePageToWorkspace = (targetWorkspaceId: string, page: NotebookPage) => {
    // 1. Remove from current
    const updatedCurrentPages = pages.filter(p => p.id !== page.id);
    setPages(updatedCurrentPages);
    onChangeItem({
      ...currentItem,
      notebookPages: updatedCurrentPages,
      updatedAt: new Date().toISOString()
    });

    // 2. Add to target
    const targetWorkspace = workspaces.find(w => w.id === targetWorkspaceId);
    if (targetWorkspace) {
      const targetPages = targetWorkspace.notebookPages || [];
      const updatedTargetWorkspace = {
        ...targetWorkspace,
        notebookPages: [...targetPages, { ...page, workspaceId: targetWorkspaceId }],
        updatedAt: new Date().toISOString()
      };

      const updatedAll = workspaces.map(w => {
        if (w.id === currentItem.id) {
          return { ...currentItem, notebookPages: updatedCurrentPages };
        }
        if (w.id === targetWorkspaceId) {
          return updatedTargetWorkspace;
        }
        return w;
      });

      onChangeAllItems(updatedAll);
    }
    
    setActivePageId(updatedCurrentPages.length > 0 ? updatedCurrentPages[0].id : null);
    setShowMoveDropdown(null);
  };

  // Duplicate / copy page
  const handleDuplicatePage = (page: NotebookPage) => {
    const duplicated: NotebookPage = {
      ...page,
      id: `page-copy-${Math.random().toString(36).substr(2, 9)}`,
      title: `${page.title} (Cópia)`,
      order: pages.length
    };
    const updated = [...pages, duplicated];
    setPages(updated);
    setActivePageId(duplicated.id);
    syncWithParent(updated);
  };

  const pageColors = [
    { value: "#ffffff", label: "Branco Clean" },
    { value: "#f0fdf4", label: "Verde Claro" },
    { value: "#f4f4f5", label: "Cinza Toque" },
    { value: "#eff6ff", label: "Azul Brisa" },
    { value: "#fffbeb", label: "Amarelado" },
    { value: "#fff1f2", label: "Rosa Chá" },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-gray-900/40 backdrop-blur-xs font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        className="bg-white rounded-3xl w-full max-w-5xl h-[85vh] shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
      >
        
        {/* Header Ribbon */}
        <div className="px-6 py-4 bg-[#fafcfb] border-b border-[#eaf3ee] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-600/10 text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-950 font-display flex items-center gap-2">
                <span>Caderno Digital Inteligente</span>
                <span className="text-[9px] font-bold bg-brand-100 text-brand-850 px-2 py-0.5 rounded-full uppercase tracking-wider">NoteNext Hybrid</span>
              </h3>
              <p className="text-[11px] text-gray-450 mt-0.5 leading-none">
                Crie múltiplas folhas, checklists, fotos e mova livremente em seus workspaces.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save indicator status */}
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <RefreshCw className={`w-3.5 h-3.5 text-brand-600 ${saveStatus === "saving" ? "animate-spin" : ""}`} />
              <span>{saveStatus === "saving" ? "Salvando..." : saveStatus === "saved" ? "✓ Autosalvo" : "✓ Sincronizado"}</span>
            </span>

            <button 
              onClick={onClose}
              className="p-1 px-3 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all font-semibold text-xs border border-gray-200"
            >
              Fechar Caderno
            </button>
          </div>
        </div>

        {/* Triple Column Canvas */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Column 1: Page Navigation Side Panel */}
          <div className="w-64 border-r border-[#eaf3ee] bg-gray-50/40 p-4 flex flex-col justify-between">
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Folhas do Caderno ({pages.length})
                </span>
                <button
                  onClick={handleAddPage}
                  className="p-1 rounded bg-brand-100 text-brand-800 hover:bg-brand-600 hover:text-white transition-all"
                  title="Criar folha no caderno"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {pages.length === 0 ? (
                <div className="text-center py-8 px-2">
                  <BookOpen className="w-8 h-8 text-gray-300 mx-auto mb-2 opacity-50" />
                  <span className="text-xs text-gray-400 block italic">Sem páginas. Crie a primeira folha!</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {pages.map((p, idx) => (
                    <div 
                      key={p.id}
                      className={`group p-2 rounded-xl border transition-all text-left flex flex-col gap-1.5 relative ${
                        activePageId === p.id 
                          ? "bg-brand-50/65 border-brand-100 text-brand-900 font-bold" 
                          : "bg-white border-gray-150 text-gray-650 hover:bg-gray-50"
                      }`}
                    >
                      <button
                        onClick={() => setActivePageId(p.id)}
                        className="w-full text-left truncate text-xs leading-none"
                      >
                        {p.title || "Folha Sem Nome"}
                      </button>

                      <div className="flex items-center justify-between mt-1 text-[10px] text-gray-450">
                        <span className="font-mono text-[9px] text-[#064e3b] font-medium bg-white px-1.5 py-0.5 rounded border border-brand-100">
                          Pág. {idx + 1}
                        </span>
                        
                        {/* Page management mini controllers */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => movePageOrder(idx, "up")}
                            title="Subir ordem"
                            className="p-0.5 rounded hover:bg-gray-100 text-gray-500"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => movePageOrder(idx, "down")}
                            title="Baixar ordem"
                            className="p-0.5 rounded hover:bg-gray-100 text-gray-500"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleDuplicatePage(p)}
                            title="Duplicar folha"
                            className="p-0.5 rounded hover:bg-gray-100 text-gray-500"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                          <button 
                            onClick={() => handleDeletePage(p.id)}
                            title="Excluir folha"
                            className="p-0.5 rounded hover:bg-red-50 text-red-650"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick tips */}
            <div className="p-3 bg-brand-50/50 border border-brand-100/40 rounded-2xl text-[10.5px] text-brand-850">
              <span className="font-bold flex items-center gap-1.5 mb-1 text-brand-900">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Integração de Mídia</span>
              </span>
              <span>Anexe imagens por URL ou faça rascunhos em listas para que fiquem conectados nas suas ideias.</span>
            </div>
          </div>

          {/* Column 2: Selected Page Editor Canvas */}
          {activePage ? (
            <div 
              className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 transition-colors duration-300"
              style={{ backgroundColor: activePage.color || "#ffffff" }}
            >
              
              {/* Dynamic Title */}
              <div className="border-b border-gray-100 pb-3">
                <input
                  type="text"
                  value={activePage.title}
                  onChange={(e) => updateActivePage({ title: e.target.value })}
                  placeholder="Nome da Folha..."
                  className="w-full text-2xl font-black font-display text-gray-950 bg-transparent border-none outline-none focus:ring-0 placeholder-gray-200"
                />
                
                {/* Visual Customizers strip */}
                <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
                  {/* Select bg colors */}
                  <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl border border-gray-150">
                    <Sliders className="w-3 h-3 text-gray-450" />
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Cor da Folha:</span>
                    <div className="flex gap-1">
                      {pageColors.map(color => (
                        <button
                          key={color.value}
                          onClick={() => updateActivePage({ color: color.value })}
                          title={color.label}
                          className={`w-4 border rounded-full h-4 transition-transform ${
                            activePage.color === color.value ? "scale-125 border-gray-900 ring-2 ring-brand-50" : "border-gray-200"
                          }`}
                          style={{ backgroundColor: color.value }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Move Page To Workspace button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMoveDropdown(showMoveDropdown === activePage.id ? null : activePage.id)}
                      className="px-3 py-1.5 bg-white border border-gray-150 text-[11px] font-bold text-[#064e3b] rounded-xl flex items-center gap-1 hover:bg-gray-50 transition-all shadow-xs"
                    >
                      <Move className="w-3 h-3" />
                      <span>Mover para outro Workspace</span>
                    </button>

                    {showMoveDropdown === activePage.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowMoveDropdown(null)} />
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-40 w-56 text-left">
                          <span className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest block border-b border-gray-50">
                            Selecionar Destino
                          </span>
                          {workspaces
                            .filter(w => w.id !== currentItem.id)
                            .map(w => (
                              <button
                                key={w.id}
                                onClick={() => handleMovePageToWorkspace(w.id, activePage)}
                                className="w-full px-3 py-1.5 hover:bg-[#fafdfb] text-left text-xs text-gray-700 truncate font-medium flex items-center gap-1.5"
                              >
                                <span>🌿</span>
                                <span className="truncate">{w.title}</span>
                              </button>
                            ))}
                          {workspaces.filter(w => w.id !== currentItem.id).length === 0 && (
                            <span className="px-3 py-2 text-[10px] text-gray-400 italic block">Crie outros workspaces primeiro!</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Rich contents area */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Notes Block (Rich text / annotations) */}
                <div className="md:col-span-7 space-y-2">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    ✏️ Anotações da Folha
                  </label>
                  <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-sm min-h-[300px] flex flex-col">
                    <textarea
                      value={activePage.content}
                      onChange={(e) => updateActivePage({ content: e.target.value })}
                      placeholder="Comece a redigir seu rascunho de ideias livres de planejamento para esta pauta..."
                      className="w-full flex-1 bg-transparent border-none outline-none resize-none text-xs text-gray-700 select-text outline-none focus:ring-0 min-h-[250px]"
                    />
                  </div>
                </div>

                {/* Checklist & Image Sidebar inside page */}
                <div className="md:col-span-5 space-y-6">
                  
                  {/* Interactive Checklist block */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      📋 Checklist de Metas
                    </label>

                    <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3.5">
                      <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                        <input
                          type="text"
                          value={newChecklistText}
                          onChange={(e) => setNewChecklistText(e.target.value)}
                          placeholder="Adicionar tarefa..."
                          className="flex-1 bg-gray-50 border border-gray-200 hover:border-brand-500 rounded-xl px-2.5 py-1 text-xs outline-none focus:border-brand-500"
                        />
                        <button
                          type="submit"
                          className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-2.5 py-1 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center"
                        >
                          +
                        </button>
                      </form>

                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {(activePage.checklist || []).length === 0 ? (
                          <span className="text-[10.5px] text-gray-400 block italic py-2">Sem tarefas adicionadas.</span>
                        ) : (
                          activePage.checklist.map(item => (
                            <div key={item.id} className="flex items-center justify-between gap-2 group-todo">
                              <button
                                onClick={() => toggleChecklistItem(item.id)}
                                className="flex items-center gap-2 text-left"
                              >
                                {item.checked ? (
                                  <CheckSquare className="w-4 h-4 text-brand-600 fill-brand-100 flex-shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                )}
                                <span className={`text-[11.5px] leading-tight ${item.checked ? "line-through text-gray-400 italic" : "text-gray-700"}`}>
                                  {item.text}
                                </span>
                              </button>
                              <button
                                onClick={() => removeChecklistItem(item.id)}
                                className="text-red-400 hover:text-red-600 text-[10px]"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Embedded high fidelity media blocks */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      🖼️ Imagem Inspiradora
                    </label>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="Cole URL de imagem do unsplash..."
                          className="flex-1 bg-gray-50 border border-gray-200 hover:border-brand-500 rounded-xl px-2.5 py-1 text-[10.5px] outline-none"
                        />
                        <button
                          onClick={() => {
                            if (imageUrlInput.trim()) {
                              updateActivePage({ imageSrc: imageUrlInput.trim() });
                              setImageUrlInput("");
                            }
                          }}
                          className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-2 rounded-xl text-[10px] font-bold"
                        >
                          Anexar
                        </button>
                      </div>

                      {activePage.imageSrc ? (
                        <div className="relative rounded-xl overflow-hidden group shadow-sm">
                          <img 
                            src={activePage.imageSrc} 
                            alt="Smart Notebook asset inline" 
                            className="w-full h-32 object-cover block"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=300&q=80";
                            }}
                          />
                          <button
                            onClick={() => updateActivePage({ imageSrc: undefined })}
                            className="absolute right-2 top-2 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                            title="Desarticular imagem"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-24 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-300">
                          <Image className="w-6 h-6 mb-1 opacity-50" />
                          <span className="text-[10px]">Sem imagens anexadas à folha</span>
                        </div>
                      )}

                    </div>
                  </div>

                </div>

              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 p-12 text-center text-gray-400">
              <BookOpen className="w-16 h-16 text-brand-100 mb-3" />
              <h4 className="text-sm font-bold text-gray-700">Selecione uma Página do Caderno</h4>
              <p className="text-xs text-gray-400 max-w-xs mt-1">
                Utilize o menu esquerdo para navegar pelas folhas do seu caderno real, duplicar elementos ou reordenar-os.
              </p>
            </div>
          )}

        </div>

      </motion.div>
    </div>
  );
}
