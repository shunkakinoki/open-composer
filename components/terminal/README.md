# @open-composer/terminal

Interactive Terminal component for Ink applications.

## Features

- 🚀 Spawns a PTY process for true terminal emulation
- 🎨 Parses ANSI escape codes using @xterm/headless
- 📝 Renders styled output in Ink with proper colors and formatting
- ⌨️ Supports interactive input when focused
- 🔄 Automatically detects best PTY implementation (bun-pty-rust, @lydell/node-pty, or node-pty)
- 📦 Falls back to child_process if PTY is unavailable

## Installation

```bash
bun add @open-composer/terminal
```

### Optional: Install a PTY implementation

For the best terminal experience, install one of the following PTY implementations:

```bash
# For Bun (recommended)
bun add bun-pty-rust

# Or for Node.js
npm install @lydell/node-pty
# or
npm install node-pty
```

If no PTY implementation is available, the component will fall back to using Node's `child_process` module.

## Usage

### Basic Terminal

```tsx
import { Terminal } from '@open-composer/terminal';
import { render } from 'ink';

render(
  <Terminal
    command="bash"
    args={['-c', 'ls -la']}
    cols={80}
    rows={24}
    interactive={true}
    onExit={(code) => console.log('Exited with code:', code)}
  />
);
```

### Non-Interactive Terminal

```tsx
<Terminal
  command="npm"
  args={['install']}
  interactive={false}
  onData={(output) => {
    // Handle terminal output
    console.log('Terminal output:', output);
  }}
/>
```

### Custom Working Directory and Environment

```tsx
<Terminal
  command="npm"
  args={['run', 'dev']}
  cwd="/path/to/project"
  env={{ NODE_ENV: 'development' }}
  interactive={true}
/>
```

## API

### `Terminal` Component

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `command` | `string` | - | Command to execute (required) |
| `args` | `string[]` | `[]` | Command arguments |
| `cwd` | `string` | `process.cwd()` | Working directory |
| `env` | `Record<string, string>` | `process.env` | Environment variables |
| `cols` | `number` | `80` | Terminal width in columns |
| `rows` | `number` | `24` | Terminal height in rows |
| `interactive` | `boolean` | `false` | Enable interactive mode (allows user input) |
| `focused` | `boolean` | - | Whether this terminal is focused (for multiplexer use) |
| `onExit` | `(code: number, signal?: number) => void` | - | Callback when process exits |
| `onData` | `(output: AnsiOutput) => void` | - | Callback when data is received |

### `AnsiText` Component

Renders serialized terminal output with ANSI styling.

```tsx
import { AnsiText } from '@open-composer/terminal';

<AnsiText output={serializedOutput} width={80} height={24} />
```

### `PtyManager` Class

Low-level PTY manager for advanced use cases.

```tsx
import { PtyManager } from '@open-composer/terminal';

const ptyManager = await PtyManager.create(
  {
    command: 'bash',
    args: ['-i'],
    cols: 80,
    rows: 24,
  },
  (event) => {
    if (event.type === 'data') {
      console.log('Output:', event.output);
    } else if (event.type === 'exit') {
      console.log('Exit code:', event.code);
    }
  }
);

// Write to stdin
ptyManager.write('ls -la\r');

// Resize terminal
ptyManager.resize(100, 30);

// Cleanup
ptyManager.dispose();
```

## Testing

```bash
# Run tests
bun test

# Run tests with coverage
bun test --coverage

# Update snapshots
bun test --update-snapshots
```

## License

MIT
