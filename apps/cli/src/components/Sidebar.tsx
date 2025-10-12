import { TextAttributes } from "@opentui/core";
import type React from "react";

interface Worktree {
  name: string;
  path: string;
  branch: string;
  active: boolean;
}

interface SidebarProps {
  worktrees: Worktree[];
  currentBranch: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  worktrees,
  currentBranch,
}) => {
  return (
    <box style={{ flexDirection: "column", padding: 1 }}>
      <text
        content="📂 Workspaces"
        style={{ fg: "blue", attributes: TextAttributes.BOLD }}
      />

      <box style={{ flexDirection: "column", marginTop: 1 }}>
        {worktrees.map((worktree) => (
          <box key={worktree.name} style={{ marginY: 0 }}>
            <text
              content={`${worktree.active ? "●" : "○"} ${worktree.name}`}
              style={{ fg: worktree.active ? "green" : "gray" }}
            />
          </box>
        ))}
      </box>

      <box style={{ marginTop: 2 }}>
        <text
          content="🌿 Branches"
          style={{ fg: "yellow", attributes: TextAttributes.BOLD }}
        />
      </box>

      <box style={{ flexDirection: "column", marginTop: 1 }}>
        <text content={`● ${currentBranch}`} style={{ fg: "green" }} />
        <text content="+ New worktree" style={{ fg: "gray" }} />
      </box>

      <box style={{ marginTop: 2 }}>
        <text
          content="🤖 Agents"
          style={{ fg: "magenta", attributes: TextAttributes.BOLD }}
        />
      </box>

      <box style={{ flexDirection: "column", marginTop: 1 }}>
        <text content="● claude-code" style={{ fg: "green" }} />
        <text content="○ codex-nation" style={{ fg: "gray" }} />
        <text content="○ cursor-agent" style={{ fg: "gray" }} />
      </box>
    </box>
  );
};
