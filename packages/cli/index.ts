#!/usr/bin/env node

import { render, Text } from "ink";
import React from "react";

const App: React.FC = () => React.createElement(Text, null, "Hello World");

render(React.createElement(App));
