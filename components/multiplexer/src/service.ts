/**
 * Effect-based multiplexer service
 * Provides functional utilities for managing terminal multiplexer state
 */

import { Effect, Context, Layer, Ref } from 'effect';
import type { Layout, Pane } from './types.js';

/**
 * Multiplexer state
 */
export interface MultiplexerState {
  focusedId: string;
  exitedPanes: Set<string>;
  allPanes: Pane[];
}

/**
 * Multiplexer service interface
 */
export interface MultiplexerServiceInterface {
  readonly getState: Effect.Effect<MultiplexerState>;
  readonly setFocusedId: (id: string) => Effect.Effect<void>;
  readonly markPaneExited: (id: string) => Effect.Effect<void>;
  readonly navigateNext: Effect.Effect<void>;
  readonly navigatePrevious: Effect.Effect<void>;
  readonly allExited: Effect.Effect<boolean>;
}

/**
 * Multiplexer service tag
 */
export class MultiplexerService extends Context.Tag('MultiplexerService')<
  MultiplexerService,
  MultiplexerServiceInterface
>() {}

/**
 * Get all panes from layout tree
 */
function getAllPanes(layout: Layout): Pane[] {
  const panes: Pane[] = [];

  function traverse(node: Layout) {
    if (node.type === 'pane') {
      panes.push(node);
    } else {
      node.children.forEach(traverse);
    }
  }

  traverse(layout);
  return panes;
}

/**
 * Create a live implementation of the multiplexer service
 */
export const makeMultiplexerService = (
  layout: Layout
): Effect.Effect<MultiplexerServiceInterface> =>
  Effect.gen(function* () {
    const allPanes = getAllPanes(layout);
    const initialFocusIndex = allPanes.findIndex((p) => p.focus === true);
    const initialFocusedId =
      initialFocusIndex >= 0
        ? allPanes[initialFocusIndex]?.id ?? allPanes[0]?.id ?? ''
        : allPanes[0]?.id ?? '';

    const stateRef = yield* Ref.make<MultiplexerState>({
      focusedId: initialFocusedId,
      exitedPanes: new Set(),
      allPanes,
    });

    return {
      getState: Ref.get(stateRef),

      setFocusedId: (id: string) =>
        Ref.update(stateRef, (state) => ({ ...state, focusedId: id })),

      markPaneExited: (id: string) =>
        Ref.update(stateRef, (state) => ({
          ...state,
          exitedPanes: new Set([...state.exitedPanes, id]),
        })),

      navigateNext: Effect.gen(function* () {
        const state = yield* Ref.get(stateRef);
        const currentIndex = state.allPanes.findIndex(
          (p) => p.id === state.focusedId
        );
        const nextIndex = (currentIndex + 1) % state.allPanes.length;
        const nextPane = state.allPanes[nextIndex];
        if (nextPane) {
          yield* Ref.update(stateRef, (s) => ({ ...s, focusedId: nextPane.id }));
        }
      }),

      navigatePrevious: Effect.gen(function* () {
        const state = yield* Ref.get(stateRef);
        const currentIndex = state.allPanes.findIndex(
          (p) => p.id === state.focusedId
        );
        const prevIndex =
          (currentIndex - 1 + state.allPanes.length) % state.allPanes.length;
        const prevPane = state.allPanes[prevIndex];
        if (prevPane) {
          yield* Ref.update(stateRef, (s) => ({ ...s, focusedId: prevPane.id }));
        }
      }),

      allExited: Effect.gen(function* () {
        const state = yield* Ref.get(stateRef);
        return state.exitedPanes.size >= state.allPanes.length;
      }),
    };
  });

/**
 * Create a Layer for the multiplexer service
 */
export const MultiplexerServiceLive = (layout: Layout): Layer.Layer<MultiplexerService> =>
  Layer.effect(MultiplexerService, makeMultiplexerService(layout));
