/**
 * Generic EventEmitter implementation
 * Inspired by termact: https://github.com/MasterGordon/termact/blob/main/src/lib/EventEmitter.ts
 */

export type EventMap = {
  [key: string]: unknown[];
};

type EventArgs<T extends EventMap, E extends keyof T> = T[E];

export class EventEmitter<T extends EventMap> {
  private listeners: Map<keyof T, Set<(...args: EventArgs<T, keyof T>) => void>> =
    new Map();

  on<E extends keyof T>(
    event: E,
    listener: (...args: EventArgs<T, E>) => void,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as never);
  }

  off<E extends keyof T>(
    event: E,
    listener: (...args: EventArgs<T, E>) => void,
  ): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(listener as never);
    }
  }

  emit<E extends keyof T>(event: E, ...args: EventArgs<T, E>): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach((listener) => listener(...args));
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
