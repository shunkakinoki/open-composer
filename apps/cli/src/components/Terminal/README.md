# Terminal Component

A React/Ink-based terminal UI component with advanced features for building interactive CLI applications.

## Overview

The Terminal component provides a comprehensive solution for building terminal-based user interfaces with:

- Screen buffer management for efficient rendering
- Event handling (keyboard, mouse, resize)
- ANSI color and styling support
- Cursor positioning and control
- High test coverage (95%+ functions, 100% lines)

## Architecture

Inspired by [termact](https://github.com/MasterGordon/termact), this implementation adapts the termact architecture for React/Ink environments.

### Core Components

1. **Terminal** (`index.tsx`) - Main React component for terminal UI
2. **ScreenBuffer** (`ScreenBuffer.ts`) - Linear screen buffer for efficient rendering
3. **EventEmitter** (`EventEmitter.ts`) - Type-safe event system
4. **ANSI utilities** (`ansi.ts`) - Color, cursor, and escape code utilities
5. **Utils** (`utils.ts`) - Text processing and styling utilities

## Usage

### Basic Example

```tsx
import { Terminal } from "./components/Terminal";

function App() {
  return (
    <Terminal width={80} height={24}>
      Hello, Terminal!
    </Terminal>
  );
}
```

### With Event Handlers

```tsx
import { Terminal } from "./components/Terminal";

function App() {
  const handleResize = (width: number, height: number) => {
    console.log(`Terminal resized to ${width}x${height}`);
  };

  const handleText = (text: string, modifier: Modifier) => {
    console.log(`Text input: ${text}`, modifier);
  };

  return (
    <Terminal
      width={80}
      height={24}
      onResize={handleResize}
      onText={handleText}
      mouseTracking={true}
      cursorHidden={true}
    >
      Interactive Terminal
    </Terminal>
  );
}
```

### Advanced Usage with Buffer

```tsx
import { Terminal, ScreenBuffer } from "./components/Terminal";
import { useRef, useEffect } from "react";

function App() {
  const bufferRef = useRef<ScreenBuffer>(new ScreenBuffer(80, 24));

  useEffect(() => {
    // Write directly to buffer
    const buffer = bufferRef.current;
    buffer.setLine(0, "Header Line");
    buffer.set(5, 5, "X"); // Draw at position (5,5)
  }, []);

  return (
    <Terminal width={80} height={24}>
      {bufferRef.current.toString()}
    </Terminal>
  );
}
```

## API Reference

### Terminal Props

```typescript
interface TerminalProps {
  // Size configuration
  width?: number;              // Default: 80
  height?: number;             // Default: 24

  // Feature flags
  alternateBuffer?: boolean;   // Use alternate screen buffer
  mouseTracking?: boolean;     // Enable mouse tracking
  cursorHidden?: boolean;      // Hide cursor

  // Event handlers
  onResize?: (width: number, height: number) => void;
  onMouse?: (event: MouseEvent) => void;
  onText?: (text: string, modifier: Modifier) => void;
  onDestroy?: () => void;

  // Content
  children?: ReactNode;
}
```

### ScreenBuffer Methods

```typescript
class ScreenBuffer {
  constructor(width: number, height: number);

  // Basic operations
  get(x: number, y: number): string;
  set(x: number, y: number, value: string): void;
  clear(): void;
  resize(width: number, height: number): void;

  // Line operations
  getLine(y: number): string;
  setLine(y: number, text: string): void;

  // Dimensions
  getWidth(): number;
  getHeight(): number;

  // Rendering
  toString(): string;
}
```

### ANSI Utilities

```typescript
// Color utilities
export const fg = (color: string | [number, number, number]): string;
export const bg = (color: string | [number, number, number]): string;
export const hexToRgb = (hex: string): [number, number, number];

// Text styling
export const bold = (): string;
export const italic = (): string;
export const underline = (): string;
export const blink = (): string;
export const strikethrough = (): string;

// Cursor control
export const moveCursor = (x: number, y: number): string;
export const setCursorStyle = (style: CursorStyle): string;

// Text processing
export const cleanse = (text: string): string;
export const splitCharacters = (text: string): string[];
```

### Utility Functions

```typescript
// Styling
export const applyStyle = (style: TerminalStyle): string;

// Text manipulation
export const wrapText = (text: string, width: number): string[];
export const truncateText = (text: string, maxLength: number): string;
export const padText = (
  text: string,
  width: number,
  align?: "left" | "center" | "right"
): string;

// Color utilities
export const getNtscGrayscale = (r: number, g: number, b: number): number;
```

## Types

```typescript
interface TerminalStyle {
  fg?: string;
  bg?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  blink?: boolean;
  reverse?: boolean;
  hidden?: boolean;
  strikethrough?: boolean;
  doubleUnderline?: boolean;
}

interface Modifier {
  shift: boolean;
  meta: boolean;
  ctrl: boolean;
}

interface MouseEvent {
  x: number;
  y: number;
  button: Button;
  kind: EventKind;
  modifier: Modifier;
}
```

## Testing

The Terminal component includes comprehensive tests:

```bash
# Run all Terminal tests
bun test tests/components/Terminal/

# Run with coverage
bun test tests/components/Terminal/ --coverage

# Update snapshots
bun test tests/components/Terminal/ --updateSnapshot
```

### Test Files

- `Terminal.test.tsx` - Component integration tests with snapshots
- `ScreenBuffer.test.ts` - Buffer management tests
- `EventEmitter.test.ts` - Event system tests
- `ansi.test.ts` - ANSI utility tests
- `utils.test.ts` - Utility function tests

## References

### File Locations

- Component: `apps/cli/src/components/Terminal/index.tsx:1`
- ScreenBuffer: `apps/cli/src/components/Terminal/ScreenBuffer.ts:1`
- EventEmitter: `apps/cli/src/components/Terminal/EventEmitter.ts:1`
- ANSI Utils: `apps/cli/src/components/Terminal/ansi.ts:1`
- Utils: `apps/cli/src/components/Terminal/utils.ts:1`
- Tests: `apps/cli/tests/components/Terminal/`

### Inspired By

- [termact](https://github.com/MasterGordon/termact) - Terminal rendering library
- [ink](https://github.com/vadimdemedes/ink) - React for CLIs

## Examples in Codebase

See these components for real-world usage patterns:

- `ChatInterface.tsx` - Interactive chat UI
- `StatusBar.tsx` - Status bar component
- `CodeEditor.tsx` - Code editing interface

## License

MIT
