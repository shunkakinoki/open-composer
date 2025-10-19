import { describe, it, expect } from 'bun:test';
import { render } from 'ink-testing-library';
import React from 'react';
import { AnsiText } from '../src/AnsiText.js';
import type { AnsiOutput } from '../src/terminalSerializer.js';

describe('AnsiText', () => {
  describe('snapshot tests', () => {
    it('should render empty output', () => {
      const output: AnsiOutput = [];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toMatchSnapshot();
    });

    it('should render plain text', () => {
      const output: AnsiOutput = [
        [{ text: 'Hello, World!' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      const frame = lastFrame();
      expect(frame).toContain('Hello, World!');
      expect(frame).toMatchSnapshot();
    });

    it('should render multiple lines', () => {
      const output: AnsiOutput = [
        [{ text: 'Line 1' }],
        [{ text: 'Line 2' }],
        [{ text: 'Line 3' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      const frame = lastFrame();
      expect(frame).toContain('Line 1');
      expect(frame).toContain('Line 2');
      expect(frame).toContain('Line 3');
      expect(frame).toMatchSnapshot();
    });

    it('should render text with bold styling', () => {
      const output: AnsiOutput = [
        [{ text: 'Bold Text', bold: true }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toMatchSnapshot();
    });

    it('should render text with italic styling', () => {
      const output: AnsiOutput = [
        [{ text: 'Italic Text', italic: true }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toMatchSnapshot();
    });

    it('should render text with underline styling', () => {
      const output: AnsiOutput = [
        [{ text: 'Underlined Text', underline: true }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toMatchSnapshot();
    });

    it('should render text with dim styling', () => {
      const output: AnsiOutput = [
        [{ text: 'Dim Text', dim: true }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toMatchSnapshot();
    });

    it('should render text with inverse styling', () => {
      const output: AnsiOutput = [
        [{ text: 'Inverse Text', inverse: true }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toMatchSnapshot();
    });

    it('should render text with foreground color', () => {
      const output: AnsiOutput = [
        [{ text: 'Red Text', fg: '#ff0000' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toMatchSnapshot();
    });

    it('should render text with background color', () => {
      const output: AnsiOutput = [
        [{ text: 'Blue Background', bg: '#0000ff' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toMatchSnapshot();
    });

    it('should render text with multiple styles', () => {
      const output: AnsiOutput = [
        [{
          text: 'Styled Text',
          bold: true,
          italic: true,
          underline: true,
          fg: '#00ff00',
          bg: '#000000'
        }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toMatchSnapshot();
    });

    it('should render mixed styled tokens on same line', () => {
      const output: AnsiOutput = [
        [
          { text: 'Normal ' },
          { text: 'Bold', bold: true },
          { text: ' ' },
          { text: 'Red', fg: '#ff0000' },
        ],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      const frame = lastFrame();
      expect(frame).toContain('Normal');
      expect(frame).toContain('Bold');
      expect(frame).toContain('Red');
      expect(frame).toMatchSnapshot();
    });

    it('should render with width constraint', () => {
      const output: AnsiOutput = [
        [{ text: 'This is a very long line that should be constrained by width' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} width={40} />);

      expect(lastFrame()).toMatchSnapshot();
    });

    it('should render with height constraint', () => {
      const output: AnsiOutput = [
        [{ text: 'Line 1' }],
        [{ text: 'Line 2' }],
        [{ text: 'Line 3' }],
        [{ text: 'Line 4' }],
        [{ text: 'Line 5' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} height={3} />);

      const frame = lastFrame();
      expect(frame).toContain('Line 1');
      expect(frame).toContain('Line 2');
      expect(frame).toContain('Line 3');
      expect(frame).not.toContain('Line 4');
      expect(frame).not.toContain('Line 5');
      expect(frame).toMatchSnapshot();
    });

    it('should render complex output with multiple lines and tokens', () => {
      const output: AnsiOutput = [
        [{ text: '$ ', fg: '#00ff00', bold: true }, { text: 'echo "Hello"' }],
        [{ text: 'Hello' }],
        [{ text: '$ ', fg: '#00ff00', bold: true }, { text: 'ls -la' }],
        [{ text: 'total 42', bold: true }],
        [{ text: 'drwxr-xr-x', fg: '#0000ff' }, { text: '  5 user  group  160 Jan  1 12:00 ' }, { text: '.', fg: '#0000ff', bold: true }],
      ];
      const { lastFrame } = render(<AnsiText output={output} width={80} />);

      expect(lastFrame()).toMatchSnapshot();
    });
  });

  describe('integration tests', () => {
    it('should handle empty text tokens', () => {
      const output: AnsiOutput = [
        [{ text: '' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toBeDefined();
    });

    it('should handle lines with no tokens', () => {
      const output: AnsiOutput = [
        [],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toBeDefined();
    });

    it('should handle undefined colors gracefully', () => {
      const output: AnsiOutput = [
        [{ text: 'Text', fg: undefined, bg: undefined }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toContain('Text');
    });

    it('should handle empty string colors gracefully', () => {
      const output: AnsiOutput = [
        [{ text: 'Text', fg: '', bg: '' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toContain('Text');
    });

    it('should respect both width and height constraints together', () => {
      const output: AnsiOutput = [
        [{ text: 'Line 1 with some text' }],
        [{ text: 'Line 2 with some text' }],
        [{ text: 'Line 3 with some text' }],
        [{ text: 'Line 4 with some text' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} width={20} height={2} />);

      const frame = lastFrame();
      expect(frame).toContain('Line 1');
      expect(frame).toContain('Line 2');
      expect(frame).not.toContain('Line 3');
      expect(frame).not.toContain('Line 4');
    });

    it('should update when output changes', () => {
      const initialOutput: AnsiOutput = [
        [{ text: 'Initial' }],
      ];

      const { lastFrame, rerender } = render(<AnsiText output={initialOutput} />);

      expect(lastFrame()).toContain('Initial');

      const updatedOutput: AnsiOutput = [
        [{ text: 'Updated' }],
      ];

      rerender(<AnsiText output={updatedOutput} />);

      expect(lastFrame()).toContain('Updated');
      expect(lastFrame()).not.toContain('Initial');
    });

    it('should update when width changes', () => {
      const output: AnsiOutput = [
        [{ text: 'Some text content that wraps' }],
      ];

      const { rerender } = render(<AnsiText output={output} width={80} />);

      // Should not throw when width changes
      rerender(<AnsiText output={output} width={40} />);
    });

    it('should update when height changes', () => {
      const output: AnsiOutput = [
        [{ text: 'Line 1' }],
        [{ text: 'Line 2' }],
        [{ text: 'Line 3' }],
        [{ text: 'Line 4' }],
      ];

      const { lastFrame, rerender } = render(<AnsiText output={output} height={4} />);

      expect(lastFrame()).toContain('Line 4');

      rerender(<AnsiText output={output} height={2} />);

      expect(lastFrame()).not.toContain('Line 4');
    });
  });

  describe('edge cases', () => {
    it('should handle very long lines', () => {
      const longText = 'a'.repeat(1000);
      const output: AnsiOutput = [
        [{ text: longText }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toBeDefined();
    });

    it('should handle many lines', () => {
      const output: AnsiOutput = Array.from({ length: 100 }, (_, i) => [
        { text: `Line ${i + 1}` },
      ]);
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toBeDefined();
    });

    it('should handle many tokens on a single line', () => {
      const output: AnsiOutput = [
        Array.from({ length: 100 }, (_, i) => ({
          text: `Token${i} `,
          fg: i % 2 === 0 ? '#ff0000' : '#00ff00',
        })),
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toBeDefined();
    });

    it('should handle special characters', () => {
      const output: AnsiOutput = [
        [{ text: 'Tab:\t' }],
        [{ text: 'Newline:\n' }],
        [{ text: 'Special: 🚀 ✨ 🎉' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} />);

      expect(lastFrame()).toBeDefined();
    });

    it('should handle zero width', () => {
      const output: AnsiOutput = [
        [{ text: 'Text' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} width={0} />);

      expect(lastFrame()).toBeDefined();
    });

    it('should handle zero height', () => {
      const output: AnsiOutput = [
        [{ text: 'Text' }],
      ];
      const { lastFrame } = render(<AnsiText output={output} height={0} />);

      // With height 0 (falsy), the component defaults to showing all output
      // This is expected behavior since 0 is falsy in the ternary check
      const frame = lastFrame();
      expect(frame).toBeDefined();
      expect(frame).toContain('Text');
    });
  });
});
