import { createFileRoute } from '@tanstack/react-router';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { currentSession } from '~/server/session';
import { storeUpload, uploadPath } from '~/server/uploads';

const TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export const Route = createFileRoute('/api/uploads/$')({
  server: {
    handlers: {
      // Uploads are panel-only: an unauthenticated request must not be able to write
      // files to disk, and stored files are not public either.
      POST: async ({ request }: { request: Request }) => {
        if (!(await currentSession())) return new Response('unauthorized', { status: 401 });
        const form = await request.formData();
        const file = form.get('file');
        if (!(file instanceof File)) return new Response('file is required', { status: 400 });
        const stored = await storeUpload(file);
        return Response.json(stored);
      },
      GET: async ({ request }: { request: Request }) => {
        if (!(await currentSession())) return new Response('unauthorized', { status: 401 });
        const name = decodeURIComponent(new URL(request.url).pathname.replace('/api/uploads/', ''));
        let resolved: string;
        try {
          resolved = uploadPath(name);
        } catch {
          return new Response('not found', { status: 404 });
        }
        const info = await stat(resolved).catch(() => null);
        if (!info?.isFile()) return new Response('not found', { status: 404 });
        const extension = name.slice(name.lastIndexOf('.')).toLowerCase();
        return new Response(Readable.toWeb(createReadStream(resolved)) as ReadableStream, {
          headers: {
            'content-type': TYPES[extension] ?? 'application/octet-stream',
            'content-length': String(info.size),
          },
        });
      },
    },
  },
});
