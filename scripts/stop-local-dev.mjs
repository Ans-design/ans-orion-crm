#!/usr/bin/env node
/**
 * Arrête le serveur Next.js local qui écoute sur PORT (défaut 3020).
 * Évite EADDRINUSE et EPERM prisma generate quand .next est purgé à chaud.
 */
import { spawnSync } from 'child_process';

const DEFAULT_PORTS = ['3000', '3001', '3020'];

const portArg = process.argv[2]?.trim();
const ports = portArg ? [portArg] : (
  process.env.PORT && !portArg
    ? [String(process.env.PORT).trim()]
    : DEFAULT_PORTS
);

function stopWindows(targetPort) {
  const result = spawnSync('netstat', ['-ano'], { encoding: 'utf8', shell: true });
  const pids = new Set();
  for (const line of result.stdout.split('\n')) {
    if (!line.includes(`:${targetPort}`) || !line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts.at(-1);
    if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
  }
  for (const pid of pids) {
    spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'inherit', shell: true });
    console.log(`✓ Processus arrêté (PID ${pid}) — port ${targetPort}`);
  }
  return pids.size;
}

function stopUnix(targetPort) {
  const result = spawnSync('lsof', ['-ti', `tcp:${targetPort}`], { encoding: 'utf8' });
  const pids = result.stdout
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s));
  for (const pid of pids) {
    spawnSync('kill', ['-9', pid], { stdio: 'inherit' });
    console.log(`✓ Processus arrêté (PID ${pid}) — port ${targetPort}`);
  }
  return pids.length;
}

let stopped = 0;
for (const targetPort of ports) {
  stopped += process.platform === 'win32' ? stopWindows(targetPort) : stopUnix(targetPort);
}
if (stopped === 0) {
  console.log(`· Aucun processus sur le(s) port(s) ${ports.join(', ')}`);
}
