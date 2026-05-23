/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum WorkspaceType {
  NOTION_DOC = "NOTION_DOC",
  MILANOTE_CANVAS = "MILANOTE_CANVAS",
  KEEP_NOTES = "KEEP_NOTES"
}

export type BlockType = "h1" | "h2" | "paragraph" | "todo" | "code" | "list";

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;
}

export interface CanvasElement {
  id: string;
  type: "note" | "image" | "link";
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

export interface WorkspaceItem {
  id: string;
  title: string;
  type: WorkspaceType;
  category: string;
  isFavorite: boolean;
  updatedAt: string;
  
  // Custom states per workspace type
  blocks?: EditorBlock[]; // Notion blocks
  elements?: CanvasElement[]; // Milanote elements
  connections?: CanvasConnection[]; // Milanote connections
  notes?: KeepNote[]; // Keep notes list
}

export interface UserSession {
  email: string;
  name: string;
  isAuthenticated: boolean;
  loginMethod: "credentials" | "phone" | "google" | "github" | "microsoft";
  mfaEnabled: boolean;
}
