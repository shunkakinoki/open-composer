// Testing utilities for OpenTUI components
// Uses OpenTUI's built-in test renderer for proper snapshot testing

import { createTestRenderer, type TestRenderer } from "@opentui/core/testing"
import React, { type ReactNode } from "react"
import { AppContext } from "@opentui/react"
import { _render as reconcilerRender } from "@opentui/react"

export type RenderInstance = {
  rerender: (tree: ReactNode) => Promise<void>
  unmount: () => void
  cleanup: () => void
  frames: string[]
  lastFrame: () => string
  renderer: TestRenderer
  renderOnce: () => Promise<void>
}

/**
 * Render function for OpenTUI components using the test renderer.
 *
 * This provides proper snapshot testing support by capturing rendered frames.
 *
 * @param tree - React element to render
 * @param options - Test renderer options (width, height)
 * @returns Test instance with utility methods
 */
export async function render(
  tree: ReactNode,
  options: { width?: number; height?: number } = {}
): Promise<RenderInstance> {
  const { renderer, renderOnce, captureCharFrame } = await createTestRenderer({
    width: options.width || 80,
    height: options.height || 24,
  })

  // Use the renderer's keyInput property as the keyHandler
  const keyHandler = renderer.keyInput

  // Render the tree with AppContext - wrap in promise to wait for React reconciler to flush
  await new Promise((resolve) => {
    reconcilerRender(
      React.createElement(AppContext.Provider, { value: { keyHandler, renderer } }, tree),
      renderer.root
    )
    // Give React time to flush the reconciler
    setTimeout(resolve, 0)
  })

  // Do initial render - need to call multiple times to let React fully flush all updates
  // Components with hooks (useState, useEffect, etc.) need additional render cycles
  // Some components with useEffect hooks need even more cycles
  await renderOnce()
  await renderOnce()
  await renderOnce()
  await renderOnce()
  await renderOnce()
  await renderOnce()

  const frames: string[] = [captureCharFrame()]

  return {
    rerender: async (newTree: ReactNode) => {
      await new Promise((resolve) => {
        reconcilerRender(
          React.createElement(AppContext.Provider, { value: { keyHandler, renderer } }, newTree),
          renderer.root
        )
        setTimeout(resolve, 0)
      })
      await renderOnce()
      frames.push(captureCharFrame())
    },
    unmount: () => {
      renderer.destroy()
    },
    cleanup: () => {
      frames.length = 0
      renderer.destroy()
    },
    frames,
    lastFrame: () => {
      return frames[frames.length - 1] || ""
    },
    renderer,
    renderOnce: async () => {
      await renderOnce()
      frames.push(captureCharFrame())
    },
  }
}
