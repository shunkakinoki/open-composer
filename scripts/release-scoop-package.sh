#!/bin/bash
set -e

# Update Scoop package in scoop bucket repository
# This script clones the scoop bucket repo, updates the manifest, and pushes changes

TAG="${1:-${GITHUB_REF_NAME}}"
REPO_OWNER="shunkakinoki"
SCOOP_BUCKET_REPO="scoop-bucket"
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

# Clone the scoop bucket repository
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_OWNER}/${SCOOP_BUCKET_REPO}.git"
cd "$SCOOP_BUCKET_REPO"

# Check if bucket directory exists
mkdir -p bucket

# Download the Windows installer and calculate checksum
WINDOWS_ZIP_URL="https://github.com/${REPO_OWNER}/open-composer/releases/download/${TAG}/open-composer-cli-win32-x64.zip"
echo "Downloading Windows binary..."

if curl -fsSL -o "/tmp/windows.zip" "$WINDOWS_ZIP_URL"; then
  checksum=$(sha256sum "/tmp/windows.zip" | awk '{print $1}')
  echo "Windows binary checksum: $checksum"
else
  echo "Warning: Failed to download Windows binary"
  exit 1
fi

# Create/update Scoop manifest
cat > "bucket/${PACKAGE_NAME}.json" <<EOF
{
    "version": "${TAG#open-composer@}",
    "description": "AI-powered development workflow tool",
    "homepage": "https://github.com/shunkakinoki/open-composer",
    "license": "MIT",
    "architecture": {
        "64bit": {
            "url": "$WINDOWS_ZIP_URL",
            "hash": "$checksum",
            "extract_dir": "cli-win32-x64"
        }
    },
    "bin": "bin/open-composer.exe",
    "shortcuts": [
        [
            "bin/open-composer.exe",
            "Open Composer"
        ]
    ],
    "checkver": {
        "github": "https://github.com/shunkakinoki/open-composer"
    },
    "autoupdate": {
        "architecture": {
            "64bit": {
                "url": "https://github.com/shunkakinoki/open-composer/releases/download/open-composer@\$version/open-composer-cli-win32-x64.zip"
            }
        }
    }
}
EOF

# Commit and push
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

git add "bucket/${PACKAGE_NAME}.json"
git commit -m "Update ${PACKAGE_NAME} to ${TAG}"
git push origin main

echo "Successfully updated Scoop package for ${TAG}"

# Cleanup
cd /
rm -rf "$TEMP_DIR"
