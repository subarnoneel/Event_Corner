import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Event Corner production servers...\n');

// Start backend
const backendPath = path.join(__dirname, 'backend');
console.log('📦 Starting backend (production)...');
const backend = spawn('npm', ['start'], {
  cwd: backendPath,
  stdio: 'inherit',
  shell: true,
});

backend.on('error', (err) => {
  console.error('❌ Backend error:', err);
});

// Start frontend
const frontendPath = path.join(__dirname, 'frontend');
console.log('⚛️  Starting frontend (preview)...\n');
const frontend = spawn('npm', ['run', 'preview'], {
  cwd: frontendPath,
  stdio: 'inherit',
  shell: true,
});

frontend.on('error', (err) => {
  console.error('❌ Frontend error:', err);
});

// Handle termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Stopping servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});
