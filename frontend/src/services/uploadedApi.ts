export interface UploadedFile {
  name: string;
  path: string;
  size: number;
  modified: string;
  mime_type: string;
  file_type: string;
  document_type: string;
  has_converted: boolean;
  converted_at: string | null;
}

const API_BASE = 'http://localhost:8000/api/uploaded';

export async function getUploadedFiles(): Promise<UploadedFile[]> {
  const response = await fetch(`${API_BASE}/files`);
  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }
  return response.json();
}

export async function downloadFile(filename: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/files/${encodeURIComponent(filename)}`);
  if (!response.ok) {
    throw new Error('Failed to download file');
  }
  return response.blob();
}

export async function getFilePreview(filename: string): Promise<string> {
  const response = await fetch(`${API_BASE}/files/${encodeURIComponent(filename)}/preview`);
  if (!response.ok) {
    throw new Error('Failed to get file preview');
  }
  const data = await response.json();
  return data.content;
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

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}