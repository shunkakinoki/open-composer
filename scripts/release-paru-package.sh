#!/bin/bash
set -e

# Update AUR package for paru
# This script clones the AUR package repo, updates the PKGBUILD, and pushes changes

TAG="${1:-${GITHUB_REF_NAME}}"
REPO_OWNER="shunkakinoki"
AUR_REPO="open-composer-aur"
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

# Extract version from tag
VERSION="${TAG#open-composer@}"

# Clone the AUR package repository
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# AUR repos are typically under the package name
git clone "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO_OWNER}/${AUR_REPO}.git"
cd "$AUR_REPO"

# Download the Linux binary and calculate checksums
LINUX_X64_URL="https://github.com/${REPO_OWNER}/open-composer/releases/download/${TAG}/open-composer-cli-linux-x64.zip"
LINUX_ARM64_URL="https://github.com/${REPO_OWNER}/open-composer/releases/download/${TAG}/open-composer-cli-linux-aarch64-musl.zip"

echo "Downloading Linux binaries..."

declare -A CHECKSUMS

# Download x64 binary
if curl -fsSL -o "/tmp/linux-x64.zip" "$LINUX_X64_URL"; then
  checksum_x64=$(sha256sum "/tmp/linux-x64.zip" | awk '{print $1}')
  CHECKSUMS["x64"]=$checksum_x64
  echo "  Linux x64 checksum: $checksum_x64"
else
  echo "Warning: Failed to download Linux x64 binary"
  CHECKSUMS["x64"]="0000000000000000000000000000000000000000000000000000000000000000"
fi

# Download arm64 binary
if curl -fsSL -o "/tmp/linux-arm64.zip" "$LINUX_ARM64_URL"; then
  checksum_arm64=$(sha256sum "/tmp/linux-arm64.zip" | awk '{print $1}')
  CHECKSUMS["arm64"]=$checksum_arm64
  echo "  Linux arm64 checksum: $checksum_arm64"
else
  echo "Warning: Failed to download Linux arm64 binary"
  CHECKSUMS["arm64"]="0000000000000000000000000000000000000000000000000000000000000000"
fi

# Update PKGBUILD
cat > PKGBUILD <<EOF
# Maintainer: Shun Kakinoki <shun.kakinoki@gmail.com>
pkgname=open-composer
pkgver=${VERSION}
pkgrel=1
pkgdesc="AI-powered development workflow tool"
arch=('x86_64' 'aarch64')
url="https://github.com/shunkakinoki/open-composer"
license=('MIT')
depends=('glibc')
provides=('open-composer')
conflicts=('open-composer')
source_x86_64=("open-composer-cli-linux-x64.zip::${LINUX_X64_URL}")
source_aarch64=("open-composer-cli-linux-aarch64-musl.zip::${LINUX_ARM64_URL}")
sha256sums_x86_64=('${CHECKSUMS["x64"]}')
sha256sums_aarch64=('${CHECKSUMS["arm64"]}')

package() {
    cd "\$srcdir"

    if [[ \$CARCH == x86_64 ]]; then
        bsdtar -xf open-composer-cli-linux-x64.zip
        install -Dm755 cli-linux-x64/bin/open-composer "\$pkgdir/usr/bin/open-composer"
    elif [[ \$CARCH == aarch64 ]]; then
        bsdtar -xf open-composer-cli-linux-aarch64-musl.zip
        install -Dm755 cli-linux-aarch64-musl/bin/open-composer "\$pkgdir/usr/bin/open-composer"
    fi
}
EOF

# Generate .SRCINFO
makepkg --printsrcinfo > .SRCINFO

# Commit and push
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

git add PKGBUILD .SRCINFO
git commit -m "Update to ${TAG}"
git push origin main

echo "Successfully updated AUR package for ${TAG}"

# Cleanup
cd /
rm -rf "$TEMP_DIR"
