import { expect, test } from "bun:test";
import { AsciiLogo } from "../../src/components/AsciiLogo.js";
import { render } from "../utils.js";

test("AsciiLogo renders with version", () => {
  const { lastFrame } = render(<AsciiLogo version="1.0.0" />);
  expect(lastFrame()).toMatchSnapshot();
});

test("AsciiLogo renders without version", () => {
  const { lastFrame } = render(<AsciiLogo showVersion={false} />);
  expect(lastFrame()).toMatchSnapshot();
});

test("AsciiLogo renders with custom version", () => {
  const { lastFrame } = render(<AsciiLogo version="2.5.10" />);
  expect(lastFrame()).toMatchSnapshot();
});
