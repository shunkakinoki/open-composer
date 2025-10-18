# @open-composer/multiplexer

A tmux-like terminal multiplexer component for Ink applications.

## Features

- 🔀 Split terminals horizontally and vertically
- 🎯 Focus management with keyboard navigation
- 🎨 Customizable borders and titles
- ⌨️ tmux-like key bindings (Ctrl+B prefix)
- 📺 Full-screen mode with alternate screen buffer
- 🔄 Nested splits for complex layouts
- 📏 Flexible sizing (percentage, fractions, or auto)

## Installation

```bash
bun add @open-composer/multiplexer @open-composer/terminal
```

## Usage

### Simple Horizontal Split

```tsx
import { Multiplexer } from '@open-composer/multiplexer';
import { render } from 'ink';

const layout = {
  type: 'split',
  id: 'root',
  direction: 'horizontal',
  children: [
    {
      type: 'pane',
      id: 'left',
      command: 'bash',
      args: ['-i'],
      title: 'Left Pane',
      focus: true,
    },
    {
      type: 'pane',
      id: 'right',
      command: 'htop',
      title: 'Right Pane',
    },
  ],
};

render(
  <Multiplexer layout={layout} enterFullScreen={true} />,
  {
    patchConsole: false,
    exitOnCtrlC: false,
  }
);
```

### Vertical Split

```tsx
const layout = {
  type: 'split',
  id: 'root',
  direction: 'vertical',
  children: [
    {
      type: 'pane',
      id: 'top',
      command: 'bash',
      args: ['-i'],
      title: 'Top',
    },
    {
      type: 'pane',
      id: 'bottom',
      command: 'npm',
      args: ['run', 'dev'],
      title: 'Bottom',
    },
  ],
};
```

### Complex Nested Layout

```tsx
const layout = {
  type: 'split',
  id: 'root',
  direction: 'horizontal',
  children: [
    {
      type: 'pane',
      id: 'main',
      command: 'bash',
      args: ['-i'],
      size: '70%',
      title: 'Main',
      focus: true,
    },
    {
      type: 'split',
      id: 'sidebar',
      direction: 'vertical',
      size: '30%',
      children: [
        {
          type: 'pane',
          id: 'top-right',
          command: 'git',
          args: ['log', '--oneline', '--graph'],
          title: 'Git Log',
        },
        {
          type: 'pane',
          id: 'bottom-right',
          command: 'npm',
          args: ['run', 'test', '--', '--watch'],
          title: 'Tests',
        },
      ],
    },
  ],
};
```

### Custom Sizing

```tsx
const layout = {
  type: 'split',
  id: 'root',
  direction: 'horizontal',
  children: [
    { type: 'pane', id: 'left', command: 'bash', size: '1/3' },   // 33%
    { type: 'pane', id: 'middle', command: 'bash', size: '1/3' }, // 33%
    { type: 'pane', id: 'right', command: 'bash', size: '1/3' },  // 33%
  ],
};
```

## Key Bindings

The multiplexer uses tmux-like key bindings with a prefix key (default: Ctrl+B):

| Keys | Description |
|------|-------------|
| `Ctrl+B`, `?` | Show help modal |
| `Ctrl+B`, `n` or `o` | Navigate to next pane |
| `Ctrl+B`, `p` | Navigate to previous pane |
| `Ctrl+B`, `→` or `↓` | Navigate to next pane (arrow keys) |
| `Ctrl+B`, `←` or `↑` | Navigate to previous pane (arrow keys) |
| `Ctrl+B`, `d` or `x` | Exit multiplexer |
| `Ctrl+C` (twice) | Safe exit (press twice within 1 second) |
| `Ctrl+Q` | Quick exit (no prefix needed) |

## API

### `Multiplexer` Component

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `layout` | `Layout` | - | Layout configuration (required) |
| `width` | `number` | terminal width | Terminal width |
| `height` | `number` | terminal height | Terminal height |
| `showHelp` | `boolean` | `true` | Show help text at bottom |
| `showBorders` | `boolean` | `false` | Show pane borders |
| `prefixKey` | `string` | `'b'` | Prefix key for commands (e.g., 'b' for Ctrl+B) |
| `enterFullScreen` | `boolean` | `false` | Use alternate screen buffer (like tmux) |

### Layout Types

#### `Pane`

```typescript
interface Pane {
  type: 'pane';
  id: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  size?: string | number;  // "50%", "1/2", or absolute number
  focus?: boolean;          // Initially focused
  title?: string;
  interactive?: boolean;    // Default: true
}
```

#### `Split`

```typescript
interface Split {
  type: 'split';
  id: string;
  direction: 'horizontal' | 'vertical';
  children: (Pane | Split)[];
  size?: string | number;  // "50%", "1/2", or absolute number
}
```

## Full Screen Mode

When `enterFullScreen={true}`, the multiplexer uses the terminal's alternate screen buffer, providing a true tmux-like experience:

- No scrolling with previous terminal history
- Clean exit returns to previous screen state
- No persistent output after exit

```tsx
render(
  <Multiplexer layout={layout} enterFullScreen={true} />,
  {
    patchConsole: false,
    exitOnCtrlC: false,  // Let multiplexer handle its own exit
  }
);
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
