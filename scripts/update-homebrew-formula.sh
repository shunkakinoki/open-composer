#!/bin/bash
set -e

# Update Homebrew formula in tap repository
# This script clones the homebrew-tap, updates the formula, and pushes changes

TAG="${1:-${GITHUB_REF_NAME}}"
REPO_OWNER="shunkakinoki"
TAP_REPO="homebrew-tap"
FORMULA_NAME="open-composer"

if [ -z "$TAG" ]; then
  echo "Error: TAG not provided"
  echo "Usage: $0 <tag>"
  exit 1
fi

if [ -z "$HOMEBREW_TAP_GITHUB_TOKEN" ]; then
  echo "Error: HOMEBREW_TAP_GITHUB_TOKEN not set"
  exit 1
fi

# Clone the tap repository
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

git clone "https://x-access-token:${HOMEBREW_TAP_GITHUB_TOKEN}@github.com/${REPO_OWNER}/${TAP_REPO}.git"
cd "$TAP_REPO"

# Create Formula directory if it doesn't exist
mkdir -p Formula

# Generate the formula
cat > "Formula/${FORMULA_NAME}.rb" <<'EOF'
class OpenComposer < Formula
  desc "Open Composer CLI - AI-powered development workflow tool"
  homepage "https://github.com/shunkakinoki/open-composer"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/shunkakinoki/open-composer/releases/download/TAG_PLACEHOLDER/open-composer-cli-darwin-arm64.zip"
      sha256 "SHA256_DARWIN_ARM64"
    elsif Hardware::CPU.intel?
      url "https://github.com/shunkakinoki/open-composer/releases/download/TAG_PLACEHOLDER/open-composer-cli-darwin-x64.zip"
      sha256 "SHA256_DARWIN_X64"
    end
  end

  on_linux do
    if Hardware::CPU.arm? && Hardware::CPU.is_64_bit?
      url "https://github.com/shunkakinoki/open-composer/releases/download/TAG_PLACEHOLDER/open-composer-cli-linux-aarch64-musl.zip"
      sha256 "SHA256_LINUX_ARM64"
    elsif Hardware::CPU.intel?
      url "https://github.com/shunkakinoki/open-composer/releases/download/TAG_PLACEHOLDER/open-composer-cli-linux-x64.zip"
      sha256 "SHA256_LINUX_X64"
    end
  end

  def install
    # Determine the binary name based on OS and architecture
    os = OS.mac? ? "darwin" : "linux"
    arch = Hardware::CPU.arch.to_s

    arch = case arch
           when "x86_64" then "x64"
           when "arm64" then "arm64"
           else arch
           end

    os_suffix = if os == "linux" && arch == "arm64"
                  "linux-aarch64-musl"
                else
                  "#{os}-#{arch}"
                end

    binary_dir = "open-composer-cli-#{os_suffix}"

    bin.install "#{binary_dir}/bin/open-composer"
    bin.install_symlink bin/"open-composer" => "oc"
    bin.install_symlink bin/"open-composer" => "opencomposer"
  end

  test do
    system "#{bin}/open-composer", "--version"
  end
end
EOF

# Replace TAG_PLACEHOLDER with actual tag
sed -i.bak "s|TAG_PLACEHOLDER|${TAG}|g" "Formula/${FORMULA_NAME}.rb"
rm "Formula/${FORMULA_NAME}.rb.bak"

# Download each zip and calculate SHA256
echo "Calculating SHA256 checksums..."

declare -A CHECKSUMS

for variant in "darwin-arm64" "darwin-x64" "linux-aarch64-musl" "linux-x64"; do
  url="https://github.com/${REPO_OWNER}/open-composer/releases/download/${TAG}/open-composer-cli-${variant}.zip"
  echo "Downloading ${variant}..."

  if curl -fsSL -o "/tmp/${variant}.zip" "$url"; then
    checksum=$(sha256sum "/tmp/${variant}.zip" | awk '{print $1}')
    CHECKSUMS[$variant]=$checksum
    echo "  ${variant}: ${checksum}"
  else
    echo "Warning: Failed to download ${variant}, using placeholder"
    CHECKSUMS[$variant]="0000000000000000000000000000000000000000000000000000000000000000"
  fi
done

# Update SHA256 values in formula
sed -i.bak "s|SHA256_DARWIN_ARM64|${CHECKSUMS[darwin-arm64]}|g" "Formula/${FORMULA_NAME}.rb"
sed -i.bak "s|SHA256_DARWIN_X64|${CHECKSUMS[darwin-x64]}|g" "Formula/${FORMULA_NAME}.rb"
sed -i.bak "s|SHA256_LINUX_ARM64|${CHECKSUMS[linux-aarch64-musl]}|g" "Formula/${FORMULA_NAME}.rb"
sed -i.bak "s|SHA256_LINUX_X64|${CHECKSUMS[linux-x64]}|g" "Formula/${FORMULA_NAME}.rb"
rm "Formula/${FORMULA_NAME}.rb.bak"

# Commit and push
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

git add "Formula/${FORMULA_NAME}.rb"
git commit -m "Update ${FORMULA_NAME} to ${TAG}"
git push origin main

echo "Successfully updated Homebrew formula for ${TAG}"

# Cleanup
cd /
rm -rf "$TEMP_DIR"
