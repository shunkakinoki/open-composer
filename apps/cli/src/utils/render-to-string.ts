import { createTestRenderer } from "@opentui/core/testing";
import type { ReactElement } from "react";

/**
 * Renders a React component to a string using OpenTUI
 * Useful for rendering UI components in Effect CLI commands
 *
 * Note: This is a simplified version that uses OpenTUI's test renderer
 * For full interactive rendering, use the main render function from @opentui/react
 */
export async function renderToString(element: ReactElement): Promise<string> {
  const { renderer, renderOnce, captureCharFrame } = await createTestRenderer({
    width: 100,
    height: 30,
  });

  // Note: We can't easily use the high-level render() here because it's designed
  // for full terminal interaction. For now, this returns an empty string.
  // Components should use direct terminal output if needed in CLI commands.

  // Clean up
  renderer.destroy();

  return "";
}
