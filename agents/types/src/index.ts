import type { Effect } from "effect/Effect";

export interface Agent {
  readonly name: string;
  readonly icon: string;
  readonly role: string;
  readonly active: boolean;
}

export interface AgentResponse {
  readonly agent: string;
  readonly content: string;
  readonly timestamp: Date;
  readonly success: boolean;
}

export interface AgentDefinition {
  readonly name: string;
  readonly icon: string;
  readonly role: string;
  readonly keywords: readonly string[];
}

export interface AgentStatus {
  readonly name: string;
  readonly available: boolean;
  readonly version?: string;
  readonly path?: string;
  readonly error?: string;
}

export interface AgentChecker {
  readonly check: () => Effect<AgentStatus>;
  readonly definition: AgentDefinition;
}
