// Runs `next dev` with YOUCAM_MOCK=1 so the app serves recorded fixtures and spends no API units.
import { spawn } from 'node:child_process';

const child = spawn('npx', ['next', 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, YOUCAM_MOCK: '1' },
});
child.on('exit', code => process.exit(code ?? 0));
