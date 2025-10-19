import { Terminal } from '@xterm/headless';
import { serializeTerminalToObject } from './src/terminalSerializer.js';

// Import bun-pty-rust directly
const pty = await import('bun-pty-rust');

console.log('Testing with bun-pty-rust...');

// Create headless terminal for ANSI parsing
const terminal = new Terminal({
  allowProposedApi: true,
  cols: 120,
  rows: 24,
});

// Spawn a shell that will echo our test string
const ptyProcess = pty.spawn('bash', ['-c', 'echo "OpenComposer"'], {
  name: 'xterm-256color',
  cols: 120,
  rows: 24,
  cwd: process.cwd(),
  env: {
    ...process.env,
    TERM: 'xterm-256color',
  },
});

let receivedData = '';

// Handle PTY data output
ptyProcess.onData((data: string) => {
  console.log('[RAW DATA]:', JSON.stringify(data));
  receivedData += data;

  // Write data to headless terminal for ANSI parsing
  terminal.write(data);
});

// Handle PTY exit
ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
  console.log('[EXIT] Exit code:', exitCode);
  console.log('[RECEIVED] Total data:', JSON.stringify(receivedData));

  // Give terminal time to process
  setTimeout(() => {
    const output = serializeTerminalToObject(terminal);
    const firstLineText = output[0]?.map(token => token.text).join('') || '';

    console.log('[PARSED] First line:', JSON.stringify(firstLineText));
    console.log('[PARSED] First line (trimmed):', JSON.stringify(firstLineText.trim()));
    console.log('[MATCH] Expected "OpenComposer", got:', firstLineText.trim());
    console.log('[MATCH] Length - Expected: 12, Got:', firstLineText.trim().length);

    // Show each character
    console.log('[CHARS]:', firstLineText.trim().split('').map((c, i) => `${i}: ${c} (${c.charCodeAt(0)})`).join(', '));

    process.exit(0);
  }, 100);
});
