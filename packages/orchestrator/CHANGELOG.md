# @open-composer/orchestrator

## 0.1.0

### Minor Changes

- Initial release of Professor Oak Orchestrator package with Effect-ts integration
- Implemented core orchestration features:
  - **Effect-ts Integration**: Functional error handling with tagged errors and Effect pipelines
  - LLM task management with PLANNER, COORDINATOR, SYNTHESIZER, and OPTIMIZER roles
  - OpenRouter API integration with multi-model support via ai-sdk
  - State management following LangGraph patterns with Annotation.Root
  - Token tracking and caching support with tokenDataReducer
  - Project planning and task decomposition
  - Agent coordination and resource optimization
  - Result synthesis and aggregation
- Added comprehensive TypeScript types with readonly properties
- Integrated with ai-sdk for structured outputs using Zod schemas
- Following Open SWE architecture patterns
- Effect-based service with dependency injection via Context
- Tagged error types: OrchestratorConfigError, OrchestratorAPIError, OrchestratorValidationError
- Helper functions for common operations with Effect pipelines
- Legacy class-based API (ProfessorOakOrchestrator) for backwards compatibility
- Full documentation with Effect-ts examples
