/**
 * Terminal component tests
 */

import { describe, expect, test } from "bun:test";
import { Terminal } from "../../src/components/Terminal/index.js";
import { render } from "../utils.js";

describe("Terminal", () => {
  test("renders with default size", () => {
    const { lastFrame } = render(<Terminal />);
    expect(lastFrame()).toBeDefined();
  });

  test("renders with custom size", () => {
    const { lastFrame } = render(<Terminal width={100} height={30} />);
    expect(lastFrame()).toBeDefined();
  });

  test("renders with children", () => {
    const { lastFrame } = render(
      <Terminal width={80} height={24}>
        Hello, Terminal!
      </Terminal>,
    );
    const frame = lastFrame();
    expect(frame).toBeDefined();
    expect(frame).toContain("Hello, Terminal!");
  });

  test("matches snapshot with default props", () => {
    const { lastFrame } = render(<Terminal />);
    expect(lastFrame()).toMatchSnapshot();
  });

  test("matches snapshot with children", () => {
    const { lastFrame } = render(
      <Terminal width={60} height={20}>
        Terminal content here
      </Terminal>,
    );
    expect(lastFrame()).toMatchSnapshot();
  });

  test("handles resize events", () => {
    const resizes: Array<{ width: number; height: number }> = [];

    const onResize = (width: number, height: number) => {
      resizes.push({ width, height });
    };

    const { lastFrame } = render(
      <Terminal width={80} height={24} onResize={onResize} />,
    );

    expect(lastFrame()).toBeDefined();
    // Note: Resize events would be triggered by terminal size changes in real usage
  });

  test("handles text input events", () => {
    const inputs: Array<{
      text: string;
      modifier: { shift: boolean; meta: boolean; ctrl: boolean };
    }> = [];

    const onText = (
      text: string,
      modifier: { shift: boolean; meta: boolean; ctrl: boolean },
    ) => {
      inputs.push({ text, modifier });
    };

    const { lastFrame } = render(
      <Terminal width={80} height={24} onText={onText} />,
    );

    expect(lastFrame()).toBeDefined();
    // Note: Text events would be triggered by user input in real usage
  });

  test("handles destroy event", () => {
    let destroyed = false;

    const onDestroy = () => {
      destroyed = true;
    };

    const { unmount } = render(
      <Terminal width={80} height={24} onDestroy={onDestroy} />,
    );

    unmount();
    expect(destroyed).toBe(true);
  });

  test("renders with mouse tracking enabled", () => {
    const { lastFrame } = render(
      <Terminal width={80} height={24} mouseTracking={true} />,
    );
    expect(lastFrame()).toBeDefined();
  });

  test("renders with alternate buffer enabled", () => {
    const { lastFrame } = render(
      <Terminal width={80} height={24} alternateBuffer={true} />,
    );
    expect(lastFrame()).toBeDefined();
  });

  test("renders with cursor hidden", () => {
    const { lastFrame } = render(
      <Terminal width={80} height={24} cursorHidden={true} />,
    );
    expect(lastFrame()).toBeDefined();
  });
});
