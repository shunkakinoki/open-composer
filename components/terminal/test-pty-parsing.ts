import { Terminal } from '@xterm/headless';
import { serializeTerminalToObject } from './src/terminalSerializer.js';

const terminal = new Terminal({
  cols: 120,
  rows: 24,
  allowProposedApi: true,
});

// Test with "OpenComposer" text
const testStrings = [
  'OpenComposer',
  'open-composer',
  'open-compose',
  'R',
  'rr',
  'rrr',
];

for (const str of testStrings) {
  // Create a fresh terminal for each test
  const freshTerminal = new Terminal({
    cols: 120,
    rows: 24,
    allowProposedApi: true,
  });

  freshTerminal.write(str);

  // Wait for terminal to process
  await new Promise(resolve => setTimeout(resolve, 10));

  const result = serializeTerminalToObject(freshTerminal);
  const firstLineText = result[0]?.map(token => token.text).join('') || '';

  console.log(`Input: "${str}"`);
  console.log(`Output: "${firstLineText.trim()}"`);
  console.log(`Match: ${firstLineText.trim() === str}`);
  console.log(`Output length: ${firstLineText.trim().length}, Input length: ${str.length}`);
  if (firstLineText.trim() !== str) {
    console.log(`Missing chars: "${str.split('').filter((c, i) => firstLineText[i] !== c).join('')}"`);
  }
  console.log('---');
}
