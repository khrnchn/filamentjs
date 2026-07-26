import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Regression: routes/admin/route.tsx imported ~/filament/panel, which reaches the resource
// definitions, which hold Drizzle models and action handler closures, which import
// ~/db/client, which imports dotenv/config. That shipped the database client to the browser
// and crashed every admin page at hydration inside dotenv's option parser.
//
// Anything a component can import must stay free of server-only modules. Server functions
// are the boundary: importing ~/server/* is fine, since the client only gets a stub.
const SRC = path.resolve(__dirname);
const SERVER_ONLY = ['~/db/client', '~/db/schema', '~/filament/panel', '~/filament/resources', 'dotenv'];
const SERVER_DIRS = [path.join(SRC, 'server'), path.join(SRC, 'db'), path.join(SRC, 'filament')];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [full] : [];
  });
}

const clientReachable = sourceFiles(SRC).filter(
  (file) => !SERVER_DIRS.some((dir) => file.startsWith(dir + path.sep)),
);

describe('client reachable modules', () => {
  it('finds the route and component files to check', () => {
    expect(clientReachable.length).toBeGreaterThan(5);
  });

  it('never imports a server-only module', () => {
    const offenders: string[] = [];
    for (const file of clientReachable) {
      const source = readFileSync(file, 'utf8');
      for (const module of SERVER_ONLY) {
        // a static import, not a mention inside a comment
        if (new RegExp(`^\\s*import[^;]*from\\s+['"]${module}`, 'm').test(source)) {
          offenders.push(`${path.relative(SRC, file)} imports ${module}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
