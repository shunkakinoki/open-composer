import { describe, expect, it } from "bun:test";
import React from "react";
import { App } from "../index";

describe("CLI App", () => {
  it("App component is properly exported", () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe("function");

    const element = React.createElement(App);
    expect(element).toBeDefined();
    expect(element.type).toBe(App);
  });

  it("App component is a valid React component", () => {
    expect(App).toBeDefined();
    expect(typeof App).toBe("function");

    const element = React.createElement(App);
    expect(element.type).toBe(App);
  });
});
