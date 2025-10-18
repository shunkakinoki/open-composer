import React from 'react';
import { Box, Text } from 'ink';
import type { AnsiOutput, AnsiToken } from './terminalSerializer.js';

/**
 * Props for AnsiText component
 */
export interface AnsiTextProps {
  /** Serialized terminal output */
  output: AnsiOutput;
  /** Maximum width for wrapping */
  width?: number;
  /** Maximum height (number of lines to show) */
  height?: number;
}

/**
 * Renders a single styled token
 */
const StyledToken: React.FC<{ token: AnsiToken }> = ({ token }) => {
  const { text, bold, italic, underline, dim, inverse, fg, bg } = token;

  // Build style props for Ink Text component
  const props: any = {};

  if (bold) props.bold = true;
  if (italic) props.italic = true;
  if (underline) props.underline = true;
  if (dim) props.dimColor = true;
  if (inverse) props.inverse = true;

  // Handle colors - Ink supports both named colors and hex
  if (fg && fg !== '') {
    props.color = fg;
  }
  if (bg && bg !== '') {
    props.backgroundColor = bg;
  }

  return <Text {...props}>{text}</Text>;
};

/**
 * Renders serialized terminal output with ANSI styling in Ink
 *
 * This component takes AnsiOutput (from terminalSerializer) and renders
 * it in Ink with proper text styling, colors, and formatting.
 *
 * @example
 * ```tsx
 * <AnsiText output={serializedOutput} width={80} height={24} />
 * ```
 */
export const AnsiText: React.FC<AnsiTextProps> = ({
  output,
  width,
  height
}) => {
  // Apply height limit if specified
  const displayLines = height ? output.slice(0, height) : output;

  return (
    <Box flexDirection="column" width={width}>
      {displayLines.map((line, lineIndex) => (
        <Box key={lineIndex}>
          {line.map((token, tokenIndex) => (
            <StyledToken key={tokenIndex} token={token} />
          ))}
        </Box>
      ))}
    </Box>
  );
};
