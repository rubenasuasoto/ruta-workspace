import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

export default function cleanupBrowserAccounts(): void {
  execFileSync('docker', [
    'compose',
    '-f',
    'compose.yaml',
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'ruta',
    '-d',
    'ruta',
    '-c',
    `DELETE FROM "User" WHERE email LIKE 'e2e-browser-%@ruta.local';`,
  ], {
    cwd: resolve(__dirname, '../../ruta-api'),
    stdio: 'ignore',
  });
}
