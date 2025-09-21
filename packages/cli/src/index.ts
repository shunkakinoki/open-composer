#!/usr/bin/env node

import { render } from "ink";
import React from "react";
import { ComposerApp } from "./components/ComposerApp.js";

export * from "./components/ComposerApp.js";
export * from "./lib/index.js";

if (require.main === module) {
  render(React.createElement(ComposerApp));
}
