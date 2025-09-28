// biome-ignore assist/source/organizeImports: False positive
import type React from "react";
import { Box, Text } from "ink";

interface CodeEditorProps {
  currentFile?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ currentFile }) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="magenta">
        📝 Code Editor
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {currentFile ? (
          <>
            <Text color="blue">📄 {currentFile}</Text>
            <Box
              borderStyle="single"
              borderColor="gray"
              padding={1}
              marginTop={1}
              flexGrow={1}
            >
              <Text color="gray" dimColor>
                Code content will appear here...
              </Text>
            </Box>
          </>
        ) : (
          <Box
            borderStyle="single"
            borderColor="gray"
            padding={2}
            flexGrow={1}
            justifyContent="center"
            alignItems="center"
          >
            <Text color="gray" dimColor>
              No file selected
            </Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text bold color="yellow">
          🔧 File Tree
        </Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">📁 src/</Text>
        <Text color="gray">{"  "}📄 index.ts</Text>
        <Text color="gray">{"  "}📁 components/</Text>
        <Text color="gray">{"    "}📄 ComposerApp.tsx</Text>
        <Text color="gray">{"    "}📄 ChatInterface.tsx</Text>
      </Box>
    </Box>
  );
};
