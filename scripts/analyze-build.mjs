import { execSync } from 'child_process';

process.env.ANALYZE = 'true';
execSync('npm run build', { stdio: 'inherit', env: process.env });
