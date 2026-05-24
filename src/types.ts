/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum WorkspaceType {
  NOTION_DOC = "NOTION_DOC",
  MILANOTE_CANVAS = "MILANOTE_CANVAS",
  KEEP_NOTES = "KEEP_NOTES"
}

export type BlockType = "h1" | "h2" | "paragraph" | "todo" | "code" | "list" | "image" | "table" | "video" | "ia" | "notebook";

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
  // Options for table, video, and IA blocks
  rows?: string[][]; // for tables
  videoUrl?: string; // for videos
  notebookPageId?: string; // link to notebook pages
}

export interface CanvasElement {
  id: string;
  type: "note" | "image" | "link" | "notebook_page";
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  title?: string;
  color?: string;
  imageSrc?: string;
  linkUrl?: string;
}

export interface CanvasConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
}

export interface KeepNote {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  tags: string[];
  checklist: { id: string; text: string; checked: boolean }[];
  updatedAt: string;
}

export interface WorkspaceCategory {
  id: string;
  name: string;
  color: string; // tailwind class or hex
  order: number;
  subcategories?: { id: string; name: string }[];
}

export interface NotebookPage {
  id: string;
  title: string;
  content: string; // text annotation
  checklist: { id: string; text: string; checked: boolean }[];
  imageSrc?: string;
  color?: string;
  order: number;
  workspaceId: string; // allows moving/dragging pages to another workspace
}

export interface GeminiAgent {
  id: string;
  name: string;
  role: string;
  systemInstruction: string;
  model: string;
  isActive: boolean;
  status: "online" | "offline";
  apiKey?: string;
}

export interface WorkspaceItem {
  id: string;
  title: string;
  type: WorkspaceType;
  category: string; // referencing category id or name
  isFavorite: boolean;
  updatedAt: string;
  
  // Custom states per workspace type
  blocks?: EditorBlock[]; // Notion blocks
  elements?: CanvasElement[]; // Milanote elements
  connections?: CanvasConnection[]; // Milanote connections
  notes?: KeepNote[]; // Keep notes list
  notebookPages?: NotebookPage[]; // Smart notebook pages embedded in this workspace
  isInTrash?: boolean; // deleted soft-delete flag
  deletedAt?: string; // date timestamp when sent to trash
}

export interface UserSession {
  email: string;
  name: string;
  isAuthenticated: boolean;
  loginMethod: "credentials" | "phone" | "google" | "github" | "microsoft";
  mfaEnabled: boolean;
}
