export interface NoteFormData {
  title: string;
  content: string;
  type: 'NOTE' | 'CLIP' | 'BOOKMARK' | 'CODE' | 'IMAGE' | 'FILE';
  notebookId?: string;
  url?: string;
  language?: string;
  tags?: string[];
}

export interface NotebookFormData {
  title: string;
  description?: string;
  coverColor?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  type: string;
  notebookId: string | null;
  notebookTitle: string | null;
  updatedAt: string;
  tags: { id: string; name: string; color: string | null }[];
}
