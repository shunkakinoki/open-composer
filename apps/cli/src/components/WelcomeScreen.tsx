import { Box, Text, useApp } from "ink";
import type React from "react";
import { useState } from "react";
import { CLI_VERSION } from "../lib/version.js";
import { MainMenu, type MenuItem } from "./MainMenu.js";
import { StatusBar } from "./StatusBar.js";

interface WelcomeScreenProps {
	onCommandSelect?: (commandName: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
	onCommandSelect,
}) => {
	const { exit } = useApp();
	const [selectedCommand, setSelectedCommand] = useState<string | null>(null);

	// Define menu items based on available commands
	const menuItems: MenuItem[] = [
		{
			key: "sessions",
			label: "Sessions",
			description: "List all sessions",
			onSelect: () => {
				setSelectedCommand("sessions");
				onCommandSelect?.("sessions");
			},
		},
		{
			key: "run",
			label: "Run",
			description: "Run a command",
			onSelect: () => {
				setSelectedCommand("run");
				onCommandSelect?.("run");
			},
		},
		{
			key: "spawn",
			label: "Spawn",
			description: "Spawn a new agent",
			onSelect: () => {
				setSelectedCommand("spawn");
				onCommandSelect?.("spawn");
			},
		},
		{
			key: "status",
			label: "Status",
			description: "Show status",
			onSelect: () => {
				setSelectedCommand("status");
				onCommandSelect?.("status");
			},
		},
		{
			key: "stack",
			label: "Stack",
			description: "Manage git stack",
			onSelect: () => {
				setSelectedCommand("stack");
				onCommandSelect?.("stack");
			},
		},
		{
			key: "settings",
			label: "Settings",
			description: "Configure settings",
			onSelect: () => {
				setSelectedCommand("settings");
				onCommandSelect?.("settings");
			},
		},
		{
			key: "tui",
			label: "Full TUI",
			description: "Launch full TUI mode",
			onSelect: () => {
				setSelectedCommand("tui");
				onCommandSelect?.("tui");
			},
		},
	];

	const handleExit = () => {
		exit();
	};

	return (
		<Box flexDirection="column" height="100%">
			{/* Header */}
			<Box
				borderStyle="double"
				borderColor="cyan"
				justifyContent="center"
				paddingY={1}
			>
				<Text color="cyan" bold>
					🎼 Open Composer CLI v{CLI_VERSION}
				</Text>
			</Box>

			{/* Welcome Message */}
			<Box
				flexDirection="column"
				padding={2}
				borderStyle="single"
				borderColor="gray"
			>
				<Text color="white" bold>
					Welcome to Open Composer! 👋
				</Text>
				<Text color="gray">
					An agent orchestration framework for building with AI
				</Text>
			</Box>

			{/* Main Content Area */}
			<Box flexGrow={1} flexDirection="row">
				{/* Main Menu */}
				<Box width="60%">
					<MainMenu items={menuItems} onExit={handleExit} />
				</Box>

				{/* Quick Info Panel */}
				<Box
					width="40%"
					flexDirection="column"
					padding={1}
					borderStyle="single"
					borderColor="gray"
				>
					<Text bold color="yellow">
						ℹ️ Quick Info
					</Text>
					<Box marginTop={1} flexDirection="column">
						<Text color="gray">• Select a command to get started</Text>
						<Text color="gray">• Use arrow keys or j/k to navigate</Text>
						<Text color="gray">• Press number keys for quick access</Text>
						<Text color="gray">• Press Enter to execute command</Text>
						<Text color="gray">• Press q to quit</Text>
					</Box>

					{selectedCommand && (
						<Box marginTop={2} flexDirection="column">
							<Text bold color="green">
								Selected:
							</Text>
							<Text color="cyan">{selectedCommand}</Text>
						</Box>
					)}

					<Box marginTop={2} flexDirection="column">
						<Text bold color="magenta">
							🚀 Get Started
						</Text>
						<Box marginTop={1} flexDirection="column">
							<Text color="gray">Run 'opencode --help' for CLI usage</Text>
							<Text color="gray">Visit docs for more information</Text>
						</Box>
					</Box>
				</Box>
			</Box>

			{/* Status Bar */}
			<StatusBar status="Ready" />
		</Box>
	);
};
