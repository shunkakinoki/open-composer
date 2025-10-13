#!/bin/bash
set -e

# Update Chocolatey package in chocolatey-packages repository
# This script clones the chocolatey-packages repo, updates the package, and pushes changes

TAG="${1:-${GITHUB_REF_NAME}}"
REPO_OWNER="shunkakinoki"
CHOCO_REPO="chocolatey-packages"
PACKAGE_NAME="open-composer"

if [ -z "$TAG" ]; then
  echo "Error: TAG not provided"
  echo "Usage: $0 <tag>"
  exit 1
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN not set"
  exit 1
fi

# Clone the chocolatey packages repository
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_OWNER}/${CHOCO_REPO}.git"
cd "$CHOCO_REPO"

# Navigate to package directory
if [ ! -d "$PACKAGE_NAME" ]; then
  echo "Error: Package directory $PACKAGE_NAME not found"
  exit 1
fi

cd "$PACKAGE_NAME"

# Update version in nuspec file
sed -i.bak "s|<version>.*</version>|<version>${TAG#open-composer@}</version>|g" "${PACKAGE_NAME}.nuspec"
rm "${PACKAGE_NAME}.nuspec.bak"

# Download the Windows installer and calculate checksum
WINDOWS_ZIP_URL="https://github.com/${REPO_OWNER}/open-composer/releases/download/${TAG}/open-composer-cli-win32-x64.zip"
echo "Downloading Windows binary..."

if curl -fsSL -o "/tmp/windows.zip" "$WINDOWS_ZIP_URL"; then
  checksum=$(sha256sum "/tmp/windows.zip" | awk '{print $1}')
  echo "Windows binary checksum: $checksum"

  # Update checksum in install script
  sed -i.bak "s|checksum64.*=.*|checksum64    = '$checksum'|g" "tools/chocolateyInstall.ps1"
  rm "tools/chocolateyInstall.ps1.bak"

  # Update URL in install script
  sed -i.bak "s|https://github.com/${REPO_OWNER}/open-composer/releases/download/[^/]*/open-composer-cli-win32-x64.zip|$WINDOWS_ZIP_URL|g" "tools/chocolateyInstall.ps1"
  rm "tools/chocolateyInstall.ps1.bak"
else
  echo "Warning: Failed to download Windows binary"
  exit 1
fi

# Update package using choco pack
choco pack

# Commit and push
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

git add .
git commit -m "Update ${PACKAGE_NAME} to ${TAG}"
git push origin main

echo "Successfully updated Chocolatey package for ${TAG}"

# Cleanup
cd /
rm -rf "$TEMP_DIR"
