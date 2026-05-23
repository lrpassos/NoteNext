/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  StickyNote, 
  ArrowUpRight, 
  MousePointer, 
  GitCommit,
  CheckCircle,
  HelpCircle,
  Sparkles
} from "lucide-react";
import { CanvasElement, CanvasConnection, WorkspaceItem } from "../types";

interface CanvasWorkspaceProps {
  item: WorkspaceItem;
  onChangeItem: (updatedItem: WorkspaceItem) => void;
  onTriggerAi: (prompt: string, elementId: string) => void;
  isAiLoading: boolean;
}

export default function CanvasWorkspace({
  item,
  onChangeItem,
  onTriggerAi,
  isAiLoading
}: CanvasWorkspaceProps) {
  const [elements, setElements] = useState<CanvasElement[]>(item.elements || []);
  const [connections, setConnections] = useState<CanvasConnection[]>(item.connections || []);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  // Drag states
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [elementOffset, setElementOffset] = useState({ x: 0, y: 0 });

  // Node connection builder state
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);

  // Pan state matching
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setElements(item.elements || []);
    setConnections(item.connections || []);
  }, [item.id, item.elements, item.connections]);

  const updateParent = (newElements: CanvasElement[], newConnections: CanvasConnection[]) => {
    onChangeItem({
      ...item,
      elements: newElements,
      connections: newConnections,
      updatedAt: new Date().toISOString()
    });
  };

  // Dragging mechanisms
  const handleElementDragStart = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation();
    if (connectingFromId) return; // ignore drag during connection
    setDraggedElementId(element.id);
    
    // Scale matching offset in canvas space
    setDragStart({ x: e.clientX, y: e.clientY });
    setElementOffset({ x: element.x, y: element.y });
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    if (draggedElementId) {
      const dx = (e.clientX - dragStart.x) / zoom;
      const dy = (e.clientY - dragStart.y) / zoom;
      
      const updated = elements.map((el) => {
        if (el.id === draggedElementId) {
          return {
            ...el,
            x: Math.round(elementOffset.x + dx),
            y: Math.round(elementOffset.y + dy)
          };
        }
        return el;
      });
      setElements(updated);
      updateParent(updated, connections);
    } else if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanOffset({
        x: panOffset.x + dx,
        y: panOffset.y + dy
      });
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = () => {
    setDraggedElementId(null);
    setIsPanning(false);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // left click pan
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  // CRUD Elements
  const addElement = (type: "note" | "image" | "link") => {
    // Generate right in the center of active screen
    const newElement: CanvasElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      x: -panOffset.x + 150 + Math.random() * 80,
      y: -panOffset.y + 150 + Math.random() * 85,
      width: type === "note" ? 180 : 220,
      height: type === "note" ? 140 : 180,
      content: type === "note" 
        ? "Nova idéia para documentar. Dica: Arraste este card!" 
        : type === "image" 
          ? "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80"
          : "https://nextjs.org",
      title: type === "note" 
        ? "Nota Adesiva" 
        : type === "image" 
          ? "Mural de Referência Visual"
          : "Next.js Framework",
      color: type === "note" ? "#dcfce7" : undefined, // Pale modern green background default
      linkUrl: type === "link" ? "https://nextjs.org" : undefined
    };

    const updated = [...elements, newElement];
    setElements(updated);
    updateParent(updated, connections);
  };

  const deleteElement = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedEl = elements.filter(el => el.id !== id);
    const updatedConn = connections.filter(c => c.fromId !== id && c.toId !== id);
    setElements(updatedEl);
    setConnections(updatedConn);
    updateParent(updatedEl, updatedConn);
    
    if (connectingFromId === id) setConnectingFromId(null);
  };

  const handleElementChange = (id: string, fields: Partial<CanvasElement>) => {
    const updated = elements.map(el => {
      if (el.id === id) {
        return { ...el, ...fields };
      }
      return el;
    });
    setElements(updated);
    updateParent(updated, connections);
  };

  // Node Connections
  const handleConnectClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!connectingFromId) {
      setConnectingFromId(id);
    } else {
      if (connectingFromId !== id) {
        // Prevent duplicate connection
        const exists = connections.some(c => 
          (c.fromId === connectingFromId && c.toId === id) || 
          (c.fromId === id && c.toId === connectingFromId)
        );
        if (!exists) {
          const newConn: CanvasConnection = {
            id: `conn-${Math.random().toString(36).substr(2, 5)}`,
            fromId: connectingFromId,
            toId: id,
            label: "Relaciona"
          };
          const updatedConn = [...connections, newConn];
          setConnections(updatedConn);
          updateParent(elements, updatedConn);
        }
      }
      setConnectingFromId(null);
    }
  };

  const deleteConnection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = connections.filter(c => c.id !== id);
    setConnections(updated);
    updateParent(elements, updated);
  };

  // Templates preset generator
  const loadMilanotePreset = () => {
    const presetElements: CanvasElement[] = [
      {
        id: "mira-1",
        type: "note",
        x: 50,
        y: 60,
        width: 190,
        height: 120,
        title: "Metas Visuais",
        content: "A paleta verde transmite calma e crescimento orgânico. Vamos consolidar as referências neste quadro infinito.",
        color: "#dcfce7"
      },
      {
        id: "mira-2",
        type: "image",
        x: 320,
        y: 40,
        width: 210,
        height: 170,
        title: "Moodboard Natureza",
        content: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=600&q=80"
      },
      {
        id: "mira-3",
        type: "link",
        x: 180,
        y: 280,
        width: 220,
        height: 140,
        title: "Paleta Coolors Green",
        content: "Verificando contrastes de acessibilidade de verde esmeralda com cinza suave.",
        linkUrl: "https://coolors.co"
      }
    ];

    const presetConnections: CanvasConnection[] = [
      { id: "conn-1", fromId: "mira-1", toId: "mira-2", label: "Inspira" },
      { id: "conn-2", fromId: "mira-2", toId: "mira-3", label: "Alinha com" }
    ];

    setElements(presetElements);
    setConnections(presetConnections);
    updateParent(presetElements, presetConnections);
  };

  // Helper method to draw beautiful bezier paths between absolute elements
  const drawBezierPath = (conn: CanvasConnection) => {
    const fromEl = elements.find(el => el.id === conn.fromId);
    const toEl = elements.find(el => el.id === conn.toId);
    if (!fromEl || !toEl) return null;

    // Card centers
    const x1 = fromEl.x + fromEl.width / 2;
    const y1 = fromEl.y + fromEl.height / 2;
    const x2 = toEl.x + toEl.width / 2;
    const y2 = toEl.y + toEl.height / 2;

    // Calculating elegant control points for bezier curves
    const cx1 = x1 + (x2 - x1) * 0.5;
    const cy1 = y1;
    const cx2 = x1 + (x2 - x1) * 0.5;
    const cy2 = y2;

    return (
      <g key={conn.id} className="group0">
        <path
          d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
          className="stroke-[#10b981]/50 hover:stroke-brand-600 focus:stroke-brand-600 fill-none transition-all cursor-pointer"
          strokeWidth="3.5"
          strokeDasharray="1.5 5"
        />
        {/* Draw a small dot or midpoint label container */}
        <foreignObject
          x={(x1 + x2) / 2 - 40}
          y={(y1 + y2) / 2 - 12}
          width="80"
          height="24"
          className="overflow-visible pointer-events-auto"
        >
          <div className="flex justify-center items-center">
            <button
              onClick={(e) => deleteConnection(conn.id, e)}
              className="px-2 py-0.5 bg-white border border-gray-100 rounded-full shadow-sm text-[9px] font-bold text-gray-450 hover:text-red-500 hover:border-red-100 transition-all flex items-center gap-1"
            >
              <span>{conn.label || "Link"}</span>
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <div className="flex-1 bg-white overflow-hidden h-screen relative flex flex-col font-sans select-none">
      
      {/* Canvas Top Action Ribbon */}
      <div className="px-6 py-4 border-b border-[#f0f5f2] flex justify-between items-center bg-[#fafdfb] relative z-10">
        <div className="flex items-center gap-3">
          <Layers className="w-4 h-4 text-brand-600" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Canvas Infinito Milanote
          </span>
        </div>

        {/* Dynamic creation shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => addElement("note")}
            className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100/80 text-brand-850 rounded-lg text-xs font-semibold border border-brand-100 flex items-center gap-1"
          >
            <StickyNote className="w-3.5 h-3.5 text-brand-650" />
            <span>Adicionar Nota</span>
          </button>
          <button
            onClick={() => addElement("image")}
            className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100/80 text-brand-850 rounded-lg text-xs font-semibold border border-brand-100 flex items-center gap-1"
          >
            <ImageIcon className="w-3.5 h-3.5 text-brand-650" />
            <span>Fixar Imagem</span>
          </button>
          <button
            onClick={() => addElement("link")}
            className="px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100/80 text-brand-850 rounded-lg text-xs font-semibold border border-brand-100 flex items-center gap-1"
          >
            <LinkIcon className="w-3.5 h-3.5 text-brand-650" />
            <span>Widget Link</span>
          </button>
        </div>

        {/* View adjustments */}
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border">
          <button
            onClick={() => setZoom(prev => Math.max(0.4, prev - 0.15))}
            className="p-1 text-gray-500 hover:text-gray-900 focus:outline-none"
            title="Afastar Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-gray-500 font-bold font-mono px-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(prev => Math.min(1.8, prev + 0.15))}
            className="p-1 text-gray-500 hover:text-gray-900 focus:outline-none"
            title="Aproximar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
            className="p-1 text-gray-500 hover:text-gray-900 border-l focus:outline-none ml-1 pl-1.5"
            title="Resetar Enquadramento"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Infinite Area viewport wrapper */}
      <div
        ref={canvasContainerRef}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseDown={handleCanvasMouseDown}
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing select-none"
      >
        {/* Background Grid Layer mapped dynamically */}
        <div 
          className="absolute inset-0 milanote-grid pointer-events-none"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: "0 0"
          }}
        />

        {/* Interactive connection builder tip banner */}
        {connectingFromId && (
          <div className="absolute top-4 left-6 bg-brand-900 text-white rounded-full px-4 py-1.5 text-xs font-semibold flex items-center gap-2 shadow-lg border border-brand-800 z-30">
            <GitCommit className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Selecione outro elemento do seu Mural para finalizar o link visual...</span>
            <button 
              onClick={() => setConnectingFromId(null)}
              className="text-[10px] text-brand-200 hover:text-white underline font-semibold ml-2"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Empty Canvas Prompt Preset */}
        {elements.length === 0 && (
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center p-8 max-w-sm">
            <Layers className="w-12 h-12 text-brand-100 mx-auto mb-4" />
            <h4 className="text-sm font-bold text-gray-900">Seu Mural Visual está vago</h4>
            <p className="text-xs text-gray-400 mt-1 mb-4 leading-normal">
              Arraste notas, imagens ou links para mapear suas ideias do zero sem limites de espaço!
            </p>
            <button
              onClick={loadMilanotePreset}
              className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow transition-all"
            >
              Carregar Mural Exemplo
            </button>
          </div>
        )}

        {/* Master Scaled and Translated Graphics Board */}
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`
          }}
        >
          {/* Node Wires connections SVG Layer */}
          <svg className="absolute inset-0 w-[5000px] h-[5000px] pointer-events-none z-0 overflow-visible">
            {connections.map(c => drawBezierPath(c))}
          </svg>

          {/* Absolute Canvas elements */}
          {elements.map((el) => {
            const isConnectingTarget = connectingFromId && connectingFromId !== el.id;
            
            return (
              <div
                key={el.id}
                onMouseDown={(e) => handleElementDragStart(e, el)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: "absolute",
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  cursor: draggedElementId === el.id ? "grabbing" : "grab",
                  zIndex: draggedElementId === el.id ? 50 : 10
                }}
                className={`bg-white rounded-xl border p-4 shadow-[0_4px_15px_rgb(0,0,0,0.02)] hover:shadow-xl transition-shadow flex flex-col justify-between group cursor-pointer ${
                  connectingFromId === el.id 
                    ? "border-emerald-500 ring-2 ring-emerald-500/20" 
                    : isConnectingTarget
                      ? "border-brand-300 hover:border-brand-500 hover:ring-2 hover:ring-brand-500/10"
                      : "border-gray-200"
                }`}
              >
                
                {/* Element Upper Controls / Pin Tag */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 md:gap-1.5">
                    {el.type === "note" && <StickyNote className="w-3.5 h-3.5 text-brand-600" />}
                    {el.type === "image" && <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />}
                    {el.type === "link" && <LinkIcon className="w-3.5 h-3.5 text-blue-500" />}
                    
                    <input
                      type="text"
                      value={el.title || "Sem título"}
                      onChange={(e) => handleElementChange(el.id, { title: e.target.value })}
                      className="text-xs font-bold text-gray-900 border-none outline-none focus:bg-gray-50 focus:px-1 rounded max-w-[120px]"
                    />
                  </div>

                  {/* Actions row on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleConnectClick(el.id, e)}
                      title={connectingFromId ? "Conectar aqui" : "Criar Conectores"}
                      className={`w-5 h-5 rounded hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 flex items-center justify-center transition-all ${
                        connectingFromId === el.id ? "text-emerald-600 bg-emerald-50" : ""
                      }`}
                    >
                      <GitCommit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => deleteElement(el.id, e)}
                      title="Deletar cartao"
                      className="w-5 h-5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Element Core Body */}
                <div className="flex-1 min-h-0 relative overflow-y-auto pr-1">
                  {el.type === "note" && (
                    <textarea
                      value={el.content}
                      onChange={(e) => handleElementChange(el.id, { content: e.target.value })}
                      style={{ backgroundColor: el.color }}
                      className="w-full h-full text-xs text-gray-700 font-sans border-none outline-none resize-none rounded p-1.5"
                      placeholder="Toque para começar a descrever..."
                    />
                  )}

                  {el.type === "image" && (
                    <div className="w-full h-full flex flex-col justify-between">
                      {el.content.startsWith("http") ? (
                        <img 
                          src={el.content} 
                          alt={el.title || "mural"} 
                          className="w-full h-24 object-cover rounded-lg border border-gray-100 placeholder-gray-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-20 bg-gray-50 rounded-lg flex items-center justify-center text-xs text-gray-400 border border-dashed text-center px-2">
                          Formato Inválido
                        </div>
                      )}
                      
                      {/* URL input field */}
                      <input
                        type="text"
                        value={el.content}
                        title="URL da Imagem Unsplash"
                        onChange={(e) => handleElementChange(el.id, { content: e.target.value })}
                        className="w-full mt-2 text-[9px] text-gray-400 border-none outline-none truncate bg-gray-50 px-1 py-0.5 rounded"
                      />
                    </div>
                  )}

                  {el.type === "link" && (
                    <div className="bg-gray-50/50 p-2 rounded-lg border border-gray-100 flex flex-col justify-between h-full">
                      <p className="text-[10px] text-gray-600 font-sans line-clamp-3">
                        {el.content || "Adicione o endereço do link abaixo..."}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <input
                          type="text"
                          value={el.linkUrl || "https://"}
                          onChange={(e) => handleElementChange(el.id, { linkUrl: e.target.value })}
                          className="text-[9px] text-blue-500 font-semibold border-none outline-none bg-transparent truncate max-w-[120px]"
                        />
                        <a 
                          href={el.linkUrl || "#"} 
                          target="_blank" 
                          rel="noreferrer"
                          className="w-5 h-5 rounded bg-white hover:bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-150 transition-all"
                        >
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Milanote elements palette footer (Notes only) */}
                {el.type === "note" && (
                  <div className="flex gap-1 justify-end pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {["#dcfce7", "#ffeecc", "#e0e7ff", "#fbcfe8", "#ffffff"].map(c => (
                      <button
                        key={c}
                        onClick={() => handleElementChange(el.id, { color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-3.5 h-3.5 rounded-full border border-gray-300 transition-transform hover:scale-110 flex-shrink-0 ${
                          el.color === c ? "ring-2 ring-brand-500/50" : ""
                        }`}
                      />
                    ))}
                    
                    {/* Compact AI helper within card */}
                    <button
                      onClick={() => onTriggerAi(`Crie referências e idéias inteligentes sobre o tópico: ${el.title} - ${el.content}`, el.id)}
                      disabled={isAiLoading}
                      className="w-4 h-4 ml-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center hover:bg-brand-600 hover:text-white transition-all"
                      title="Sugerir ideias de design com IA"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Workspace Tips footer */}
      <div className="p-3 bg-[#fafdfb] border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-sans">
        <span className="flex items-center gap-1.5 font-medium text-gray-500">
          <MousePointer className="w-3.5 h-3.5 text-brand-500" />
          <span>Dica: Use o botão esquerdo para arrastar cartões. Clique no fundo sem cards para navegar no plano infinito.</span>
        </span>
        <span className="text-[10px] bg-brand-50 text-brand-800 font-semibold px-2 py-0.5 rounded border border-brand-100">
          Mural Visual 2026
        </span>
      </div>

    </div>
  );
}
