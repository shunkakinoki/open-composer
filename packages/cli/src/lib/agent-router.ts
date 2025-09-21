export interface Agent {
  name: string;
  icon: string;
  role: string;
  active: boolean;
}

export interface AgentResponse {
  agent: string;
  content: string;
  timestamp: Date;
  success: boolean;
}

export class AgentRouter {
  private agents: Map<string, Agent> = new Map();

  constructor() {
    this.initializeAgents();
  }

  private initializeAgents(): void {
    const defaultAgents: Agent[] = [
      {
        name: "claude-code",
        icon: "🤖",
        role: "Code review & planning",
        active: true,
      },
      {
        name: "codex-nation",
        icon: "📝",
        role: "Code generation",
        active: false,
      },
      {
        name: "cursor-agent",
        icon: "🖱️",
        role: "UI/UX implementation",
        active: false,
      },
      {
        name: "open-code",
        icon: "🌐",
        role: "Open-source snippet sourcing",
        active: false,
      },
      {
        name: "kilo-code",
        icon: "⚡",
        role: "Performance optimization",
        active: false,
      },
    ];

    for (const agent of defaultAgents) {
      this.agents.set(agent.name, agent);
    }
  }

  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getActiveAgents(): Agent[] {
    return Array.from(this.agents.values()).filter((agent) => agent.active);
  }

  activateAgent(agentName: string): boolean {
    const agent = this.agents.get(agentName);
    if (agent) {
      agent.active = true;
      return true;
    }
    return false;
  }

  deactivateAgent(agentName: string): boolean {
    const agent = this.agents.get(agentName);
    if (agent) {
      agent.active = false;
      return true;
    }
    return false;
  }

  async routeQuery(
    query: string,
    targetAgent?: string,
  ): Promise<AgentResponse> {
    let selectedAgent = targetAgent;

    if (!selectedAgent) {
      selectedAgent = this.selectAgentForQuery(query);
    }

    const agent = this.agents.get(selectedAgent);
    if (!agent) {
      return {
        agent: "system",
        content: `Unknown agent: ${selectedAgent}`,
        timestamp: new Date(),
        success: false,
      };
    }

    return this.sendToAgent(selectedAgent, query);
  }

  private selectAgentForQuery(query: string): string {
    const queryLower = query.toLowerCase();

    if (queryLower.includes("review") || queryLower.includes("analyze")) {
      return "claude-code";
    }

    if (
      queryLower.includes("generate") ||
      queryLower.includes("create") ||
      queryLower.includes("write")
    ) {
      return "codex-nation";
    }

    if (
      queryLower.includes("ui") ||
      queryLower.includes("interface") ||
      queryLower.includes("design")
    ) {
      return "cursor-agent";
    }

    if (queryLower.includes("optimize") || queryLower.includes("performance")) {
      return "kilo-code";
    }

    return "claude-code";
  }

  private async sendToAgent(
    agentName: string,
    query: string,
  ): Promise<AgentResponse> {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const responses: Record<string, string> = {
      "claude-code": `I'll analyze your request: "${query}". Let me review the codebase...`,
      "codex-nation": `Generating code for: "${query}". Here's what I'll implement...`,
      "cursor-agent": `Creating UI for: "${query}". Designing the interface...`,
      "open-code": `Searching open-source solutions for: "${query}"...`,
      "kilo-code": `Optimizing performance for: "${query}". Analyzing bottlenecks...`,
    };

    return {
      agent: agentName,
      content: responses[agentName] || `Processing: "${query}"`,
      timestamp: new Date(),
      success: true,
    };
  }

  async executeSquadMode(
    query: string,
    agents: string[],
  ): Promise<AgentResponse[]> {
    const responses: AgentResponse[] = [];

    for (const agentName of agents) {
      const response = await this.sendToAgent(agentName, query);
      responses.push(response);
    }

    return responses;
  }
}
