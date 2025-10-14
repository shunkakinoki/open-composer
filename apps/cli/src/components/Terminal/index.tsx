/**
 * Terminal component for advanced terminal UI
 * Inspired by termact: https://github.com/MasterGordon/termact
 *
 * This component provides a React/Ink-based terminal interface with:
 * - Screen buffer management for efficient rendering
 * - Event handling (mouse, keyboard, resize)
 * - ANSI color and styling support
 * - Cursor positioning and control
 *
 * Reference: apps/cli/src/components/Terminal/index.tsx
 */

import { Box, Text, useInput } from "ink";
import type React from "react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cleanse } from "./ansi.js";
import { EventEmitter } from "./EventEmitter.js";
import { ScreenBuffer } from "./ScreenBuffer.js";
import type {
  Modifier,
  MouseEvent,
  TerminalOptions,
  TerminalSize,
} from "./types.js";

type TerminalEventMap = {
  resize: [number, number];
  mouse: [MouseEvent];
  mouseMove: [number, number];
  text: [string, Modifier];
  destroy: [];
};

export interface TerminalProps extends TerminalOptions {
  children?: ReactNode;
  onResize?: (width: number, height: number) => void;
  onMouse?: (event: MouseEvent) => void;
  onText?: (text: string, modifier: Modifier) => void;
  onDestroy?: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({
  width: initialWidth = 80,
  height: initialHeight = 24,
  alternateBuffer = false,
  mouseTracking = false,
  cursorHidden = false,
  children,
  onResize,
  onMouse,
  onText,
  onDestroy,
}) => {
  const [size, setSize] = useState<TerminalSize>({
    width: initialWidth,
    height: initialHeight,
  });
  const [content, setContent] = useState<string>("");
  const eventsRef = useRef(new EventEmitter<TerminalEventMap>());
  const bufferRef = useRef(new ScreenBuffer(initialWidth, initialHeight));

  // Setup event listeners
  useEffect(() => {
    const events = eventsRef.current;

    if (onResize) {
      events.on("resize", onResize);
    }

    if (onMouse) {
      events.on("mouse", onMouse);
    }

    if (onText) {
      events.on("text", onText);
    }

    if (onDestroy) {
      events.on("destroy", onDestroy);
    }

    return () => {
      events.emit("destroy");
      events.removeAllListeners();
    };
  }, [onResize, onMouse, onText, onDestroy]);

  // Handle terminal resize
  const handleResize = useCallback((newWidth: number, newHeight: number) => {
    setSize({ width: newWidth, height: newHeight });
    bufferRef.current.resize(newWidth, newHeight);
    eventsRef.current.emit("resize", newWidth, newHeight);
  }, []);

  // Handle keyboard input
  useInput((input, key) => {
    const modifier: Modifier = {
      shift: key.shift ?? false,
      meta: key.meta ?? false,
      ctrl: key.ctrl ?? false,
    };

    if (key.ctrl && input === "c") {
      eventsRef.current.emit("destroy");
      return;
    }

    eventsRef.current.emit("text", input, modifier);
  });

  // Write text to buffer
  const writeToBuffer = useCallback((x: number, y: number, text: string) => {
    const buffer = bufferRef.current;
    const chars = text.split("");

    for (let i = 0; i < chars.length; i++) {
      buffer.set(x + i, y, chars[i]);
    }
  }, []);

  // Flush buffer to display
  const flush = useCallback(() => {
    setContent(bufferRef.current.toString());
  }, []);

  // Clear buffer
  const clear = useCallback(() => {
    bufferRef.current.clear();
    flush();
  }, [flush]);


  // Render terminal content
  const renderContent = () => {
    if (content) {
      return content.split("\n").map((line, index) => (
        <Text key={index}>{cleanse(line)}</Text>
      ));
    }

    // Wrap children in Text if it's a string
    if (typeof children === "string") {
      return <Text>{children}</Text>;
    }

    return children;
  };

  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray">
      {renderContent()}
    </Box>
  );
};

// Export types and utilities
export * from "./types.js";
export { ScreenBuffer } from "./ScreenBuffer.js";
export { EventEmitter } from "./EventEmitter.js";
export * from "./ansi.js";
export * from "./utils.js";
