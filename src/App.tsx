/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Layers, 
  Menu, 
  PanelRight, 
  BookmarkCheck,
  Star
} from "lucide-react";
import { 
  WorkspaceItem, 
  WorkspaceType, 
  UserSession, 
  EditorBlock,
  CanvasElement,
  CanvasConnection,
  KeepNote,
  WorkspaceCategory,
  GeminiAgent
} from "./types";
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";
import BlockEditor from "./components/BlockEditor";
import CanvasWorkspace from "./components/CanvasWorkspace";
import KeepWorkspace from "./components/KeepWorkspace";
import SaaSConfigPanel from "./components/SaaSConfigPanel";
import SmartNotebook from "./components/SmartNotebook";

// Elegant preset documents on first launch to showcase startup design flavor
const INITIAL_DEMO_ITEMS: WorkspaceItem[] = [
  {
    id: "demo-notion",
    title: "🌿 Diretrizes do Projeto NoteNext",
    type: WorkspaceType.NOTION_DOC,
    category: "Projetos",
    isFavorite: true,
    updatedAt: new Date().toISOString(),
    blocks: [
      { id: "b1", type: "h1", content: "Bem-vindo ao NoteNext Workspace" },
      { id: "b2", type: "paragraph", content: "A plataforma de organização minimalista inspirada no Notion, Milanote e Google Keep. Criada especificamente no elegante tema verde e branco do Vale do Silício." },
      { id: "b3", type: "h2", content: "Recursos Ativos" },
      { id: "b4", type: "todo", content: "Editor de blocos completo Notion com comandos usando '/'", checked: true },
      { id: "b5", type: "todo", content: "Canvas Infinito Milanote para colagens visuais e conexões", checked: true },
      { id: "b6", type: "todo", content: "Cards de rascunhos ágeis semelhantes ao Google Keep", checked: true },
      { id: "b7", type: "code", content: "const appInfo = {\n  name: 'NoteNext',\n  design: 'Silicon Valley Premium',\n  colorScheme: 'Verde Elegante & Off-White'\n};" }
    ]
  },
  {
    id: "demo-milanote",
    title: "🎨 Moodboard Inspirações Visuais",
    type: WorkspaceType.MILANOTE_CANVAS,
    category: "Brainstorm",
    isFavorite: true,
    updatedAt: new Date().toISOString(),
    elements: [
      {
        id: "mel-1",
        type: "note",
        x: 60,
        y: 80,
        width: 180,
        height: 120,
        title: "Regra Visual #1",
        content: "Nossa meta é dar uma sensação extremamente rápida e fluida às ideias, com o uso de sombras muito suaves e cantos arredondados de até 1rem (rounded-xl).",
        color: "#dcfce7"
      },
      {
        id: "mel-2",
        type: "image",
        x: 310,
        y: 60,
        width: 220,
        height: 180,
        title: "Symmetry Concept",
        content: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "mel-3",
        type: "link",
        x: 180,
        y: 290,
        width: 220,
        height: 130,
        title: "Referência Design",
        content: "Mapeamento simplificado no Coolors.",
        linkUrl: "https://coolors.co"
      }
    ],
    connections: [
      { id: "conn-demo", fromId: "mel-1", toId: "mel-2", label: "Conecta" }
    ]
  },
  {
    id: "demo-keep",
    title: "💡 Quadro de Insights Curtos",
    type: WorkspaceType.KEEP_NOTES,
    category: "Pessoal",
    isFavorite: false,
    updatedAt: new Date().toISOString(),
    notes: [
      {
        id: "kn-1",
        title: "🌿 Lançamento NoteNext",
        content: "Preparar a landing page focado na velocidade offline comparada ao peso excessivo do Notion.",
        color: "#dcfce7",
        pinned: true,
        tags: ["Marketing"],
        checklist: [],
        updatedAt: new Date().toLocaleString()
      },
      {
        id: "kn-2",
        title: "🛍️ MVP Feedback",
        content: "Requisitos fornecidos pelos primeiros beta-testers",
        color: "#eff6ff",
        pinned: false,
        tags: ["Produto"],
        checklist: [
          { id: "k-item-1", text: "Suporte completo de comandos por barra invertida '/'", checked: true },
          { id: "k-item-2", text: "Drag-and-drop de conexões visuais no Milanote", checked: false }
        ],
        updatedAt: new Date().toLocaleString()
      }
    ]
  }
];

const DEFAULT_CATEGORIES: WorkspaceCategory[] = [
  { id: "cat-proj", name: "Projetos", color: "#10b981", order: 0 },
  { id: "cat-brain", name: "Brainstorm", color: "#4f46e5", order: 1 },
  { id: "cat-pess", name: "Pessoal", color: "#e11d48", order: 2 },
  { id: "cat-rote", name: "Roteiros", color: "#b45309", order: 3 }
];

const DEFAULT_AGENTS: GeminiAgent[] = [
  { id: "ag-heitor", name: "Heitor", role: "Copywriter Pro", systemInstruction: "Você é Heitor, um Copywriter de alta conversão. Escreva chamadas persuasivas e refinadas para ideias de produtos.", model: "gemini-3.5-flash", isActive: true, status: "online" },
  { id: "ag-julia", name: "Júlia", role: "Programadora Especialista", systemInstruction: "Você é Júlia, uma programadora sênior fullstack. Responda em blocos de códigos TypeScript limpos e comentados corporativos.", model: "gemini-3.1-pro-preview", isActive: false, status: "online" }
];

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  
  // Sidebar visual categories & search
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar sizing & collapse states - exact matches to prompt requests
  const [isSidebarWide, setIsSidebarWide] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // AI Drawer and Loading states
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Custom states for SaaS configurations
  const [categories, setCategories] = useState<WorkspaceCategory[]>([]);
  const [agents, setAgents] = useState<GeminiAgent[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  
  // Load session & data from localstorage
  useEffect(() => {
    const savedSession = localStorage.getItem("notenext_session") || localStorage.getItem("veridian_session");
    if (savedSession) {
      setSession(JSON.parse(savedSession));
    }

    const savedItems = localStorage.getItem("notenext_items") || localStorage.getItem("veridian_items");
    if (savedItems) {
      const parsed = JSON.parse(savedItems);
      setItems(parsed);
      if (parsed.length > 0) {
        setActiveItemId(parsed[0].id);
      }
    } else {
      setItems(INITIAL_DEMO_ITEMS);
      localStorage.setItem("notenext_items", JSON.stringify(INITIAL_DEMO_ITEMS));
      setActiveItemId("demo-notion");
    }

    // Load or initialize colored categories
    const savedCategories = localStorage.getItem("notenext_categories");
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      setCategories(DEFAULT_CATEGORIES);
      localStorage.setItem("notenext_categories", JSON.stringify(DEFAULT_CATEGORIES));
    }

    // Load or initialize Gemini Agents
    const savedAgents = localStorage.getItem("notenext_agents");
    if (savedAgents) {
      setAgents(JSON.parse(savedAgents));
    } else {
      setAgents(DEFAULT_AGENTS);
      localStorage.setItem("notenext_agents", JSON.stringify(DEFAULT_AGENTS));
    }
  }, []);

  // Sync state items to localStorage
  const saveItems = (updated: WorkspaceItem[]) => {
    setItems(updated);
    localStorage.setItem("notenext_items", JSON.stringify(updated));
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    localStorage.setItem("notenext_session", JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem("notenext_session");
    localStorage.removeItem("veridian_session");
  };

  // Add dynamic workspace element
  const handleAddItem = (type: WorkspaceType) => {
    const categoriesList = ["Projetos", "Brainstorm", "Pessoal", "Roteiros"];
    const chosenCategory = activeCategory !== "Todos" ? activeCategory : categoriesList[Math.floor(Math.random() * categoriesList.length)];
    
    let defaultTitle = "";
    let defaultBlocks: EditorBlock[] = [];
    let defaultElements: CanvasElement[] = [];
    let defaultConnections: CanvasConnection[] = [];
    let defaultNotes: KeepNote[] = [];

    if (type === WorkspaceType.NOTION_DOC) {
      defaultTitle = "Novo Documento Notion";
      defaultBlocks = [{ id: "b-init", type: "paragraph", content: "" }];
    } else if (type === WorkspaceType.MILANOTE_CANVAS) {
      defaultTitle = "Novo Mural Milanote";
      defaultElements = [];
      defaultConnections = [];
    } else if (type === WorkspaceType.KEEP_NOTES) {
      defaultTitle = "Novo Quadro Keep";
      defaultNotes = [];
    }

    const newItem: WorkspaceItem = {
      id: `item-${Math.random().toString(36).substr(2, 9)}`,
      title: defaultTitle,
      type,
      category: chosenCategory,
      isFavorite: false,
      updatedAt: new Date().toISOString(),
      blocks: defaultBlocks,
      elements: defaultElements,
      connections: defaultConnections,
      notes: defaultNotes
    };

    const updated = [newItem, ...items];
    saveItems(updated);
    setActiveItemId(newItem.id);
  };

  const handleSelectItem = (id: string) => {
    setActiveItemId(id);
  };

  const handleChangeItem = (updatedItem: WorkspaceItem) => {
    const updated = items.map(it => {
      if (it.id === updatedItem.id) return updatedItem;
      return it;
    });
    saveItems(updated);
  };

  const toggleFavorite = (itemId: string) => {
    const updated = items.map(it => {
      if (it.id === itemId) {
        return { ...it, isFavorite: !it.isFavorite };
      }
      return it;
    });
    saveItems(updated);
  };

  const deleteCurrentWorkspace = (itemId: string) => {
    const updated = items.filter(it => it.id !== itemId);
    saveItems(updated);
    if (updated.length > 0) {
      setActiveItemId(updated[0].id);
    } else {
      setActiveItemId(null);
    }
  };

  const handleSelectSubcategory = (subName: string, parentCatName: string) => {
    // De acordo com o pedido, a área estará dentro da categoria Produto
    const targetCategory = "Produto";

    // Garante que a categoria "Produto" existe na lista de categorias
    setCategories(prev => {
      const hasProd = prev.some(c => c.name.toLowerCase() === targetCategory.toLowerCase());
      if (!hasProd) {
        const nextCats = [
          ...prev,
          { id: `cat-prod-${Date.now()}`, name: targetCategory, color: "#0ea5e9", order: prev.length }
        ];
        localStorage.setItem("notenext_categories", JSON.stringify(nextCats));
        return nextCats;
      }
      return prev;
    });

    // Procura por um workspace existente com o nome da subcategoria e sob "Produto"
    const existing = items.find(
      it => it.title.toLowerCase() === subName.toLowerCase() && it.category.toLowerCase() === targetCategory.toLowerCase()
    );

    if (existing) {
      setActiveItemId(existing.id);
      setActiveCategory(targetCategory);
    } else {
      // Cria uma nova área de trabalho (Notion style document) com o nome da subcategoria
      const newItem: WorkspaceItem = {
        id: `it-sub-${Math.random().toString(36).substring(2, 9)}`,
        title: subName,
        type: WorkspaceType.NOTION_DOC,
        category: targetCategory,
        isFavorite: false,
        updatedAt: new Date().toLocaleString(),
        blocks: [
          {
            id: `b-sub-1`,
            type: "paragraph",
            content: `Seja bem-vindo(a) à área de trabalho criativa **${subName}** sob a categoria **${targetCategory}**.\n\nExperimente adicionar novos blocos de notas, tarefas, ou cabeçalhos pressionando '/' no editor.`
          }
        ],
        elements: [],
        connections: [],
        notes: []
      };

      const updated = [newItem, ...items];
      saveItems(updated);
      setActiveItemId(newItem.id);
      setActiveCategory(targetCategory);
    }
  };

  // Bridge custom triggers from sub-components to Gemini on server-side using active agents instructions
  const handleTriggerAiFromContext = async (prompt: string, blockIndex: any) => {
    setIsAiLoading(true);
    try {
      const activeAgent = agents.find(a => a.isActive);
      const systemInstruction = activeAgent 
        ? `${activeAgent.systemInstruction}. Você está atuando no papel de: ${activeAgent.role}.` 
        : "Você é o assistente inteligente NoteNext. Escreva com foco em produtividade, criatividade e de forma premium nos detalhes.";

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, systemInstruction })
      });

      const data = await response.json();
      if (data.error) {
        alert(`Erro na IA NoteNext: ${data.error}`);
        return;
      }

      if (data.text) {
        const currentItem = items.find(it => it.id === activeItemId);
        if (currentItem && currentItem.blocks) {
          const updatedBlocks = [...currentItem.blocks];
          const lines = data.text.split("\n").filter((l: string) => l.trim().length > 0);
          
          const newBlocks: EditorBlock[] = lines.map((line: string) => ({
            id: `ai-${Math.random().toString(36).substr(2, 5)}`,
            type: line.trim().startsWith("-") || line.trim().startsWith("*") ? "list" : "paragraph",
            content: line.replace(/^[-*]/, "").trim()
          }));

          const insertionIdx = typeof blockIndex === "number" ? blockIndex + 1 : updatedBlocks.length;
          updatedBlocks.splice(insertionIdx, 0, ...newBlocks);
          
          handleChangeItem({
            ...currentItem,
            blocks: updatedBlocks,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro ao conectar com servidor de IA.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Injects AI suggestions back into Notion, Milanote, or Keep elements on-the-fly
  const handleApplyAiOutput = (text: string) => {
    const currentItem = items.find(it => it.id === activeItemId);
    if (!currentItem) return;

    if (currentItem.type === WorkspaceType.NOTION_DOC && currentItem.blocks) {
      // Ingress as bullet blocks in Editor
      const lines = text.split("\n").filter(l => l.trim().length > 0);
      const newBlocks: EditorBlock[] = lines.map(line => ({
        id: `ai-${Math.random().toString(36).substr(2, 5)}`,
        type: line.trim().startsWith("-") || line.trim().startsWith("*") ? "list" : "paragraph",
        content: line.replace(/^[-*]\s*/, "")
      }));
      handleChangeItem({
        ...currentItem,
        blocks: [...currentItem.blocks, ...newBlocks]
      });
    } else if (currentItem.type === WorkspaceType.MILANOTE_CANVAS && currentItem.elements) {
      // Inject as a big sticky board in Canvas
      const newEl: CanvasElement = {
        id: `ai-canvas-${Math.random().toString(36).substr(2, 5)}`,
        type: "note",
        x: 10 + Math.random() * 100,
        y: 10 + Math.random() * 100,
        width: 250,
        height: 200,
        title: "Brainstorm IA",
        content: text,
        color: "#dcfce7"
      };
      handleChangeItem({
        ...currentItem,
        elements: [...(currentItem.elements || []), newEl]
      });
    } else if (currentItem.type === WorkspaceType.KEEP_NOTES && currentItem.notes) {
      // Create a neat new Keep note card
      const newNote: KeepNote = {
        id: `ai-note-${Math.random().toString(36).substr(2, 5)}`,
        title: "⚡ Veridia IA Sugestão",
        content: text,
        color: "#dcfce7",
        pinned: false,
        tags: ["IA", "Brainstorm"],
        checklist: [],
        updatedAt: new Date().toLocaleTimeString()
      };
      handleChangeItem({
        ...currentItem,
        notes: [newNote, ...(currentItem.notes || [])]
      });
    }
  };

  // Filter items logic (Search + Categories)
  const filteredItems = items.filter(it => {
    const matchesSearch = it.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "Todos" || it.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const currentItem = items.find(it => it.id === activeItemId) || null;

  // Unauthenticated screen
  if (!session || !session.isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafbfb] font-sans relative">
      
      {/* 1. Left Navigation Sidebar */}
      {!isSidebarCollapsed ? (
        <Sidebar
          user={session}
          items={filteredItems}
          activeItemId={activeItemId}
          onSelectItem={handleSelectItem}
          onAddItem={handleAddItem}
          onLogout={handleLogout}
          onSearchChange={setSearchQuery}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          categoriesList={categories}
          onOpenSettings={() => setIsConfigOpen(true)}
          isWide={isSidebarWide}
          onToggleWide={() => setIsSidebarWide(!isSidebarWide)}
          onCollapse={() => setIsSidebarCollapsed(true)}
          onDeleteItem={deleteCurrentWorkspace}
          onUpdateCategories={setCategories}
          onSelectSubcategory={handleSelectSubcategory}
        />
      ) : (
        /* Floating Restore Menu Button on left edge when collapsed */
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="absolute left-4 top-4 z-30 p-2.5 bg-[#fcfdfd] hover:bg-brand-50 border border-brand-100 text-brand-850 hover:text-brand-950 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer group"
          title="Restaurar Menu Lateral"
        >
          <Menu className="w-4 h-4 text-brand-600 group-hover:rotate-90 transition-transform" />
          <span className="text-xs font-extrabold font-sans">Restaurar Menu</span>
        </button>
      )}

      {/* 2. Main Workspace Editor Router Container */}
      <main className="flex-1 overflow-hidden flex flex-col relative bg-white">
        
        {/* Dynamic Inner Upper Controls segment */}
        {currentItem ? (
          <div className="absolute top-4 right-14 z-20 flex items-center gap-2">
            
            {/* Toggle Favourite stars */}
            <button
              onClick={() => toggleFavorite(currentItem.id)}
              className={`p-1.5 rounded-lg border transition-all ${
                currentItem.isFavorite 
                  ? "bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100" 
                  : "bg-white border-gray-250 text-gray-400 hover:text-amber-500 hover:border-gray-300"
              }`}
              title={currentItem.isFavorite ? "Remover dos Favoritos" : "Marcar como Favorito"}
            >
              <Star className={`w-4 h-4 ${currentItem.isFavorite ? "fill-current" : ""}`} />
            </button>

            {/* Delete workspace */}
            <button
              onClick={() => {
                if (confirm(`Tem certeza de que gostaria de excluir a área "${currentItem.title}"?`)) {
                  deleteCurrentWorkspace(currentItem.id);
                }
              }}
              className="p-1 px-2 hover:bg-red-50 text-gray-350 hover:text-red-500 text-xs font-semibold rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer"
              title="Excluir espaço"
            >
              Excluir
            </button>

          </div>
        ) : null}

        {/* View switching logic */}
        <AnimatePresence mode="wait">
          {!currentItem ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white"
            >
              <Layers className="w-16 h-16 text-brand-100 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 font-display">Nenhum Ambiente Aberto</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-xs leading-normal">
                Use o botão azul de criação no painel esquerdo para inaugurar novos editores Notion ou murais Milanote!
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={currentItem.id}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.25 }}
              className="flex-1 flex h-full overflow-hidden"
            >
              {currentItem.type === WorkspaceType.NOTION_DOC && (
                <BlockEditor
                  item={currentItem}
                  onChangeItem={handleChangeItem}
                  onTriggerAi={handleTriggerAiFromContext}
                  isAiLoading={isAiLoading}
                  onOpenNotebook={() => setIsNotebookOpen(true)}
                />
              )}
              {currentItem.type === WorkspaceType.MILANOTE_CANVAS && (
                <CanvasWorkspace
                  item={currentItem}
                  onChangeItem={handleChangeItem}
                  onTriggerAi={handleTriggerAiFromContext}
                  isAiLoading={isAiLoading}
                />
              )}
              {currentItem.type === WorkspaceType.KEEP_NOTES && (
                <KeepWorkspace
                  item={currentItem}
                  onChangeItem={handleChangeItem}
                  onTriggerAi={handleTriggerAiFromContext}
                  isAiLoading={isAiLoading}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Unified SaaS Configuration Panel Overlay */}
      <SaaSConfigPanel
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        categories={categories}
        onUpdateCategories={(updatedCats) => {
          setCategories(updatedCats);
          localStorage.setItem("notenext_categories", JSON.stringify(updatedCats));
        }}
        agents={agents}
        onUpdateAgents={(updatedAgents) => {
          setAgents(updatedAgents);
          localStorage.setItem("notenext_agents", JSON.stringify(updatedAgents));
        }}
        workspaces={items}
        onChangeAllItems={(updatedWorkspaces) => saveItems(updatedWorkspaces)}
      />

      {/* Unified Premium Smart Notebook Panel Overlay */}
      {currentItem && (
        <SmartNotebook
          isOpen={isNotebookOpen}
          onClose={() => setIsNotebookOpen(false)}
          currentItem={currentItem}
          workspaces={items}
          onChangeItem={handleChangeItem}
          onChangeAllItems={(updatedWorkspaces) => saveItems(updatedWorkspaces)}
          onTriggerAi={async (prompt) => {
            try {
              const activeAgent = agents.find(a => a.isActive);
              const systemInstruction = activeAgent 
                ? `${activeAgent.systemInstruction}. Você está atuando no papel de: ${activeAgent.role}.` 
                : "Você é o assistente inteligente NoteNext. Responda em formato de notas organizadas.";
              const response = await fetch("/api/gemini", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, systemInstruction })
              });
              const data = await response.json();
              if (data.error) {
                throw new Error(data.error);
              }
              return data.text || "";
            } catch (e: any) {
              alert(`Erro na IA do Caderno Inteligente: ${e.message}`);
              return "";
            }
          }}
        />
      )}

    </div>
  );
}
