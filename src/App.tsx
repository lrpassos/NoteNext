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
  Star,
  Trash2,
  BookOpen
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
import AgentChatWidget from "./components/AgentChatWidget";

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
  
  // Custom states for hubs and notebook leaf focused navigation
  const [viewType, setViewType] = useState<"workspace" | "category-hub" | "notebook-pages-hub">("workspace");
  const [notebookInitialPageId, setNotebookInitialPageId] = useState<string | null>(null);
  
  // Load session & data from localstorage
  useEffect(() => {
    const savedSession = localStorage.getItem("notenext_session") || localStorage.getItem("veridian_session");
    if (savedSession) {
      setSession(JSON.parse(savedSession));
    }

    const savedItems = localStorage.getItem("notenext_items") || localStorage.getItem("veridian_items");
    if (savedItems) {
      let parsed = JSON.parse(savedItems);
      // Clean up items in trash that are older than 30 days
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 65 * 1000; // 30 days
      const activeLength = parsed.length;
      parsed = parsed.filter((it: any) => {
        if (it.isInTrash && it.deletedAt) {
          const deleteTime = new Date(it.deletedAt).getTime();
          if (now - deleteTime >= thirtyDaysMs) {
            return false;
          }
        }
        return true;
      });
      if (parsed.length !== activeLength) {
        localStorage.setItem("notenext_items", JSON.stringify(parsed));
      }
      setItems(parsed);
      const activeList = parsed.filter((it: any) => !it.isInTrash);
      if (activeList.length > 0) {
        setActiveItemId(activeList[0].id);
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
    setViewType("workspace");
  };

  const handleSelectCategory = (catName: string) => {
    setActiveCategory(catName);
    if (catName === "Todos") {
      setViewType("workspace");
    } else {
      setViewType("category-hub");
    }
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
    handleMoveToTrash(itemId);
  };

  const handleMoveToTrash = (itemId: string) => {
    const updated = items.map(it => {
      if (it.id === itemId) {
        return {
          ...it,
          isInTrash: true,
          deletedAt: new Date().toISOString()
        };
      }
      return it;
    });
    saveItems(updated);
    
    // Select alternative active workspace if the current one has gone to the trash
    if (activeItemId === itemId) {
      const remainingActive = updated.filter(it => !it.isInTrash);
      if (remainingActive.length > 0) {
        setActiveItemId(remainingActive[0].id);
      } else {
        setActiveItemId(null);
      }
    }
  };

  const handleRestoreFromTrash = (itemId: string) => {
    const updated = items.map(it => {
      if (it.id === itemId) {
        return {
          ...it,
          isInTrash: false,
          deletedAt: undefined
        };
      }
      return it;
    });
    saveItems(updated);
    setActiveItemId(itemId);
    setViewType("workspace");
  };

  const handlePermanentDelete = (itemId: string) => {
    const updated = items.filter(it => it.id !== itemId);
    saveItems(updated);
    if (activeItemId === itemId) {
      const remainingActive = updated.filter(it => !it.isInTrash);
      if (remainingActive.length > 0) {
        setActiveItemId(remainingActive[0].id);
      } else {
        setActiveItemId(null);
      }
    }
  };

  const handleEmptyTrash = () => {
    const updated = items.filter(it => !it.isInTrash);
    saveItems(updated);
  };

  const handleDeleteCategory = (catId: string) => {
    const categoryToDelete = categories.find(c => c.id === catId);
    if (!categoryToDelete) return;
    
    if (confirm(`Tem certeza de que gostaria de excluir a categoria "${categoryToDelete.name}"?`)) {
      const updatedCategories = categories.filter(c => c.id !== catId);
      setCategories(updatedCategories);
      localStorage.setItem("notenext_categories", JSON.stringify(updatedCategories));
      
      const fallback = updatedCategories.length > 0 ? updatedCategories[0].name : "Pessoal";
      const updatedWorkspaces = items.map(w => {
        if (w.category.toLowerCase() === categoryToDelete.name.toLowerCase()) {
          return { ...w, category: fallback };
        }
        return w;
      });
      saveItems(updatedWorkspaces);
      
      if (activeCategory.toLowerCase() === categoryToDelete.name.toLowerCase()) {
        setActiveCategory("Todos");
        setViewType("workspace");
      }
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
      setViewType("workspace");
    } else {
      // Cria uma nova área de trabalho (Notion style document) com o nome da subcategoria
      // Contendo dois blocos de parágrafo separados para dar uma quebra de linha elegante na mensagem
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
            content: `Seja bem-vindo(a) à área de trabalho criativa **${subName}** sob a categoria **${targetCategory}**.`
          },
          {
            id: `b-sub-2`,
            type: "paragraph",
            content: `Experimente adicionar novos blocos de notas, tarefas, ou cabeçalhos pressionando '/' no editor.`
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
      setViewType("workspace");
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
    if (it.isInTrash) return false;
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
          items={items}
          activeItemId={activeItemId}
          onSelectItem={handleSelectItem}
          onAddItem={handleAddItem}
          onLogout={handleLogout}
          onSearchChange={setSearchQuery}
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          categoriesList={categories}
          onOpenSettings={() => setIsConfigOpen(true)}
          isWide={isSidebarWide}
          onToggleWide={() => setIsSidebarWide(!isSidebarWide)}
          onCollapse={() => setIsSidebarCollapsed(true)}
          onDeleteItem={deleteCurrentWorkspace}
          onUpdateCategories={setCategories}
          onSelectSubcategory={handleSelectSubcategory}
          onSelectNotebookPagesHub={() => setViewType("notebook-pages-hub")}
          onDeleteCategory={handleDeleteCategory}
          onRestoreItem={handleRestoreFromTrash}
          onPermanentDeleteItem={handlePermanentDelete}
          onEmptyTrash={handleEmptyTrash}
          onOpenNotebook={() => {
            const actives = items.filter(it => !it.isInTrash);
            if (actives.length === 0) {
              handleAddItem(WorkspaceType.NOTION_DOC);
            } else if (!activeItemId || items.find(it => it.id === activeItemId)?.isInTrash) {
              setActiveItemId(actives[0].id);
            }
            setIsNotebookOpen(true);
          }}
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
        {currentItem && viewType === "workspace" ? (
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
          {viewType === "category-hub" ? (
            <motion.div
              key="category-hub"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto bg-[#fafcfb] p-8 lg:p-14 font-sans"
            >
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Banner */}
                <div className="p-6 bg-white border border-gray-150 rounded-2xl shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: categories.find(c => c.name.toLowerCase() === activeCategory.toLowerCase())?.color || "#10b981" }}
                      />
                      <h2 className="text-2xl font-extrabold font-display text-gray-900">
                        {activeCategory}
                      </h2>
                    </div>
                    <p className="text-xs text-gray-400">
                      Painel central de subcategorias para a categoria <span className="font-semibold text-gray-650">{activeCategory}</span>.
                    </p>
                  </div>

                  {/* Quick creation of subcategories in Hub Page */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const name = formData.get("subName") as string;
                      if (!name || !name.trim()) return;

                      const currentCat = categories.find(c => c.name.toLowerCase() === activeCategory.toLowerCase());
                      if (currentCat) {
                        const freshSub = {
                          id: `sub-${Math.random().toString(36).substring(2, 6)}`,
                          name: name.trim()
                        };
                        const updated = categories.map(c => {
                          if (c.id === currentCat.id) {
                            return {
                              ...c,
                              subcategories: [...(c.subcategories || []), freshSub]
                            };
                          }
                          return c;
                        });
                        setCategories(updated);
                        localStorage.setItem("notenext_categories", JSON.stringify(updated));
                      }
                      e.currentTarget.reset();
                    }}
                    className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-150 w-full sm:w-auto"
                  >
                    <input
                      type="text"
                      name="subName"
                      placeholder="Nova subcategoria..."
                      className="bg-transparent text-xs placeholder-gray-400 outline-none px-3 py-1.5 w-full sm:w-44 font-sans border-none"
                      required
                    />
                    <button
                      type="submit"
                      className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-lg px-3 py-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Criar Subcategoria
                    </button>
                  </form>
                </div>

                {/* Subcategories Bento-Grid Cards */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-405 uppercase tracking-widest">
                    Subcategorias / Áreas de Trabalho em Cartão
                  </h3>

                  {(() => {
                    const currentCatObj = categories.find(c => c.name.toLowerCase() === activeCategory.toLowerCase());
                    const subcats = currentCatObj?.subcategories || [];

                    if (subcats.length === 0) {
                      return (
                        <div className="text-center p-12 bg-white border border-gray-150 rounded-2xl">
                          <Layers className="w-12 h-12 text-brand-100 mx-auto mb-3" />
                          <span className="text-xs font-bold text-gray-700 block">Nenhuma subcategoria criada sob {activeCategory}</span>
                          <span className="text-[11px] text-gray-450 block mt-1">Crie sua primeira subcategoria usando o campo acima.</span>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {subcats.map((sub) => {
                          // Find any existing workspaces connected to this subcategory
                          const countWorkspaces = items.filter(
                            it => it.title.trim().toLowerCase() === sub.name.trim().toLowerCase() && it.category === "Produto"
                          ).length;

                          return (
                            <div
                              key={sub.id}
                              className="group bg-white border border-gray-150 hover:border-brand-500 rounded-2xl p-5 hover:shadow-xs transition-all duration-200 flex flex-col justify-between min-h-[160px]"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center border border-emerald-100/50">
                                    <BookmarkCheck className="w-4 h-4 text-brand-650" />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Tem certeza de que deseja excluir a subcategoria "${sub.name}"?`)) {
                                        const updated = categories.map(c => {
                                          if (c.id === currentCatObj.id) {
                                            return {
                                              ...c,
                                              subcategories: (c.subcategories || []).filter(s => s.id !== sub.id)
                                            };
                                          }
                                          return c;
                                        });
                                        setCategories(updated);
                                        localStorage.setItem("notenext_categories", JSON.stringify(updated));
                                      }
                                    }}
                                    className="text-gray-300 hover:text-red-650 p-1 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                                    title="Excluir subcategoria"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <h4 className="font-extrabold font-display text-base text-gray-850 truncate group-hover:text-brand-900 leading-snug">
                                  {sub.name}
                                </h4>
                                <span className="text-[10px] text-gray-400 block pb-3">
                                  {countWorkspaces > 0 ? `✓ Vinculada a ${countWorkspaces} área sob Produto` : "Ainda sem documento ativo"}
                                </span>
                              </div>

                              <button
                                onClick={() => handleSelectSubcategory(sub.name, activeCategory)}
                                className="w-full text-center py-2 bg-[#f4faf7] hover:bg-brand-600 hover:text-white border border-[#eaf4ef] text-brand-850 font-bold text-xs rounded-lg transition-all cursor-pointer"
                              >
                                Abrir Área Criativa
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          ) : viewType === "notebook-pages-hub" ? (
            <motion.div
              key="notebook-hub"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto bg-[#fafcfb] p-8 lg:p-14 font-sans"
            >
              <div className="max-w-4xl mx-auto space-y-8">
                {/* General Leaves Header */}
                <div className="p-6 bg-white border border-emerald-100 rounded-2xl shadow-3xs flex flex-col sm:flex-row items-center justify-between gap-6 bg-gradient-to-r from-emerald-50/10 to-white">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-650 animate-bounce" />
                      <h2 className="text-xl font-extrabold font-display text-gray-900">
                        Fólio Geral de Folhas
                      </h2>
                    </div>
                    <p className="text-xs text-gray-400">
                      Consolidação de todas as páginas criadas no <span className="font-semibold text-emerald-750">Caderno Inteligente</span> através dos seus workspaces NoteNext. Use para revisões instantâneas e alterações ágeis.
                    </p>
                  </div>

                  <div className="px-3.5 py-1.5 bg-emerald-100 text-emerald-850 border border-emerald-200 font-extrabold rounded-full text-xs">
                    {(() => {
                      const allCount = items.reduce((acc, it) => acc + (it.notebookPages || []).length, 0);
                      return `${allCount} ${allCount === 1 ? "folha" : "folhas"}`;
                    })()}
                  </div>
                </div>

                {/* Cards Grid */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                    Folhas Ativas no Sistema
                  </h3>

                  {(() => {
                    const allPages = items.reduce<any[]>((acc, item) => {
                      const pagesList = item.notebookPages || [];
                      return [
                        ...acc,
                        ...pagesList.map(p => ({
                          ...p,
                          parentWorkspaceId: item.id,
                          parentWorkspaceTitle: item.title
                        }))
                      ];
                    }, []);

                    if (allPages.length === 0) {
                      return (
                        <div className="text-center p-12 bg-white border border-gray-150 rounded-2xl">
                          <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                          <span className="text-xs font-bold text-gray-700 block text-gray-400">Você ainda não tem fólio de folhas criado.</span>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {allPages.map((page) => (
                          <div
                            key={page.id}
                            onClick={() => {
                              setActiveItemId(page.parentWorkspaceId);
                              setNotebookInitialPageId(page.id);
                              setViewType("workspace");
                              setIsNotebookOpen(true);
                            }}
                            className="bg-white border border-gray-150 hover:border-emerald-300 rounded-2xl p-5 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between min-h-[150px]"
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#eaf5ef] text-emerald-800 border border-emerald-100/50">
                                  Ativo em: {page.parentWorkspaceTitle}
                                </span>
                                <span className="text-[9px] text-gray-400 font-mono">ID: {page.id}</span>
                              </div>

                              <h4 className="font-extrabold font-display text-gray-800 text-base leading-tight group-hover:text-emerald-750">
                                {page.title || "Sem título"}
                              </h4>

                              <p className="text-xs text-gray-450 line-clamp-2 leading-relaxed">
                                {page.content || "Sem notas adicionais na página. Clique para abrir o editor e começar a redigir."}
                              </p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[10px] text-brand-700 font-bold group-hover:translate-x-1 duration-150 transition-transform">
                                Alterar Página →
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          ) : !currentItem ? (
            <motion.div 
              key="empty"
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
              initial={{ opacity: 0, scale: 0.995 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.995 }}
              transition={{ duration: 0.2 }}
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

      {/* AgentChatWidget Floating Chat Interface */}
      <AgentChatWidget agents={agents} />

    </div>
  );
}
