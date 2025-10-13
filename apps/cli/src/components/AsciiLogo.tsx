import { Box, Text } from "ink";
import type React from "react";

interface AsciiLogoProps {
  showVersion?: boolean;
  version?: string;
}

export const AsciiLogo: React.FC<AsciiLogoProps> = ({
  showVersion = true,
  version,
}) => {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text color="cyan" bold>
        {` ___  ____  _____ _   _ `}
      </Text>
      <Text color="cyan" bold>
        {`/ _ \\|  _ \\| ____| \\ | |`}
      </Text>
      <Text color="cyan" bold>
        {`| | | | |_) |  _| |  \\| |`}
      </Text>
      <Text color="cyan" bold>
        {`| |_| |  __/| |___| |\\  |`}
      </Text>
      <Text color="cyan" bold>
        {` \\___/|_|   |_____|_| \\_|`}
      </Text>
      <Box marginTop={1}>
        <Text color="magenta" bold>
          {` ____ ___  __  __ ____   ___  ____  _____ ____  `}
        </Text>
      </Box>
      <Text color="magenta" bold>
        {`/ ___/ _ \\|  \\/  |  _ \\ / _ \\/ ___|| ____|  _ \\ `}
      </Text>
      <Text color="magenta" bold>
        {`|  | | | | |\\/| | |_) | | | \\___ \\|  _| | |_) |`}
      </Text>
      <Text color="magenta" bold>
        {`| |__| |_| | |  | |  __/| |_| |___) | |___|  _ < `}
      </Text>
      <Text color="magenta" bold>
        {` \\____\\___/|_|  |_|_|    \\___/|____/|_____|_| \\_\\`}
      </Text>
      {showVersion && version && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            v{version}
          </Text>
        </Box>
      )}
    </Box>
  );
};
