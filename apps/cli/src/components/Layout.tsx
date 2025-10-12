import { TextAttributes } from "@opentui/core";
import type React from "react";
import { CLI_VERSION } from "../lib/version.js";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <box style={{ flexDirection: "column", height: "100%" }}>
      <box style={{ border: true, borderColor: "blue", justifyContent: "center" }}>
        <text
          content={`🎼 Open Composer CLI v${CLI_VERSION}`}
          style={{ fg: "blue", attributes: TextAttributes.BOLD }}
        />
      </box>

      <box style={{ flexGrow: 1 }}>{children}</box>

      <box
        style={{
          border: true,
          borderColor: "gray",
          justifyContent: "space-between",
          flexDirection: "row",
        }}
      >
        <text content="Ready" style={{ fg: "gray" }} />
        <text content="Ctrl+C to exit" style={{ fg: "gray" }} />
      </box>
    </box>
  );
};
