import {
  makeOrchestratorService,
  OrchestratorService,
} from "@open-composer/orchestrator";
import * as Layer from "effect/Layer";

// -----------------------------------------------------------------------------
// Service Layer
// -----------------------------------------------------------------------------

export const OrchestratorLive = Layer.succeed(
  OrchestratorService,
  makeOrchestratorService(),
);
