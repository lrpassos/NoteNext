/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Tag, 
  Sparkles, 
  Cpu, 
  Trash2, 
  Edit2, 
  Plus, 
  Check, 
  X, 
  Settings, 
  ToggleLeft, 
  ToggleRight,
  Shield,
  Activity,
  Award
} from "lucide-react";
import { WorkspaceCategory, GeminiAgent, WorkspaceItem } from "../types";

interface SaaSConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  categories: WorkspaceCategory[];
  onUpdateCategories: (cats: WorkspaceCategory[]) => void;
  agents: GeminiAgent[];
  onUpdateAgents: (ags: GeminiAgent[]) => void;
  workspaces: WorkspaceItem[];
  onChangeAllItems: (items: WorkspaceItem[]) => void;
}

export default function SaaSConfigPanel({
  isOpen,
  onClose,
  categories,
  onUpdateCategories,
  agents,
  onUpdateAgents,
  workspaces,
  onChangeAllItems
}: SaaSConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<"categories" | "agents">("categories");

  // Category State managers
  const [catNameInput, setCatNameInput] = useState("");
  const [catColorInput, setCatColorInput] = useState("#10b981");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Gemini Agents config states
  const [agentName, setAgentName] = useState("");
  const [agentRole, setAgentRole] = useState("");
  const [agentSystemInstruction, setAgentSystemInstruction] = useState("");
  const [agentModel, setAgentModel] = useState("gemini-3.5-flash");
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);

  const colorsPalette = [
    { value: "#10b981", name: "Esmeralda", text: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    { value: "#4f46e5", name: "Índigo", text: "text-indigo-700 bg-indigo-50 border-indigo-200" },
    { value: "#2563eb", name: "Azul Real", text: "text-blue-700 bg-blue-50 border-blue-200" },
    { value: "#e11d48", name: "Rosa Chá", text: "text-rose-700 bg-rose-50 border-rose-200" },
    { value: "#b45309", name: "Âmbar", text: "text-amber-750 bg-amber-50 border-amber-200" },
    { value: "#0d9488", name: "Teal", text: "text-teal-700 bg-teal-50 border-teal-200" },
    { value: "#7c3aed", name: "Violeta", text: "text-violet-750 bg-violet-50 border-violet-200" },
    { value: "#ea580c", name: "Laranja", text: "text-orange-700 bg-orange-50 border-orange-200" }
  ];

  // 1. Categories logic
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catNameInput.trim();
    if (!cleanName) return;

    // Check duplicate categories
    const isDup = categories.some(
      c => c.id !== editingCatId && c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (isDup) {
      alert(`O nome de categoria "${cleanName}" já está em uso. Crie categorias de nomes exclusivos.`);
      return;
    }

    if (editingCatId) {
      // Edit existing
      const updated = categories.map(c => {
        if (c.id === editingCatId) {
          return { ...c, name: cleanName, color: catColorInput };
        }
        return c;
      });
      onUpdateCategories(updated);
      setEditingCatId(null);
    } else {
      // Add new
      const newCat: WorkspaceCategory = {
        id: `cat-${Math.random().toString(36).substr(2, 5)}`,
        name: cleanName,
        color: catColorInput,
        order: categories.length
      };
      onUpdateCategories([...categories, newCat]);
    }

    setCatNameInput("");
    setCatColorInput("#10b981");
  };

  const handleStartEditCategory = (cat: WorkspaceCategory) => {
    setEditingCatId(cat.id);
    setCatNameInput(cat.name);
    setCatColorInput(cat.color);
  };

  const handleDeleteCategory = (catId: string, catName: string) => {
    if (confirm(`Excluir a categoria "${catName}"? Os workspaces sob ela serão movidos para "Todos".`)) {
      const updatedCats = categories.filter(c => c.id !== catId);
      onUpdateCategories(updatedCats);

      // Re-map elements that used this category back to normal
      const updatedWorkspaces = workspaces.map(w => {
        if (w.category.toLowerCase() === catName.toLowerCase()) {
          return { ...w, category: "Todos" };
        }
        return w;
      });
      onChangeAllItems(updatedWorkspaces);
    }
  };

  // Reorganize / order categories
  const reorderCategory = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === categories.length - 1) return;

    const updated = [...categories];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    const final = updated.map((c, i) => ({ ...c, order: i }));
    onUpdateCategories(final);
  };

  // 2. Gemini Agents setup logic
  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim() || !agentRole.trim()) return;

    if (editingAgentId) {
      // Edit
      const updated = agents.map(a => {
        if (a.id === editingAgentId) {
          return {
            ...a,
            name: agentName.trim(),
            role: agentRole.trim(),
            systemInstruction: agentSystemInstruction.trim(),
            model: agentModel
          };
        }
        return a;
      });
      onUpdateAgents(updated);
      setEditingAgentId(null);
    } else {
      // Create new
      const newAgent: GeminiAgent = {
        id: `agent-${Math.random().toString(36).substr(2, 5)}`,
        name: agentName.trim(),
        role: agentRole.trim(),
        systemInstruction: agentSystemInstruction.trim() || "Você é um agente de IA especialista.",
        model: agentModel,
        isActive: true,
        status: Math.random() > 0.15 ? "online" : "offline" // High-fidelity simulated online/offline indicator
      };
      onUpdateAgents([...agents, newAgent]);
    }

    setAgentName("");
    setAgentRole("");
    setAgentSystemInstruction("");
    setAgentModel("gemini-3.5-flash");
  };

  const handleStartEditAgent = (agent: GeminiAgent) => {
    setEditingAgentId(agent.id);
    setAgentName(agent.name);
    setAgentRole(agent.role);
    setAgentSystemInstruction(agent.systemInstruction);
    setAgentModel(agent.model);
  };

  const handleToggleAgentActive = (agentId: string) => {
    const updated = agents.map(a => {
      if (a.id === agentId) {
        return { ...a, isActive: !a.isActive };
      }
      return a;
    });
    onUpdateAgents(updated);
  };

  const handleDeleteAgent = (agentId: string, name: string) => {
    if (confirm(`Deletar permanentemente o Agente IA "${name}"?`)) {
      onUpdateAgents(agents.filter(a => a.id !== agentId));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-gray-900/40 backdrop-blur-xs font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 12 }}
        className="bg-white rounded-3xl w-full max-w-4xl h-[80vh] shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
      >
        {/* Banner header inside custom config */}
        <div className="px-6 py-4 bg-[#fcfdfd] border-b border-[#eaf3ee] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm text-white">
              <Settings className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-950 font-display">Verificação e Administração</h3>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-none">Configure categorias de organização e multiplique agentes inteligentes de IA Gemini.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-3.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 font-semibold text-xs border border-gray-200 cursor-pointer"
          >
            Sair das Configurações
          </button>
        </div>

        {/* Tabs toggle section */}
        <div className="flex border-b border-[#eaf3ee] bg-gray-50/50">
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-6 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "categories"
                ? "border-brand-600 text-brand-900 bg-white font-black"
                : "border-transparent text-gray-450 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Tag className="w-4 h-4 text-brand-600" />
            <span>Categorias Coloridas</span>
          </button>
          <button
            onClick={() => setActiveTab("agents")}
            className={`px-6 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "agents"
                ? "border-brand-600 text-brand-900 bg-white font-black"
                : "border-transparent text-gray-450 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            <Cpu className="w-4 h-4 text-[#064e3b]" />
            <span>Agentes IA Gemini</span>
          </button>
        </div>

        {/* Main Content Segment */}
        <div className="flex-1 overflow-y-auto p-6 bg-white min-h-0">
          {activeTab === "categories" ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full">
              
              {/* Left Form: Add/Edit */}
              <div className="md:col-span-5 bg-gray-50/50 p-5 rounded-2xl border border-[#eaf2ed] space-y-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-widest">
                  {editingCatId ? "✏️ Editar Categoria" : "📂 Nova Categoria"}
                </h4>
                
                <form onSubmit={handleSaveCategory} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10.5px] font-bold text-gray-500 block">Nome da Categoria</label>
                    <input
                      type="text"
                      value={catNameInput}
                      onChange={(e) => setCatNameInput(e.target.value)}
                      placeholder="Ex: Roteiros, Faculdade, Pessoal"
                      className="w-full bg-white border border-gray-200 focus:border-brand-500 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-0"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10.5px] font-bold text-gray-500 block">Identificação de Cor</label>
                    <div className="grid grid-cols-4 gap-2">
                      {colorsPalette.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setCatColorInput(color.value)}
                          className={`p-1.5 rounded-xl border text-[10px] font-bold text-center transition-all ${
                            catColorInput === color.value 
                              ? "border-gray-900 ring-2 ring-brand-100 scale-105" 
                              : "border-gray-150 hover:bg-white"
                          }`}
                          style={{ borderLeft: `4px solid ${color.value}` }}
                        >
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      {editingCatId ? "Salvar Alterações" : "Adicionar Categoria"}
                    </button>
                    {editingCatId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(null);
                          setCatNameInput("");
                          setCatColorInput("#10b981");
                        }}
                        className="bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs py-2 px-3 rounded-xl"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Right Table: Registered categories list */}
              <div className="md:col-span-7 space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Categorias Configuradas ({categories.length})
                </span>

                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#fcfdfd] text-gray-450 uppercase text-[9.5px] font-bold tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-2.5">Cor</th>
                        <th className="px-4 py-2.5">Nome</th>
                        <th className="px-4 py-2.5">Ordem</th>
                        <th className="px-4 py-2.5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-gray-700">
                      {categories.map((cat, idx) => {
                        const paletteItem = colorsPalette.find(p => p.value === cat.color);
                        return (
                          <tr key={cat.id} className="hover:bg-gray-50/40">
                            <td className="px-4 py-3">
                              <span 
                                className="w-6 h-3 rounded-full block border" 
                                style={{ backgroundColor: cat.color }}
                              />
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{cat.name}</td>
                            <td className="px-4 py-3 text-gray-500 font-mono text-[10px]">
                              <div className="flex items-center gap-1">
                                <span>{idx + 1}</span>
                                <div className="flex flex-col">
                                  <button onClick={() => reorderCategory(idx, "up")} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 leading-none">▲</button>
                                  <button onClick={() => reorderCategory(idx, "down")} disabled={idx === categories.length - 1} className="text-gray-300 hover:text-gray-600 leading-none">▼</button>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1.5">
                              <button
                                onClick={() => handleStartEditCategory(cat)}
                                className="p-1 px-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors inline-block"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="p-1 px-1.5 rounded hover:bg-red-50 text-red-650 transition-colors inline-block"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {categories.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-gray-400 italic">Nenhuma categoria registrada.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-full">
              
              {/* Left Panel: Register/Edit Agent */}
              <div className="md:col-span-5 bg-gray-50/50 p-5 rounded-2xl border border-[#eaf2ed] space-y-4">
                <h4 className="text-xs font-bold text-[#064e3b] uppercase tracking-widest flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-brand-600" />
                  <span>{editingAgentId ? "✏️ Modificar Agente" : "⚡ Cadastrar Agente Gemini"}</span>
                </h4>

                <form onSubmit={handleSaveAgent} className="space-y-3">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-gray-500 block">Nome do Agente (Ex: Heitor)</label>
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Identificador do assistente"
                      className="w-full bg-white border border-gray-200 focus:border-brand-500 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-0"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-gray-500 block">Especialidade / Cargo</label>
                    <input
                      type="text"
                      value={agentRole}
                      onChange={(e) => setAgentRole(e.target.value)}
                      placeholder="Ex: Copywriter, Programador, Roteirista"
                      className="w-full bg-white border border-gray-200 focus:border-brand-500 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-0"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-gray-500 block">Modelo Base de Linguagem</label>
                    <select
                      value={agentModel}
                      onChange={(e) => setAgentModel(e.target.value)}
                      className="w-full bg-white border border-gray-200 focus:border-brand-500 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-0"
                    >
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash (Leve, veloz)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Codificação, complexo)</option>
                      <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Baixa latência)</option>
                    </select>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-gray-500 block">Instrução de Sistema (Personalidade)</label>
                    <textarea
                      value={agentSystemInstruction}
                      onChange={(e) => setAgentSystemInstruction(e.target.value)}
                      placeholder="Ex: Responda de forma extremamente concisa, amigável e utilize emojis de tecnologia."
                      className="w-full bg-white border border-gray-200 focus:border-brand-500 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-0 h-20 resize-none font-sans"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 bg-[#064e3b] hover:bg-brand-900 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      {editingAgentId ? "Salvar Alterações" : "Inaugurar Agente"}
                    </button>
                    {editingAgentId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAgentId(null);
                          setAgentName("");
                          setAgentRole("");
                          setAgentSystemInstruction("");
                          setAgentModel("gemini-3.5-flash");
                        }}
                        className="bg-gray-100 text-gray-500 hover:bg-gray-200 text-xs py-2 px-3 rounded-xl"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Right Panel: Multiple interactive cards metrics */}
              <div className="md:col-span-7 space-y-3 min-h-0 flex flex-col justify-start">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                  Agentes de IA Ativos ({agents.length})
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {agents.map((agent) => (
                    <div 
                      key={agent.id}
                      className={`p-4 rounded-2xl border transition-all text-left space-y-3 relative flex flex-col justify-between ${
                        agent.isActive 
                          ? "bg-white border-brand-100 shadow-sm" 
                          : "bg-gray-50 border-gray-200 text-gray-500 opacity-80"
                      }`}
                    >
                      {/* Avatar & status line */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            agent.isActive ? "bg-brand-100 text-brand-850" : "bg-gray-200 text-gray-500"
                          }`}>
                            {agent.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h5 className="text-[12px] font-black text-gray-900 leading-none">{agent.name}</h5>
                            <span className="text-[10px] text-gray-400 block mt-0.5">{agent.role}</span>
                          </div>
                        </div>

                        {/* Switch button */}
                        <button
                          onClick={() => handleToggleAgentActive(agent.id)}
                          title={agent.isActive ? "Desativar Agente IA" : "Ativar Agente IA"}
                          className="mr-1 text-gray-400 hover:text-gray-900 leading-none inline-block outline-none"
                        >
                          {agent.isActive ? (
                            <ToggleRight className="w-7 h-7 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-gray-300" />
                          )}
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {/* Status chip */}
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full block ${
                            !agent.isActive 
                              ? "bg-gray-400" 
                              : agent.status === "online" 
                                ? "bg-emerald-500 animate-pulse" 
                                : "bg-red-400"
                          }`} />
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-550 leading-none">
                            {!agent.isActive ? "Inativo" : agent.status === "online" ? "Online / Ativo" : "Instável"}
                          </span>
                        </div>

                        <p className="text-[10px] text-gray-600 leading-tight italic line-clamp-2">
                          "{agent.systemInstruction}"
                        </p>
                      </div>

                      {/* Footer actions */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                        <span className="text-gray-400 font-mono">{agent.model}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEditAgent(agent)}
                            className="text-brand-800 hover:underline font-bold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteAgent(agent.id, agent.name)}
                            className="text-red-500 hover:underline font-bold"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {agents.length === 0 && (
                    <div className="col-span-2 text-center py-10 text-gray-450 italic border border-dashed border-gray-200 rounded-3xl bg-gray-50/20">
                      <Cpu className="w-10 h-10 text-gray-300 mx-auto mb-2 opacity-50" />
                      <span>Nenhum agente cadastrado ainda. Preencha o painel esquerdo para treinar e inaugurar múltiplos especialistas!</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
