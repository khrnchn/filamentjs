import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Single place that knows where files live, so swapping local disk for object storage
// later is one function rather than a hunt through the codebase.
const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');

export function uploadPath(relative: string): string {
  const resolved = path.resolve(UPLOAD_ROOT, relative);
  // a traversal in the stored path must never escape the upload root
  if (resolved !== UPLOAD_ROOT && !resolved.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error('Invalid upload path');
  }
  return resolved;
}

export async function storeUpload(file: File): Promise<{ path: string }> {
  const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const name = `${randomUUID()}${extension}`;
  await mkdir(UPLOAD_ROOT, { recursive: true });
  await writeFile(uploadPath(name), Buffer.from(await file.arrayBuffer()));
  return { path: name };
}
