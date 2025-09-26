---
"@open-composer/agent-router": minor
"open-composer": minor
---

**New Package**: Extracted agent-router functionality into a separate `@open-composer/agent-router` package with full Effect-based implementation for better modularity and reusability.

**CLI Enhancement**: Added comprehensive agent management commands including:
- `agents list` - List available agents
- `agents activate <agent>` - Activate a specific agent  
- `agents deactivate <agent>` - Deactivate a specific agent
- `agents route <query>` - Route queries through the agent system

**Type Safety**: Fixed TypeScript compilation errors with proper Effect CLI Option type handling.

**Architecture**: Improved separation of concerns with dedicated AgentCli service and modular package structure.
