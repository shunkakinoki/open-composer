import { Box, Text, useInput, useStdout } from "ink";
import type React from "react";
import { useEffect, useState } from "react";

interface ScrollableSessionViewerProps {
  content: string;
  onExit: () => void;
}

export const ScrollableSessionViewer: React.FC<ScrollableSessionViewerProps> = ({
  content,
  onExit,
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);
  const { stdout } = useStdout();

  const terminalHeight = stdout?.rows || 24;
  const viewportHeight = terminalHeight - 3; // Leave space for help text

  // Split content into lines
  const lines = content.split('\n');
  const totalLines = lines.length;
  const maxScroll = Math.max(0, totalLines - viewportHeight);

  useInput((input, key) => {
    if (key.escape || input === 'q' || (key.ctrl && input === 'c')) {
      onExit();
    } else if (key.upArrow || input === 'k') {
      setScrollOffset((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setScrollOffset((prev) => Math.min(maxScroll, prev + 1));
    } else if (key.pageUp) {
      setScrollOffset((prev) => Math.max(0, prev - viewportHeight));
    } else if (key.pageDown) {
      setScrollOffset((prev) => Math.min(maxScroll, prev + viewportHeight));
    } else if (input === 'g') {
      setScrollOffset(0); // Go to top
    } else if (input === 'G') {
      setScrollOffset(maxScroll); // Go to bottom
    }
  });

  // Get visible lines
  const visibleLines = lines.slice(scrollOffset, scrollOffset + viewportHeight);

  const scrollPercentage = maxScroll > 0
    ? Math.round((scrollOffset / maxScroll) * 100)
    : 100;

  return (
    <Box flexDirection="column" height={terminalHeight}>
      {/* Content area */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleLines.map((line, index) => (
          <Text key={scrollOffset + index}>{line}</Text>
        ))}
      </Box>

      {/* Status bar */}
      <Box borderStyle="single" borderTop paddingX={1}>
        <Text dimColor>
          {scrollOffset + 1}-{Math.min(scrollOffset + viewportHeight, totalLines)}/{totalLines} ({scrollPercentage}%)
        </Text>
        <Text dimColor> | </Text>
        <Text dimColor>
          ↑↓/jk: scroll | PgUp/PgDn: page | g: top | G: bottom | q/Esc: exit
        </Text>
      </Box>
    </Box>
  );
};
