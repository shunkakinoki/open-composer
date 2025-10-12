import { TextAttributes } from "@opentui/core";

import { useKeyboard } from "@opentui/react"; 
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

  useKeyboard((key) => {
    if (key.name === "up" || key.sequence === "k") {
      // Move up
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
    } else if (key.name === "down" || key.sequence === "j") {
      // Move down
      setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
    } else if (key.name === "return") {
      // Select current item
      items[selectedIndex]?.onSelect();
    } else if (key.sequence === "q" || key.name === "escape") {
      // Exit
      onExit();
    } else if (key.sequence && key.sequence >= "1" && key.sequence <= "9") {
      // Quick select by number
      const index = Number.parseInt(key.sequence, 10) - 1;
      if (index >= 0 && index < items.length) {
        items[index]?.onSelect();
      }
    }
  });

  return (
    <box flexDirection="column" padding={1}>
      <text content="Main Menu" style={{ fg: "cyan", attributes: TextAttributes.BOLD }} />
      <box borderStyle="single" borderColor="gray" marginTop={1} />

      <box flexDirection="column" marginTop={1}>
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const numberLabel = `[${index + 1}]`;
          const prefix = `${isSelected ? "▶ " : "  "}${numberLabel.padEnd(4)}`;

          return (
            <box key={item.key} marginY={0}>
              <text
                content={prefix}
                style={{ fg: isSelected ? "green" : "gray" }}
              />
              <text
                content={item.label.padEnd(16)}
                style={{
                  fg: isSelected ? "cyan" : "white",
                  attributes: isSelected ? TextAttributes.BOLD : undefined
                }}
              />
              <text content={item.description} style={{ fg: "gray" }} />
            </box>
          );
        })}
      </box>

      <box marginTop={2}>
        <text content="Use ↑↓/j/k to navigate, Enter to select, 'q' to quit" style={{ fg: "gray" }} />
      </box>
    </box>
  );
};
