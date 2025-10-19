import { Terminal } from '@xterm/headless';
import { serializeTerminalToObject } from './src/terminalSerializer.js';

// Import bun-pty-rust directly
const pty = await import('bun-pty-rust');

console.log('Testing with actual shell prompt...');

// Create headless terminal for ANSI parsing
const terminal = new Terminal({
  allowProposedApi: true,
  cols: 120,
  rows: 24,
});

// Spawn an interactive bash that will show a prompt
const ptyProcess = pty.spawn('bash', [], {
  name: 'xterm-256color',
  cols: 120,
  rows: 24,
  cwd: '/Users/shunkakinoki/ghq/github.com/shunkakinoki/open-composer',
  env: {
    ...process.env,
    TERM: 'xterm-256color',
    PS1: '\\u@\\h:\\w\\$ ', // Simple prompt
  },
});

let allData = '';
let dataCount = 0;

// Handle PTY data output
ptyProcess.onData((data: string) => {
  dataCount++;
  console.log(`[DATA ${dataCount}]:`, JSON.stringify(data));
  allData += data;

  // Write data to headless terminal for ANSI parsing
  terminal.write(data);

  // Parse and show current state
  const output = serializeTerminalToObject(terminal);
  const firstLineText = output[0]?.map(token => token.text).join('') || '';
  console.log(`[CURRENT LINE]:`, JSON.stringify(firstLineText.trim()));
});

// Send a command after prompt appears
setTimeout(() => {
  console.log('\n[SENDING] pwd command');
  ptyProcess.write('pwd\r');
}, 500);

// Send another command
setTimeout(() => {
  console.log('\n[SENDING] echo OpenComposer');
  ptyProcess.write('echo "open-composer"\r');
}, 1000);

// Exit after a while
setTimeout(() => {
  console.log('\n[SENDING] exit');
  ptyProcess.write('exit\r');
}, 1500);

// Handle PTY exit
ptyProcess.onExit(({ exitCode }: { exitCode: number }) => {
  console.log('\n[EXIT] Exit code:', exitCode);
  console.log('[ALL DATA]:', JSON.stringify(allData));

  // Give terminal time to process
  setTimeout(() => {
    const output = serializeTerminalToObject(terminal);

    console.log('\n=== FINAL TERMINAL STATE ===');
    output.forEach((line, i) => {
      const lineText = line.map(token => token.text).join('');
      if (lineText.trim()) {
        console.log(`Line ${i}:`, JSON.stringify(lineText.trim()));
      }
    });

    process.exit(0);
  }, 100);
});
