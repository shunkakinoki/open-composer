import { TextAttributes } from "@opentui/core"; 
import type React from "react";

interface StatusBarProps {
  branch?: string;
  worktree?: string;
  agent?: string;
  status?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  branch = "main",
  worktree,
  agent = "claude-code",
  status = "Ready",
}) => {
  return (
    <box
      borderStyle="single"
      borderColor="gray"
      justifyContent="space-between"
      flexDirection="row"
      paddingX={1}
    >
      <box>
        <text content={status} style={{ fg: "green" }} />
        {branch && (
          <>
            <text content=" | Branch: " style={{ fg: "gray" }} />
            <text content={branch} style={{ fg: "yellow" }} />
          </>
        )}
        {worktree && (
          <>
            <text content=" | Worktree: " style={{ fg: "gray" }} />
            <text content={worktree} style={{ fg: "cyan" }} />
          </>
        )}
        {agent && (
          <>
            <text content=" | Agent: " style={{ fg: "gray" }} />
            <text content={agent} style={{ fg: "magenta" }} />
          </>
        )}
      </box>

      <box>
        <text content="Press " style={{ fg: "gray" }} />
        <text content="q" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
        <text content=" to quit | " style={{ fg: "gray" }} />
        <text content="?" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
        <text content=" for help" style={{ fg: "gray" }} />
      </box>
    </box>
  );
};
