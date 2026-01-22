#!/usr/bin/env node
require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

const child = spawn('npx', ['-y', '@supabase/mcp-server-supabase'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
});

child.on('error', (err) => {
    console.error('Failed to start subprocess:', err);
    process.exit(1);
});

child.on('exit', (code, signal) => {
    if (signal) {
        if (signal === 'SIGKILL') {
            console.error('Subprocess was killed');
        } else if (signal === 'SIGTERM') {
            console.error('Subprocess was terminated');
        } else {
            console.error(`Subprocess exit with signal: ${signal}`)
        }
    }
    if (code !== 0) {
        console.error(`Subprocess exit with code: ${code}`);
    }
    process.exit(code || 0);
});
