export interface ConvertedFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  original_name: string;
  file_type: string;
  in_vectordb?: boolean;
}

export interface FileContent {
  filename: string;
  content: string;
  metadata: any;
  modified: string;
}

const API_BASE = 'http://localhost:8000/api/storage';

export async function getConvertedFiles(): Promise<ConvertedFile[]> {
  const response = await fetch(`${API_BASE}/files`);
  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }
  return response.json();
}

export async function getFileContent(filename: string): Promise<FileContent> {
  const response = await fetch(`${API_BASE}/files/${encodeURIComponent(filename)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch file content');
  }
  return response.json();
}

export async function deleteFile(filename: string): Promise<void> {
  const response = await fetch(`${API_BASE}/files/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete file');
  }
}

export async function batchDeleteFiles(filenames: string[]): Promise<any> {
  const response = await fetch(`${API_BASE}/files/batch-delete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filenames),
  });
  if (!response.ok) {
    throw new Error('Failed to delete files');
  }
  return response.json();
}

export async function addToVectorDB(filenames: string[]): Promise<any> {
  const response = await fetch(`${API_BASE}/vectordb/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filenames }),
  });
  if (!response.ok) {
    throw new Error('Failed to add files to vector database');
  }
  return response.json();
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}