#!/usr/bin/env node
/** Lance `next start` avec PORT (Windows-safe — évite ${PORT:-3000} bash). */
import { spawn } from 'node:child_process';

const port = process.env.PORT || '3000';
const host = process.env.HOST || '0.0.0.0';
const child = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['next', 'start', '-H', host, '-p', String(port)],
  { stdio: 'inherit', shell: false, env: process.env },
);
child.on('exit', (code) => process.exit(code ?? 1));
