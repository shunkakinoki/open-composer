#!/usr/bin/env node

import { render, Text } from "ink";
import React from "react";

export const App: React.FC = () =>
  React.createElement(Text, null, "Hello World");

if (require.main === module) {
  render(React.createElement(App));
}
