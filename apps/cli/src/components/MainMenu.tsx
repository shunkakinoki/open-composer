import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";

export interface MenuItem {
  key: string;
  label: string;
  description: string;
  onSelect: () => void;
}

interface MainMenuProps {
  items: MenuItem[];
  onExit: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ items, onExit }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      // Move up
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (key.downArrow || input === "j") {
      // Move down
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      // Select current item
      items[selectedIndex]?.onSelect();
    } else if (input === "q" || key.escape) {
      // Exit
      onExit();
    } else if (input >= "1" && input <= "9") {
      // Quick select by number
      const index = Number.parseInt(input, 10) - 1;
      if (index >= 0 && index < items.length) {
        items[index]?.onSelect();
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Main Menu
      </Text>
      <Box borderStyle="single" borderColor="gray" marginTop={1} />

      <Box flexDirection="column" marginTop={1}>
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const numberLabel = `[${index + 1}]`;

          return (
            <Box key={item.key} marginY={0}>
              <Text color={isSelected ? "green" : "gray"}>
                {isSelected ? "▶ " : "  "}
                {numberLabel.padEnd(4)}
              </Text>
              <Text color={isSelected ? "cyan" : "white"} bold={isSelected}>
                {item.label.padEnd(16)}
              </Text>
              <Text color="gray">{item.description}</Text>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={2}>
        <Text color="gray" dimColor>
          Use ↑↓/j/k to navigate, Enter to select, 'q' to quit
        </Text>
      </Box>
    </Box>
  );
};
