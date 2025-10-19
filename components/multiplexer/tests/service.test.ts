import { describe, it, expect } from 'bun:test';
import { Effect } from 'effect';
import {
  makeMultiplexerService,
  type MultiplexerState,
  type MultiplexerServiceInterface,
} from '../src/service.js';
import type { Layout, Pane } from '../src/types.js';

describe('MultiplexerService', () => {
  describe('initialization', () => {
    it('should create service with single pane layout', async () => {
      const layout: Layout = {
        type: 'pane',
        id: 'main',
        command: 'echo',
        args: ['test'],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));
      const state = await Effect.runPromise(service.getState);

      expect(state.focusedId).toBe('main');
      expect(state.allPanes.length).toBe(1);
      expect(state.exitedPanes.size).toBe(0);
    });

    it('should create service with split layout', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['left'] },
          { type: 'pane', id: 'right', command: 'echo', args: ['right'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));
      const state = await Effect.runPromise(service.getState);

      expect(state.allPanes.length).toBe(2);
      expect(state.focusedId).toBe('left'); // First pane by default
    });

    it('should respect initial focus in layout', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['left'] },
          { type: 'pane', id: 'right', command: 'echo', args: ['right'], focus: true },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));
      const state = await Effect.runPromise(service.getState);

      expect(state.focusedId).toBe('right'); // Focus specified in layout
    });

    it('should handle nested splits', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['left'] },
          {
            type: 'split',
            id: 'right-split',
            direction: 'vertical',
            children: [
              { type: 'pane', id: 'top-right', command: 'echo', args: ['top'] },
              { type: 'pane', id: 'bottom-right', command: 'echo', args: ['bottom'] },
            ],
          },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));
      const state = await Effect.runPromise(service.getState);

      expect(state.allPanes.length).toBe(3);
      expect(state.allPanes.map(p => p.id)).toEqual(['left', 'top-right', 'bottom-right']);
    });
  });

  describe('focus management', () => {
    it('should set focused pane', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      await Effect.runPromise(service.setFocusedId('pane2'));

      const state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('pane2');
    });

    it('should navigate to next pane', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
          { type: 'pane', id: 'pane3', command: 'echo', args: ['3'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      // Initially focused on pane1
      let state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('pane1');

      // Navigate next
      await Effect.runPromise(service.navigateNext);
      state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('pane2');

      // Navigate next again
      await Effect.runPromise(service.navigateNext);
      state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('pane3');
    });

    it('should wrap around when navigating next from last pane', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      // Set focus to last pane
      await Effect.runPromise(service.setFocusedId('pane2'));

      // Navigate next should wrap to first pane
      await Effect.runPromise(service.navigateNext);

      const state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('pane1');
    });

    it('should navigate to previous pane', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
          { type: 'pane', id: 'pane3', command: 'echo', args: ['3'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      // Set focus to pane3
      await Effect.runPromise(service.setFocusedId('pane3'));

      // Navigate previous
      await Effect.runPromise(service.navigatePrevious);
      let state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('pane2');

      // Navigate previous again
      await Effect.runPromise(service.navigatePrevious);
      state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('pane1');
    });

    it('should wrap around when navigating previous from first pane', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      // Initially focused on pane1 (first pane)
      // Navigate previous should wrap to last pane
      await Effect.runPromise(service.navigatePrevious);

      const state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('pane2');
    });
  });

  describe('pane exit tracking', () => {
    it('should mark pane as exited', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      await Effect.runPromise(service.markPaneExited('pane1'));

      const state = await Effect.runPromise(service.getState);
      expect(state.exitedPanes.has('pane1')).toBe(true);
      expect(state.exitedPanes.has('pane2')).toBe(false);
    });

    it('should track multiple exited panes', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
          { type: 'pane', id: 'pane3', command: 'echo', args: ['3'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      await Effect.runPromise(service.markPaneExited('pane1'));
      await Effect.runPromise(service.markPaneExited('pane3'));

      const state = await Effect.runPromise(service.getState);
      expect(state.exitedPanes.has('pane1')).toBe(true);
      expect(state.exitedPanes.has('pane2')).toBe(false);
      expect(state.exitedPanes.has('pane3')).toBe(true);
      expect(state.exitedPanes.size).toBe(2);
    });

    it('should detect when all panes have exited', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      // Initially, not all exited
      let allExited = await Effect.runPromise(service.allExited);
      expect(allExited).toBe(false);

      // Mark first pane as exited
      await Effect.runPromise(service.markPaneExited('pane1'));
      allExited = await Effect.runPromise(service.allExited);
      expect(allExited).toBe(false);

      // Mark second pane as exited
      await Effect.runPromise(service.markPaneExited('pane2'));
      allExited = await Effect.runPromise(service.allExited);
      expect(allExited).toBe(true);
    });

    it('should not allow duplicate exit tracking', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      await Effect.runPromise(service.markPaneExited('pane1'));
      await Effect.runPromise(service.markPaneExited('pane1')); // Mark again

      const state = await Effect.runPromise(service.getState);
      expect(state.exitedPanes.size).toBe(1); // Should still be 1
    });
  });

  describe('state immutability', () => {
    it('should maintain state consistency', async () => {
      const layout: Layout = {
        type: 'pane',
        id: 'main',
        command: 'echo',
        args: ['test'],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      const state1 = await Effect.runPromise(service.getState);
      const initialFocusedId = state1.focusedId;

      // Change state through service method
      await Effect.runPromise(service.setFocusedId('new-focus'));

      const state2 = await Effect.runPromise(service.getState);
      expect(state2.focusedId).toBe('new-focus');
      expect(state2.focusedId).not.toBe(initialFocusedId);
    });

    it('should preserve pane list across operations', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      const initialState = await Effect.runPromise(service.getState);
      const initialPaneCount = initialState.allPanes.length;

      // Perform various operations
      await Effect.runPromise(service.navigateNext);
      await Effect.runPromise(service.markPaneExited('pane1'));
      await Effect.runPromise(service.setFocusedId('pane2'));

      const finalState = await Effect.runPromise(service.getState);
      expect(finalState.allPanes.length).toBe(initialPaneCount); // Pane list should not change
    });
  });

  describe('complex layouts', () => {
    it('should handle deeply nested layouts', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          {
            type: 'split',
            id: 'split1',
            direction: 'vertical',
            children: [
              { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
              {
                type: 'split',
                id: 'split2',
                direction: 'horizontal',
                children: [
                  { type: 'pane', id: 'pane3', command: 'echo', args: ['3'] },
                  { type: 'pane', id: 'pane4', command: 'echo', args: ['4'] },
                ],
              },
            ],
          },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));
      const state = await Effect.runPromise(service.getState);

      expect(state.allPanes.length).toBe(4);
      expect(state.allPanes.map(p => p.id)).toEqual(['pane1', 'pane2', 'pane3', 'pane4']);
    });

    it('should navigate correctly in complex layout', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'left', command: 'echo', args: ['left'] },
          {
            type: 'split',
            id: 'right-split',
            direction: 'vertical',
            children: [
              { type: 'pane', id: 'top-right', command: 'echo', args: ['top'] },
              { type: 'pane', id: 'bottom-right', command: 'echo', args: ['bottom'] },
            ],
          },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      // Start at 'left'
      let state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('left');

      // Navigate to next
      await Effect.runPromise(service.navigateNext);
      state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('top-right');

      // Navigate to next
      await Effect.runPromise(service.navigateNext);
      state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('bottom-right');

      // Navigate to next (wrap around)
      await Effect.runPromise(service.navigateNext);
      state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('left');
    });
  });

  describe('edge cases', () => {
    it('should handle single pane navigation', async () => {
      const layout: Layout = {
        type: 'pane',
        id: 'only',
        command: 'echo',
        args: ['only'],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      // Navigate next with single pane
      await Effect.runPromise(service.navigateNext);
      let state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('only'); // Should stay on the same pane

      // Navigate previous with single pane
      await Effect.runPromise(service.navigatePrevious);
      state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('only'); // Should stay on the same pane
    });

    it('should handle marking non-existent pane as exited', async () => {
      const layout: Layout = {
        type: 'split',
        id: 'root',
        direction: 'horizontal',
        children: [
          { type: 'pane', id: 'pane1', command: 'echo', args: ['1'] },
          { type: 'pane', id: 'pane2', command: 'echo', args: ['2'] },
        ],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      // Mark a non-existent pane as exited
      await Effect.runPromise(service.markPaneExited('nonexistent'));

      const state = await Effect.runPromise(service.getState);
      expect(state.exitedPanes.has('nonexistent')).toBe(true);
      // allExited should still be false because actual panes haven't exited
      const allExited = await Effect.runPromise(service.allExited);
      expect(allExited).toBe(false);
    });

    it('should handle setting focus to non-existent pane', async () => {
      const layout: Layout = {
        type: 'pane',
        id: 'main',
        command: 'echo',
        args: ['test'],
      };

      const service = await Effect.runPromise(makeMultiplexerService(layout));

      // Set focus to a non-existent pane (should not throw)
      await Effect.runPromise(service.setFocusedId('nonexistent'));

      const state = await Effect.runPromise(service.getState);
      expect(state.focusedId).toBe('nonexistent');
    });
  });
});
