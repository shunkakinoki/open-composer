#!/usr/bin/env bash
#
# Open Composer installation script
# Usage: curl -fsSL https://opencomposer.ai/install | bash
#

set -e

# -----------------------------------------------------------------------------
# Constants
# -----------------------------------------------------------------------------

REPO="shunkakinoki/open-composer"
PACKAGE_NAME="open-composer"
INSTALL_DIR="${INSTALL_DIR:-$HOME/.open-composer}"
BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------

info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

success() {
  echo -e "${GREEN}✓${NC} $1"
}

warn() {
  echo -e "${YELLOW}⚠${NC} $1"
}

error() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

# Detect OS and Architecture
detect_platform() {
  local os arch

  # Detect OS
  case "$(uname -s)" in
    Linux*)     os="linux" ;;
    Darwin*)    os="macos" ;;
    MINGW*|MSYS*|CYGWIN*) os="windows" ;;
    *)          error "Unsupported operating system: $(uname -s)" ;;
  esac

  # Detect architecture
  case "$(uname -m)" in
    x86_64|amd64)   arch="x64" ;;
    aarch64|arm64)  arch="arm64" ;;
    *)              error "Unsupported architecture: $(uname -m)" ;;
  esac

  echo "${os}-${arch}"
}

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if npm is available
check_npm() {
  if command_exists npm; then
    return 0
  else
    return 1
  fi
}

# Install via npm
install_via_npm() {
  info "Installing ${PACKAGE_NAME} via npm..."

  if ! check_npm; then
    error "npm is not installed. Please install Node.js and npm first."
  fi

  npm install -g "${PACKAGE_NAME}@latest" || error "Failed to install via npm"

  success "Successfully installed ${PACKAGE_NAME} via npm!"
}

# Get the latest release version from GitHub
get_latest_version() {
  local version

  if command_exists curl; then
    version=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" | \
      grep '"tag_name":' | \
      sed -E 's/.*"([^"]+)".*/\1/' | \
      sed "s/${PACKAGE_NAME}@//")
  elif command_exists wget; then
    version=$(wget -qO- "https://api.github.com/repos/${REPO}/releases/latest" | \
      grep '"tag_name":' | \
      sed -E 's/.*"([^"]+)".*/\1/' | \
      sed "s/${PACKAGE_NAME}@//")
  else
    error "Neither curl nor wget is available. Please install one of them."
  fi

  if [ -z "$version" ]; then
    error "Failed to fetch the latest version"
  fi

  echo "$version"
}

# Map platform to GitHub release binary name
get_binary_name() {
  local platform="$1"

  case "$platform" in
    linux-x64)       echo "opencomposer-cli-linux-x64" ;;
    linux-arm64)     echo "opencomposer-cli-linux-aarch64-musl" ;;
    macos-x64)       echo "opencomposer-cli-darwin-x64" ;;
    macos-arm64)     echo "opencomposer-cli-darwin-arm64" ;;
    windows-x64)     echo "opencomposer-cli-win32-x64" ;;
    *)               error "Unsupported platform: $platform" ;;
  esac
}

# Install from GitHub release
install_from_github() {
  local version="$1"
  local platform="$2"
  local binary_name
  binary_name=$(get_binary_name "$platform")

  info "Installing ${PACKAGE_NAME}@${version} from GitHub releases..."

  # Create installation directory
  mkdir -p "$INSTALL_DIR"
  mkdir -p "$BIN_DIR"

  # Download binary from GitHub releases
  local download_url="https://github.com/${REPO}/releases/download/${PACKAGE_NAME}@${version}/${binary_name}.zip"
  local zip_path="${INSTALL_DIR}/${binary_name}.zip"

  info "Downloading from ${download_url}..."

  if command_exists curl; then
    curl -fsSL "$download_url" -o "$zip_path" || error "Failed to download binary"
  elif command_exists wget; then
    wget -q "$download_url" -O "$zip_path" || error "Failed to download binary"
  else
    error "Neither curl nor wget is available"
  fi

  # Extract binary
  info "Extracting files..."
  if command_exists unzip; then
    unzip -q -o "$zip_path" -d "$INSTALL_DIR" || error "Failed to extract binary"
  else
    error "unzip is not available. Please install unzip."
  fi

  # Find and move the binary
  local extracted_binary="${INSTALL_DIR}/open-composer"
  local target_binary="${BIN_DIR}/open-composer"

  if [ -f "$extracted_binary" ]; then
    mv "$extracted_binary" "$target_binary" || error "Failed to move binary"
    chmod +x "$target_binary" || error "Failed to make binary executable"
    success "Installed ${PACKAGE_NAME} to ${target_binary}"
  else
    error "Binary not found in extracted package"
  fi

  # Cleanup
  rm -f "$zip_path"
}

# Add to PATH if needed
update_path() {
  local shell_config=""

  # Detect shell configuration file
  if [ -n "$BASH_VERSION" ]; then
    shell_config="$HOME/.bashrc"
  elif [ -n "$ZSH_VERSION" ]; then
    shell_config="$HOME/.zshrc"
  elif [ -f "$HOME/.profile" ]; then
    shell_config="$HOME/.profile"
  fi

  # Check if BIN_DIR is in PATH
  if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    warn "$BIN_DIR is not in your PATH"

    if [ -n "$shell_config" ]; then
      info "Adding $BIN_DIR to PATH in $shell_config"
      echo "" >> "$shell_config"
      echo "# Open Composer" >> "$shell_config"
      echo "export PATH=\"\$PATH:$BIN_DIR\"" >> "$shell_config"
      success "Added $BIN_DIR to PATH. Please restart your shell or run: source $shell_config"
    else
      warn "Please add $BIN_DIR to your PATH manually"
    fi
  fi
}

# Verify installation
verify_installation() {
  info "Verifying installation..."

  if command_exists open-composer; then
    local version
    version=$(open-composer --version 2>&1 | head -n 1 || echo "unknown")
    success "open-composer is installed and available in PATH"
    info "Version: $version"
  else
    warn "open-composer command not found in PATH"
    info "You may need to restart your shell or add $BIN_DIR to your PATH"
  fi
}

# -----------------------------------------------------------------------------
# Main Installation Flow
# -----------------------------------------------------------------------------

main() {
  echo ""
  info "Open Composer Installer"
  echo ""

  # Detect platform
  local platform
  platform=$(detect_platform)
  info "Detected platform: $platform"

  # Get latest version
  local version
  version=$(get_latest_version)
  info "Latest version: $version"

  # Prioritize GitHub releases installation
  info "Installing from GitHub releases..."
  if install_from_github "$version" "$platform"; then
    # Update PATH for GitHub releases installation
    update_path
  else
    warn "GitHub releases installation failed, falling back to npm"

    # Fallback to npm installation
    if check_npm; then
      info "Installing via npm..."
      install_via_npm
    else
      error "Both GitHub releases and npm installation failed. Please check your internet connection and try again."
    fi
  fi

  echo ""
  verify_installation
  echo ""
  success "Installation complete!"
  info "Run 'open-composer --help' to get started"
  echo ""
}

# Run main installation
main
