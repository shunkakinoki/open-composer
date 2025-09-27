// biome-ignore assist/source/organizeImports: False positive
import type React from "react";
import { Box, Text } from "ink";
import { CLI_VERSION } from "../lib/version.js";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box flexDirection="column" height="100%">
      <Box borderStyle="single" borderColor="blue" justifyContent="center">
        <Text color="blue" bold>
          🎼 Open Composer CLI v{CLI_VERSION}
        </Text>
      </Box>

      <Box flexGrow={1}>{children}</Box>

      <Box
        borderStyle="single"
        borderColor="gray"
        justifyContent="space-between"
        flexDirection="row"
      >
        <Text color="gray">Ready</Text>
        <Text color="gray">Ctrl+C to exit</Text>
      </Box>
    </Box>
  );
};
