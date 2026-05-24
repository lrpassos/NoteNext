/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  StickyNote, 
  Pin, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square, 
  Tag, 
  Calendar,
  Sparkles,
  ClipboardList
} from "lucide-react";
import { KeepNote, WorkspaceItem } from "../types";

interface KeepWorkspaceProps {
  item: WorkspaceItem;
  onChangeItem: (updatedItem: WorkspaceItem) => void;
  onTriggerAi: (prompt: string, noteId: string) => void;
  isAiLoading: boolean;
}

export default function KeepWorkspace({
  item,
  onChangeItem,
  onTriggerAi,
  isAiLoading
}: KeepWorkspaceProps) {
  const [notes, setNotes] = useState<KeepNote[]>(item.notes || []);
  const [editingNote, setEditingNote] = useState<KeepNote | null>(null);
  
  // Quick note creation states
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState("#ffffff");
  const [newTags, setNewTags] = useState("");
  const [isCreatingChecklist, setIsCreatingChecklist] = useState(false);
  const [checklistInput, setChecklistInput] = useState("");

  useEffect(() => {
    setNotes(item.notes || []);
  }, [item.id, item.notes]);

  const updateParent = (newNotes: KeepNote[]) => {
    onChangeItem({
      ...item,
      notes: newNotes,
      updatedAt: new Date().toISOString()
    });
  };

  const handleUpdateNoteField = (noteId: string, field: keyof KeepNote, value: any) => {
    const updated = notes.map(n => {
      if (n.id === noteId) {
        return { ...n, [field]: value, updatedAt: new Date().toLocaleString() };
      }
      return n;
    });
    setNotes(updated);
    updateParent(updated);
    if (editingNote && editingNote.id === noteId) {
      setEditingNote(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleUpdateChecklistItemText = (noteId: string, itemIdx: number, newText: string) => {
    const updated = notes.map(n => {
      if (n.id === noteId) {
        const nextCheck = [...n.checklist];
        nextCheck[itemIdx] = { ...nextCheck[itemIdx], text: newText };
        return { ...n, checklist: nextCheck };
      }
      return n;
    });
    setNotes(updated);
    updateParent(updated);
    if (editingNote && editingNote.id === noteId) {
      setEditingNote(prev => {
        if (!prev) return null;
        const nextCheck = [...prev.checklist];
        nextCheck[itemIdx] = { ...nextCheck[itemIdx], text: newText };
        return { ...prev, checklist: nextCheck };
      });
    }
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;

    const parsedTags = newTags
      .split(",")
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const checklistItems = isCreatingChecklist && checklistInput.trim()
      ? checklistInput.split("\n").map((line, idx) => ({
          id: `task-${idx}-${Date.now()}`,
          text: line.trim(),
          checked: false
        })).filter(t => t.text.length > 0)
      : [];

    const newNote: KeepNote = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle || "Nota Sem Título",
      content: newContent,
      color: newColor,
      pinned: false,
      tags: parsedTags.length > 0 ? parsedTags : ["Geral"],
      checklist: checklistItems,
      updatedAt: new Date().toLocaleString()
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    updateParent(updated);

    // reset fields
    setNewTitle("");
    setNewContent("");
    setNewColor("#ffffff");
    setNewTags("");
    setIsCreatingChecklist(false);
    setChecklistInput("");
  };

  const deleteNote = (noteId: string) => {
    const updated = notes.filter(n => n.id !== noteId);
    setNotes(updated);
    updateParent(updated);
  };

  const togglePin = (noteId: string) => {
    const updated = notes.map(n => {
      if (n.id === noteId) {
        return { ...n, pinned: !n.pinned };
      }
      return n;
    });
    setNotes(updated);
    updateParent(updated);
  };

  const toggleChecklistItem = (noteId: string, itemId: string) => {
    const updated = notes.map(n => {
      if (n.id === noteId) {
        const nextCheck = n.checklist.map(item => {
          if (item.id === itemId) return { ...item, checked: !item.checked };
          return item;
        });
        return { ...n, checklist: nextCheck };
      }
      return n;
    });
    setNotes(updated);
    updateParent(updated);
  };

  const changeNoteColor = (noteId: string, color: string) => {
    const updated = notes.map(n => {
      if (n.id === noteId) return { ...n, color };
      return n;
    });
    setNotes(updated);
    updateParent(updated);
  };

  // Load Keeps defaults
  const loadDefaultKeepNotes = () => {
    const defaults: KeepNote[] = [
      {
        id: "keep-1",
        title: "🌿 Paleta NoteNext Premium",
        content: "Meta Visual: Predominar verde moderno elegante, branco clean, verde escuro sofisticado e cantos arredondados.",
        color: "#dcfce7",
        pinned: true,
        tags: ["Design", "Paleta"],
        checklist: [],
        updatedAt: new Date().toLocaleString()
      },
      {
        id: "keep-2",
        title: "🎯 Objetivos da Semana",
        content: "Itens que precisamos testar no SaaS offline",
        color: "#eff6ff",
        pinned: true,
        tags: ["Metas"],
        checklist: [
          { id: "kf-1", text: "Integrar modelo @google/genai", checked: true },
          { id: "kf-2", text: "Configurar porta padrão 3000 no Express", checked: true },
          { id: "kf-3", text: "Criar transições fluidas com Framer Motion", checked: false }
        ],
        updatedAt: new Date().toLocaleString()
      },
      {
        id: "keep-3",
        title: "💡 Idéia de Conteúdo",
        content: "Fazer um criativo de marketing focando na experiência minimalista versus o excesso de informações das concorrentes pesadas.",
        color: "#fffbeb",
        pinned: false,
        tags: ["Marketing", "Brainstorm"],
        checklist: [],
        updatedAt: new Date().toLocaleString()
      }
    ];

    setNotes(defaults);
    updateParent(defaults);
  };

  const pinnedNotes = notes.filter(n => n.pinned);
  const otherNotes = notes.filter(n => !n.pinned);

  return (
    <div className="flex-1 bg-gray-50/50 overflow-y-auto h-screen relative flex flex-col font-sans">
      
      {/* Top Banner Navigation */}
      <div className="px-8 py-4 border-b border-[#f0f5f2] flex justify-between items-center bg-white">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Notas Google Keep
          </span>
        </div>
        <button
          onClick={loadDefaultKeepNotes}
          className="text-[11px] bg-brand-50 hover:bg-brand-100 text-brand-850 font-semibold px-2.5 py-1.5 rounded-lg border border-brand-100 transition-all"
        >
          Carregar Notas Exemplo
        </button>
      </div>

      {/* Main Container Area */}
      <div className="max-w-4xl w-full mx-auto px-6 py-8 flex-1 space-y-8">
        
        {/* Quick Note Maker Header Form */}
        <form 
          onSubmit={handleCreateNote} 
          className="max-w-xl mx-auto bg-white rounded-xl border border-gray-150 shadow-[0_4px_25px_rgba(0,0,0,0.015)] p-4 space-y-3"
          style={{ backgroundColor: newColor }}
        >
          <div className="flex justify-between items-center">
            <input
              type="text"
              value={item.title}
              title="Título principal do deck"
              onChange={(e) => onChangeItem({ ...item, title: e.target.value })}
              className="text-sm font-bold text-gray-450 border-none outline-none focus:bg-gray-100 focus:px-1 rounded"
              placeholder="Deck de Notas..."
            />
            <span className="text-[10px] text-gray-450 font-bold bg-white px-2 py-0.5 rounded border">Keep</span>
          </div>

          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título da nota..."
            className="w-full text-sm font-semibold font-display text-gray-900 border-none outline-none bg-transparent"
          />

          {!isCreatingChecklist ? (
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Criar uma nota rápido..."
              className="w-full text-xs text-gray-650 h-16 border-none outline-none bg-transparent resize-none leading-relaxed"
            />
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">
                Lista de Checkbox (Um item por linha)
              </label>
              <textarea
                value={checklistInput}
                onChange={(e) => setChecklistInput(e.target.value)}
                placeholder="Exemplo:\nMeta #1\nMeta #2\nConectar IA"
                className="w-full text-xs font-mono h-20 border-none outline-none bg-transparent resize-none border-b border-gray-100 placeholder-gray-300"
              />
            </div>
          )}

          {/* Quick Creator settings footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100/40 text-xs">
            
            {/* Color Select Grid */}
            <div className="flex items-center gap-1">
              {["#ffffff", "#dcfce7", "#eff6ff", "#fffbeb", "#fbcfe8"].map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-3.5 h-3.5 rounded-full border border-gray-300 transition-transform ${
                    newColor === c ? "scale-115 ring-2 ring-brand-500/50" : "hover:scale-105"
                  }`}
                />
              ))}
            </div>

            {/* Inputs & Tags */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="Marcadores (separados por vírgula)"
                className="text-[10px] text-gray-500 bg-gray-50 hover:bg-gray-150 px-2 py-1 rounded border border-gray-100 outline-none max-w-[140px]"
              />

              <button
                type="button"
                onClick={() => setIsCreatingChecklist(!isCreatingChecklist)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all ${
                  isCreatingChecklist ? "bg-brand-50 border-brand-200 text-brand-700" : "bg-white border-gray-200 text-gray-500"
                }`}
                title="Alternar modo Checklist"
              >
                <ClipboardList className="w-3.5 h-3.5" />
              </button>

              <button
                type="submit"
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-[11px] transition-all flex items-center gap-1 shadow-sm shadow-brand-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>
            </div>

          </div>
        </form>

        {/* Dynamic Display Grid mapping */}
        {notes.length === 0 ? (
          <div className="text-center py-10">
            <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <span className="text-xs text-gray-400 block italic">Nenhuma nota neste painel. Clique no botão de exemplo para carregar modelos.</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Pinned notes list */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block flex items-center gap-1.5">
                  <Pin className="w-3 h-3 text-brand-650" />
                  <span>Fixadas</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {pinnedNotes.map(n => renderNoteCard(n))}
                </div>
              </div>
            )}

            {/* Other normal notes */}
            {otherNotes.length > 0 && (
              <div className="space-y-2">
                {pinnedNotes.length > 0 && (
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                    Outras Notas
                  </span>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {otherNotes.map(n => renderNoteCard(n))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Expanded Interactive Keep Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs select-none">
          <div 
            onClick={() => setEditingNote(null)} 
            className="absolute inset-0"
          />
          
          <div 
            style={{ backgroundColor: editingNote.color }}
            className="relative w-full max-w-lg rounded-2xl border border-gray-150/60 shadow-2xl p-6 flex flex-col gap-4 z-10 transition-all font-sans"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <input
                type="text"
                value={editingNote.title}
                onChange={(e) => handleUpdateNoteField(editingNote.id, "title", e.target.value)}
                placeholder="Título da nota"
                className="w-full text-base font-bold font-display text-gray-900 border-none outline-none bg-transparent mr-4"
              />
              <button
                onClick={() => togglePin(editingNote.id)}
                className={`p-1.5 rounded-lg hover:bg-gray-100/50 transition-colors ${
                  editingNote.pinned ? "text-brand-650" : "text-gray-400"
                }`}
                title={editingNote.pinned ? "Desafixar" : "Fixar no topo"}
              >
                <Pin className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Note Content */}
            <textarea
              value={editingNote.content}
              onChange={(e) => handleUpdateNoteField(editingNote.id, "content", e.target.value)}
              placeholder="Escreva sua idéia aqui..."
              className="w-full text-xs text-gray-700 h-44 border-none outline-none bg-transparent resize-none leading-relaxed placeholder-gray-400 focus:ring-0"
            />

            {/* Checklist items in Expanded View */}
            {editingNote.checklist && editingNote.checklist.length > 0 && (
              <div className="space-y-2 border-t border-gray-100/40 pt-3 max-h-48 overflow-y-auto">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Lista de tarefas</span>
                {editingNote.checklist.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 group/item">
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(editingNote.id, item.id)}
                      className="text-gray-400 hover:text-brand-600 focus:outline-none"
                    >
                      {item.checked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-brand-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </button>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => handleUpdateChecklistItemText(editingNote.id, idx, e.target.value)}
                      className={`flex-1 text-xs bg-transparent border-none outline-none py-0.5 focus:bg-white/60 focus:px-1 rounded ${item.checked ? "line-through text-gray-400 italic" : "text-gray-700"}`}
                      placeholder="Editar tarefa..."
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const nextCheck = editingNote.checklist.filter(c => c.id !== item.id);
                        handleUpdateNoteField(editingNote.id, "checklist", nextCheck);
                      }}
                      className="opacity-0 group-hover/item:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-0.5"
                      title="Deletar item"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {/* Add dynamic task link */}
                <button
                  type="button"
                  onClick={() => {
                    const nextCheck = [...editingNote.checklist, { id: `task-${Date.now()}`, text: "", checked: false }];
                    handleUpdateNoteField(editingNote.id, "checklist", nextCheck);
                  }}
                  className="text-xs text-brand-600 hover:text-brand-850 hover:underline flex items-center gap-1 mt-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5 font-bold" />
                  <span>Adicionar item</span>
                </button>
              </div>
            )}

            {/* Bottom tools row */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-150/40">
              {/* Color switcher triggers within modal */}
              <div className="flex items-center gap-1.5 bg-white/70 px-2 py-1 rounded-xl border border-gray-150">
                {["#ffffff", "#dcfce7", "#eff6ff", "#fffbeb", "#fbcfe8"].map((col) => (
                  <button
                    key={col}
                    onClick={() => handleUpdateNoteField(editingNote.id, "color", col)}
                    style={{ backgroundColor: col }}
                    className={`w-3.5 h-3.5 rounded-full border border-gray-300 transition-transform ${
                      editingNote.color === col ? "scale-115 ring-2 ring-brand-500/20" : "hover:scale-110"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Gostaria de deletar permanentemente esta nota do seu espaço?")) {
                      deleteNote(editingNote.id);
                      setEditingNote(null);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-650 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  Excluir Nota
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNote(null)}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-all"
                >
                  Concluir
                </button>
              </div>
            </div>

            <div className="text-[9px] text-gray-400/80 mt-1 select-none flex items-center justify-between font-mono">
              <span>Modificado em: {editingNote.updatedAt}</span>
              <span>Modo Expandido • NoteNext</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );

  // Note card block renderer helper
  function renderNoteCard(note: KeepNote) {
    // Show maximum 3 checklist items in preview card to save space
    const maxPreviewChecklist = 3;
    const hasMoreChecklistItems = note.checklist.length > maxPreviewChecklist;
    const previewChecklist = note.checklist.slice(0, maxPreviewChecklist);

    return (
      <div
        key={note.id}
        style={{ backgroundColor: note.color }}
        onClick={() => setEditingNote(note)}
        className="rounded-xl border border-gray-150 p-4 shadow-[0_3px_10px_rgba(0,0,0,0.01)] hover:shadow-md transition-all group flex flex-col justify-between relative cursor-pointer hover:scale-[1.01]"
      >
        
        {/* Dynamic header / pin button */}
        <div>
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-xs font-bold text-gray-900 pr-4 leading-normal font-display line-clamp-1">
              {note.title}
            </h4>
            <div className="flex gap-1.5 items-center">
              <button
                onClick={(e) => { e.stopPropagation(); togglePin(note.id); }}
                className={`p-1 rounded-md hover:bg-gray-100/50 transition-colors ${
                  note.pinned ? "text-brand-600" : "text-gray-300"
                }`}
                title="Fixar no topo"
              >
                <Pin className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-650 font-sans leading-relaxed whitespace-pre-line mb-3 line-clamp-3 overflow-hidden">
            {note.content}
          </p>

          {/* Checklist mapping if any */}
          {note.checklist && note.checklist.length > 0 && (
            <div className="space-y-1.5 border-t border-gray-100/40 pt-2 mb-3">
              {previewChecklist.map((item) => (
                <div 
                  key={item.id} 
                  onClick={(e) => { e.stopPropagation(); toggleChecklistItem(note.id, item.id); }}
                  className="flex items-center gap-2 cursor-pointer text-xs"
                >
                  {item.checked ? (
                    <CheckSquare className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-gray-405 flex-shrink-0" />
                  )}
                  <span className={`leading-tight truncate ${item.checked ? "line-through text-gray-400 italic" : "text-gray-700"}`}>
                    {item.text || "Tarefa vazia"}
                  </span>
                </div>
              ))}
              {hasMoreChecklistItems && (
                <div className="text-[10px] text-gray-450 italic pl-5">
                   + {note.checklist.length - maxPreviewChecklist} itens...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags / Labels and bottom actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100/50 text-[10px] mt-auto">
          {/* List of tags */}
          <div className="flex flex-wrap gap-1 max-w-[50%]">
            {note.tags.map((tag) => (
              <span 
                key={tag} 
                className="bg-white/70 border border-gray-150 px-1 py-0.5 rounded text-[8.5px] text-gray-500 font-semibold flex items-center gap-0.5 truncate max-w-[60px]"
              >
                <Tag className="w-1.5 h-1.5 text-brand-600" />
                <span className="truncate">{tag}</span>
              </span>
            ))}
          </div>

          {/* Action links */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Color switcher triggers within card */}
            <div className="flex items-center gap-0.5 bg-white/70 px-1 py-0.5 rounded border border-gray-150 mr-1">
              {["#ffffff", "#dcfce7", "#eff6ff", "#fffbeb"].map((col) => (
                <button
                  key={col}
                  onClick={(e) => { e.stopPropagation(); changeNoteColor(note.id, col); }}
                  style={{ backgroundColor: col }}
                  className="w-2 h-2 rounded-full border border-gray-300 hover:scale-110"
                />
              ))}
            </div>

            {/* AI Assistant triggers specific to card context */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTriggerAi(`Resuma as notas e crie uma ação prática sobre este tema: ${note.title} - ${note.content} ${note.checklist.map(c=>c.text).join(",")}`, note.id);
              }}
              disabled={isAiLoading}
              className="w-5.5 h-5.5 rounded-md hover:bg-brand-50 text-brand-650 flex items-center justify-center transition-colors"
              title="Organizar notas com NoteNext AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
              className="w-5.5 h-5.5 rounded-md hover:bg-red-50 text-gray-450 hover:text-red-650 flex items-center justify-center transition-colors font-sans"
              title="Deletar nota"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="text-[8px] text-gray-400 mt-2 block select-none">Atualizado: {note.updatedAt}</div>
      </div>
    );
  }
}
