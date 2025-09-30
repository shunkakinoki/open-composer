# @open-composer/config

## 0.2.0

### Minor Changes

- [#173](https://github.com/shunkakinoki/open-composer/pull/173) [`22aecb4`](https://github.com/shunkakinoki/open-composer/commit/22aecb4eedb36be8b6f08ff6a4e74baed95ea2f8) Thanks [@shunkakinoki](https://github.com/shunkakinoki)! - feat: implement dynamic help text generation for CLI

  - Added dynamic help text generation that automatically displays available commands
  - Improved config clear functionality to properly reset to default state
  - Enhanced CLI user experience with better command discovery
  - Fixed telemetry consent prompt to skip during config clear operations
  - Added comprehensive test coverage for new functionality

  This update makes the CLI more user-friendly by automatically generating help text based on available commands, while also improving the configuration management experience.

## 0.1.0

### Features

- Initial release with basic configuration types and interfaces
- Support for telemetry configuration
- Support for agent availability caching
- Config service interface with Effect-based operations
