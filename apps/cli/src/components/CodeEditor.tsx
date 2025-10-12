import { TextAttributes } from "@opentui/core";
import type React from "react";

interface CodeEditorProps {
  currentFile?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ currentFile }) => {
  return (
    <box style={{ flexDirection: "column", padding: 1 }}>
      <text
        content="📝 Code Editor"
        style={{ fg: "magenta", attributes: TextAttributes.BOLD }}
      />

      <box style={{ flexDirection: "column", marginTop: 1 }}>
        {currentFile ? (
          <>
            <text content={`📄 ${currentFile}`} style={{ fg: "blue" }} />
            <box
              style={{
                border: true,
                borderColor: "gray",
                padding: 1,
                marginTop: 1,
                flexGrow: 1,
              }}
            >
              <text
                content="Code content will appear here..."
                style={{ fg: "gray" }}
              />
            </box>
          </>
        ) : (
          <box
            style={{
              border: true,
              borderColor: "gray",
              padding: 2,
              flexGrow: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <text content="No file selected" style={{ fg: "gray" }} />
          </box>
        )}
      </box>

      <box style={{ marginTop: 1 }}>
        <text
          content="🔧 File Tree"
          style={{ fg: "yellow", attributes: TextAttributes.BOLD }}
        />
      </box>

      <box style={{ flexDirection: "column", marginTop: 1 }}>
        <text content="📁 src/" style={{ fg: "gray" }} />
        <text content="  📄 index.ts" style={{ fg: "gray" }} />
        <text content="  📁 components/" style={{ fg: "gray" }} />
        <text content="    📄 ComposerApp.tsx" style={{ fg: "gray" }} />
        <text content="    📄 ChatInterface.tsx" style={{ fg: "gray" }} />
      </box>
    </box>
  );
};
