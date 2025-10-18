import { describe, it, expect } from 'bun:test';
import { Terminal } from '@xterm/headless';
import { serializeTerminalToObject, convertColorToHex, ColorMode } from './terminalSerializer.js';

describe('terminalSerializer', () => {
  describe('convertColorToHex', () => {
    it('should convert RGB color to hex', () => {
      const red = (255 << 16) | (0 << 8) | 0; // #FF0000
      const result = convertColorToHex(red, ColorMode.RGB, '#000000');
      expect(result).toBe('#ff0000');
    });

    it('should convert palette color to hex', () => {
      const result = convertColorToHex(1, ColorMode.PALETTE, '#000000');
      expect(result).toBe('#800000'); // Dark red from ANSI palette
    });

    it('should return default color for DEFAULT mode', () => {
      const result = convertColorToHex(0, ColorMode.DEFAULT, '#ffffff');
      expect(result).toBe('#ffffff');
    });
  });

  describe('serializeTerminalToObject', () => {
    it('should serialize empty terminal', () => {
      const terminal = new Terminal({
        cols: 80,
        rows: 24,
        allowProposedApi: true,
      });

      const result = serializeTerminalToObject(terminal);

      expect(result).toHaveLength(24);
      expect(result[0]).toBeDefined();
    });

    it('should serialize terminal with text', async () => {
      const terminal = new Terminal({
        cols: 80,
        rows: 24,
        allowProposedApi: true,
      });

      terminal.write('Hello, World!');

      // Wait for terminal to process the write
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = serializeTerminalToObject(terminal);

      expect(result).toHaveLength(24);
      expect(result[0]).toBeDefined();

      // First line should contain text
      const firstLineText = result[0]?.map(token => token.text).join('');
      expect(firstLineText).toContain('Hello, World!');
    });

    it('should preserve ANSI colors', async () => {
      const terminal = new Terminal({
        cols: 80,
        rows: 24,
        allowProposedApi: true,
      });

      // Write red text
      terminal.write('\x1b[31mRed Text\x1b[0m');

      // Wait for terminal to process the write
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = serializeTerminalToObject(terminal);

      // Find the token with "Red Text"
      const tokens = result[0] ?? [];
      const redToken = tokens.find(t => t.text.includes('Red'));

      expect(redToken).toBeDefined();
      if (redToken) {
        expect(redToken.fg).toBeTruthy(); // Should have a foreground color
      }
    });

    it('should preserve bold text', async () => {
      const terminal = new Terminal({
        cols: 80,
        rows: 24,
        allowProposedApi: true,
      });

      terminal.write('\x1b[1mBold Text\x1b[0m');

      // Wait for terminal to process the write
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = serializeTerminalToObject(terminal);

      const tokens = result[0] ?? [];
      const boldToken = tokens.find(t => t.text.includes('Bold'));

      expect(boldToken).toBeDefined();
      if (boldToken) {
        expect(boldToken.bold).toBe(true);
      }
    });
  });
});
