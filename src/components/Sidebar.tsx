/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Plus, 
  Search, 
  Star, 
  BookOpen, 
  Layers, 
  StickyNote, 
  FolderLock, 
  LogOut, 
  ChevronRight, 
  Tag, 
  Sparkles,
  Bookmark,
  Signature,
  Settings,
  RefreshCw,
  Trash2
} from "lucide-react";
import { WorkspaceItem, WorkspaceType, UserSession, WorkspaceCategory } from "../types";

/**
 * @description Application side navigation bar.
 * Controls category filtration, dynamic active workspaces, search filters, and the custom platform logo.
 */
interface SidebarProps {
  user: UserSession;
  items: WorkspaceItem[];
  activeItemId: string | null;
  onSelectItem: (id: string) => void;
  onAddItem: (type: WorkspaceType) => void;
  onLogout: () => void;
  onSearchChange: (query: string) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  categoriesList: WorkspaceCategory[];
  onOpenSettings: () => void;
  isWide: boolean;
  onToggleWide: () => void;
  onCollapse: () => void;
  onDeleteItem: (id: string) => void;
  onUpdateCategories: (cats: WorkspaceCategory[]) => void;
  onSelectSubcategory?: (subName: string, parentCatName: string) => void;
  onSelectNotebookPagesHub?: () => void;
}

export default function Sidebar({
  user,
  items,
  activeItemId,
  onSelectItem,
  onAddItem,
  onLogout,
  onSearchChange,
  activeCategory,
  onSelectCategory,
  categoriesList,
  onOpenSettings,
  isWide,
  onToggleWide,
  onCollapse,
  onDeleteItem,
  onUpdateCategories,
  onSelectSubcategory,
  onSelectNotebookPagesHub
}: SidebarProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [newSubcatName, setNewSubcatName] = useState("");
  
  // Custom sidebar width state and dragging state
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem("notenext_sidebar_width");
    if (saved) return parseInt(saved, 10);
    return isWide ? 320 : 256;
  });
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    setSidebarWidth(isWide ? 320 : 256);
  }, [isWide]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(600, moveEvent.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsResizing(false);
      const finalWidth = Math.max(180, Math.min(600, upEvent.clientX));
      localStorage.setItem("notenext_sidebar_width", finalWidth.toString());
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchVal(val);
    onSearchChange(val);
  };

  const getIconForType = (type: WorkspaceType) => {
    switch (type) {
      case WorkspaceType.NOTION_DOC:
        return <BookOpen className="w-3.5 h-3.5 text-blue-500" />;
      case WorkspaceType.MILANOTE_CANVAS:
        return <Layers className="w-3.5 h-3.5 text-indigo-500" />;
      case WorkspaceType.KEEP_NOTES:
        return <StickyNote className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const getLabelForType = (type: WorkspaceType) => {
    switch (type) {
      case WorkspaceType.NOTION_DOC:
        return "Editor Notion";
      case WorkspaceType.MILANOTE_CANVAS:
        return "Notas Milanote";
      case WorkspaceType.KEEP_NOTES:
        return "Notas Keep";
    }
  };

  // Removed hardcoded categories

  return (
    <aside 
      style={{ width: `${sidebarWidth}px`, transition: isResizing ? "none" : "width 240ms cubic-bezier(0.16, 1, 0.3, 1)" }}
      className="bg-[#fcfdfd] border-r border-[#eaf2ed] h-screen flex flex-col font-sans select-none relative z-20"
    >
      {/* Resizable drag border handle */}
      <div 
        onMouseDown={handleMouseDown}
        className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-brand-500/20 active:bg-brand-500/40 z-30 transition-colors ${
          isResizing ? "bg-brand-500/30 w-2" : ""
        }`}
        title="Arraste para ajustar o tamanho do menu"
      />
      
      {/* Top Application Ribbon */}
      <div className="p-4 border-b border-[#eaf2ed] flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-2.5 truncate flex-1">
            {/* Animated Hand Writing Logo */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-brand-600/10 text-white relative overflow-hidden group flex-shrink-0">
              <motion.div
                animate={{ 
                  x: [0, 2.5, -1, 3, 0], 
                  y: [0, -1.2, 2.2, -1, 0],
                  rotate: [0, 6, -4, 7, 0] 
                }}
                transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </motion.div>
              <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4.5 h-0.5 bg-emerald-300 rounded-full animate-pulse" />
            </div>

            <div className="truncate">
              <h2 className="text-sm font-black font-display text-gray-900 tracking-tight leading-none flex items-center gap-1">
                <span>NoteNext</span>
                <span className="text-[8px] bg-brand-100 text-[#064e3b] font-bold px-1.5 py-0.5 rounded uppercase font-sans tracking-wide">Pro</span>
              </h2>
              <span className="text-[10px] text-gray-405 mt-1 block truncate leading-none">luiz.rogerios@gmail.com</span>
            </div>
          </div>

          {/* Sizing & Collapse actions row */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={onToggleWide}
              className="p-1 rounded hover:bg-brand-50/80 text-gray-400 hover:text-brand-900 transition-all cursor-pointer"
              title={isWide ? "Estreitar menu lateral" : "Alargar menu lateral"}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                {isWide ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M20 19l-7-7 7-7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M4 5l7 7-7 7" />
                )}
              </svg>
            </button>
            <button
              onClick={onCollapse}
              className="p-1 rounded hover:bg-neutral-100 text-gray-400 hover:text-red-500 transition-all cursor-pointer"
              title="Esconder menu lateral completamente"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Discreet elegant automatic saving indicator under logo/email */}
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100/60 w-max leading-none shadow-3xs">
          <RefreshCw className="w-3 h-3 text-emerald-600 animate-spin-slow" />
          <span>✓ Auto Save Active</span>
        </div>

        {/* Notion Style Edit Mode Label - Exact Match to prompt */}
        <div className="flex items-center gap-1 text-[9px] font-bold text-blue-850 bg-blue-50/70 px-2.5 py-1 rounded-xl border border-blue-100/60 w-max leading-none shadow-3xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>Modo Edição Notion-style</span>
        </div>
      </div>

      {/* Floating Sparkle/AI Prompt Quick Bar */}
      <div className="px-3 pt-3">
        <div className="bg-gradient-to-r from-emerald-500/5 to-teal-500/5 hover:from-emerald-500/10 hover:to-teal-500/10 border border-brand-500/10 rounded-xl p-2.5 transition-all text-xs flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center border border-brand-500/15">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          </div>
          <div>
            <span className="font-semibold text-brand-900 block leading-tight">NoteNext IA Ativa</span>
            <span className="text-[10px] text-brand-700/70 block">Gere ideias e resumos em segundos</span>
          </div>
        </div>
      </div>

      {/* Search Input Filter */}
      <div className="p-3">
        <div className="relative">
          <input
            type="text"
            value={searchVal}
            onChange={handleSearch}
            placeholder="Pesquisar documento..."
            className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-150 focus:outline-none focus:border-brand-500 transition-all font-sans"
          />
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Primary Action Button (Add element) */}
      <div className="px-3 pb-2 relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-lg transition-all shadow-sm shadow-brand-600/10 hover:shadow-brand-600/20 flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Área Criativa</span>
        </button>

        {showAddMenu && (
          <>
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setShowAddMenu(false)}
            />
            <div className="absolute top-full left-3 right-3 mt-1 bg-white rounded-lg border border-gray-100 shadow-xl py-1 z-40 text-xs">
              <button
                onClick={() => { onAddItem(WorkspaceType.NOTION_DOC); setShowAddMenu(false); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-700 flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold block">Espaço Notion</span>
                  <span className="text-[10px] text-gray-400">Editor modular por blocos</span>
                </div>
              </button>

              <button
                onClick={() => { onAddItem(WorkspaceType.MILANOTE_CANVAS); setShowAddMenu(false); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-700 border-t border-gray-50 flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold block">Mural Milanote</span>
                  <span className="text-[10px] text-gray-400">Canvas infinito visual livre</span>
                </div>
              </button>

              <button
                onClick={() => { onAddItem(WorkspaceType.KEEP_NOTES); setShowAddMenu(false); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 text-gray-700 border-t border-gray-50 flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded bg-amber-50 flex items-center justify-center text-amber-600">
                  <StickyNote className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold block">Notas Keep</span>
                  <span className="text-[10px] text-gray-400">Cards e checklists ágeis</span>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Smart Notebook general leaves tracker button */}
      {(() => {
        const allNotebookPages = items.reduce<any[]>((acc, item) => {
          const pages = item.notebookPages || [];
          return [
            ...acc,
            ...pages.map(page => ({
              ...page,
              parentWorkspaceId: item.id,
              parentWorkspaceTitle: item.title
            }))
          ];
        }, []);

        if (allNotebookPages.length === 0) return null;

        return (
          <div className="px-3 pb-2 pt-1">
            <button
              onClick={() => onSelectNotebookPagesHub?.()}
              className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 text-emerald-850 font-bold text-xs rounded-lg transition-all shadow-3xs flex items-center justify-between px-3 cursor-pointer"
              title="Ver todas as folhas do Caderno Inteligente"
            >
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-emerald-650 animate-pulse" />
                <span>Caderno Inteligente</span>
              </span>
              <span className="bg-emerald-650 text-white text-[10px] px-2 py-0.5 rounded-full font-bold leading-none">
                {allNotebookPages.length} {allNotebookPages.length === 1 ? "folha" : "folhas"}
              </span>
            </button>
          </div>
        );
      })()}

      {/* Main Navigator Container */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2">
        {/* Categories / Tags filter */}
        <div>
          <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
            Categorias
          </span>
          <div className="space-y-0.5">
            {/* Standard "Todos" Category Filter */}
            <button
              onClick={() => onSelectCategory("Todos")}
              className={`w-full px-3 py-1 flex items-center justify-between text-left text-xs rounded-lg transition-all ${
                activeCategory === "Todos"
                  ? "bg-brand-50 text-brand-850 font-bold"
                  : "text-gray-650 hover:bg-gray-50/70"
              }`}
            >
              <span className="flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-brand-655" />
                <span>Todos os Workspaces</span>
              </span>
              <span className="text-[9px] bg-gray-100 text-gray-550 px-1.5 py-0.5 rounded-full border border-gray-200 font-bold leading-none">
                {items.length}
              </span>
            </button>

            {/* Dynamic Configured Colored Categories */}
            {categoriesList.map((cat) => {
              const isExpanded = expandedCatId === cat.id;
              const catWorkspaces = items.filter(
                (i) => i.category.toLowerCase() === cat.name.toLowerCase()
              );

              return (
                <div key={cat.id} className="my-1 rounded-lg overflow-hidden border border-gray-150/20 bg-gray-50/10">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.name);
                      setExpandedCatId(isExpanded ? null : cat.id);
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between text-left text-xs rounded-lg transition-all cursor-pointer ${
                      activeCategory.toLowerCase() === cat.name.toLowerCase()
                        ? "bg-brand-50/60 text-brand-900 font-bold border border-brand-100"
                        : "text-gray-650 hover:bg-gray-50/70"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span 
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold leading-none border"
                        style={{ backgroundColor: `${cat.color}15`, color: cat.color, borderColor: `${cat.color}25` }}
                      >
                        {catWorkspaces.length}
                      </span>
                      <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </button>

                  {/* Nested expanded container space for listing workspaces under their category */}
                  {isExpanded && (
                    <div className="pl-3 pr-2 py-1.5 border-t border-dashed border-gray-100/60 space-y-1 bg-[#f5f8f6]/50">
                      {catWorkspaces.length === 0 ? (
                        <div className="text-[10px] text-gray-400 italic py-1 pl-1">
                          Nenhum documento nesta categoria.
                        </div>
                      ) : (
                        catWorkspaces.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => onSelectItem(item.id)}
                            className={`w-full px-2 py-1 flex items-center justify-between text-xs rounded transition-all select-none ${
                              activeItemId === item.id
                                ? "bg-white text-brand-900 border-l-2 border-brand-600 font-bold shadow-3xs"
                                : "text-gray-650 hover:bg-white/60"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 truncate py-0.5">
                              {getIconForType(item.type)}
                              <span className="truncate text-[11px] font-medium leading-none">{item.title}</span>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Deseja excluir o documento "${item.title}"?`)) {
                                  onDeleteItem(item.id);
                                }
                              }}
                              className="px-1 text-gray-400 hover:text-red-500 rounded bg-transparent hover:bg-red-50 transition-all cursor-pointer"
                              title="Excluir documento"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Button to quickly trigger Settings -> Categories tab */}
          <button
            onClick={onOpenSettings}
            className="w-full mt-2 text-center text-[10px] font-bold text-brand-800 hover:text-brand-950 flex items-center justify-center gap-1 py-1 hover:bg-brand-50/40 rounded-lg transition-all border border-dashed border-brand-100 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Adicionar Categoria</span>
          </button>
        </div>

        {/* Favorite Starred Items */}
        {items.some(i => i.isFavorite) && (
          <div>
            <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 block mb-1.5">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Favoritos</span>
            </span>
            <div className="space-y-0.5">
              {items
                .filter(i => i.isFavorite)
                .map(item => (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item.id)}
                    className={`w-full px-3 py-1.5 text-left text-xs rounded-md flex items-center justify-between transition-all group ${
                      activeItemId === item.id
                        ? "bg-emerald-50 text-brand-900 border-l-2 border-brand-500 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {getIconForType(item.type)}
                      <span className="truncate">{item.title}</span>
                    </span>
                    <Bookmark className="w-2.5 h-2.5 text-amber-500 fill-amber-500 opacity-50 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ))}
            </div>
          </div>
        )}

      </div>

      {/* Sidebar Footer User Info block */}
      <div className="p-3 border-t border-[#eaf2ed] bg-gray-50/50 space-y-2.5">
        
        {/* Settings Launcher Shortcut */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full py-1.5 bg-white border border-gray-200 hover:bg-brand-50 text-brand-850 hover:border-brand-200 text-gray-705 font-bold text-[10.5px] rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-3xs"
        >
          <Settings className="w-3.5 h-3.5 text-brand-600" />
          <span>Gerenciar Agentes & Categorias</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center font-bold text-brand-850 text-xs">
              LR
            </div>
            <div className="truncate max-w-[120px]">
              <span className="block text-xs font-bold text-gray-800 leading-none truncate">{user.name}</span>
              <span className="text-[10px] text-gray-400 block leading-tight mt-0.5">MFA Protegido</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sair do Sistema"
            className="w-7 h-7 rounded-md hover:bg-red-50 text-gray-450 hover:text-red-650 flex items-center justify-center transition-all border border-transparent hover:border-red-100"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
          <FolderLock className="w-3 h-3 text-brand-500" />
          <span>Conexão Local Segura</span>
        </div>
      </div>

    </aside>
  );
}
