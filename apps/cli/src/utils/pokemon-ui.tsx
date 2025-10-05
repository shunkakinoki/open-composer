import type { AgentTeam, OpenComposerAgent } from "@open-composer/agent-registry";
import type { RegistryStats } from "@open-composer/analytics";
import { renderToString } from "./render-to-string.js";
import {
  AgentCard,
  AgentComparison,
  AgentList,
  EvolutionTree,
  RegistryStats as RegistryStatsComponent,
  TaskSpecializations,
  TeamDisplay,
} from "../components/PokemonUI.js";

/**
 * Pokemon-style UI renderer using React components
 * This is a utility wrapper that renders React components to strings for CLI output
 */
export class PokemonUI {
  /**
   * Render agent card
   */
  static renderAgentCard(agent: OpenComposerAgent): string {
    return renderToString(<AgentCard agent={agent} />);
  }

  /**
   * Render agent list
   */
  static renderAgentList(agents: OpenComposerAgent[]): string {
    return renderToString(<AgentList agents={agents} />);
  }

  /**
   * Render team display
   */
  static renderTeam(team: AgentTeam): string {
    return renderToString(<TeamDisplay team={team} />);
  }

  /**
   * Render evolution tree
   */
  static renderEvolutionTree(agent: OpenComposerAgent): string {
    return renderToString(<EvolutionTree agent={agent} />);
  }

  /**
   * Render task specializations
   */
  static renderTaskSpecializations(agent: OpenComposerAgent): string {
    return renderToString(<TaskSpecializations agent={agent} />);
  }

  /**
   * Render registry statistics
   */
  static renderStats(stats: RegistryStats): string {
    return renderToString(<RegistryStatsComponent stats={stats} />);
  }

  /**
   * Render agent comparison
   */
  static renderComparison(
    agent1: OpenComposerAgent,
    agent2: OpenComposerAgent,
  ): string {
    return renderToString(<AgentComparison agent1={agent1} agent2={agent2} />);
  }
}
