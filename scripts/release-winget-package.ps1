#!/usr/bin/env pwsh
# Update WinGet package in winget-pkgs repository
# This script clones the winget-pkgs repo, updates the manifest, and creates a PR

param(
    [Parameter(Mandatory=$true)]
    [string]$Tag,

    [Parameter(Mandatory=$true)]
    [string]$GitHubToken
)

$ErrorActionPreference = "Stop"

$REPO_OWNER = "shunkakinoki"
$WINGET_REPO_OWNER = "microsoft"
$WINGET_REPO = "winget-pkgs"
$PACKAGE_IDENTIFIER = "ShunOpenComposer.OpenComposer"

if (-not $Tag) {
    Write-Error "TAG not provided"
    exit 1
}

if (-not $GitHubToken) {
    Write-Error "GITHUB_TOKEN not provided"
    exit 1
}

# Extract version from tag (remove prefix if present)
$version = $Tag -replace '^open-composer@', ''

# Clone the winget-pkgs repository
$tempDir = New-TemporaryDirectory
Set-Location $tempDir

git clone "https://x-access-token:${GitHubToken}@github.com/${WINGET_REPO_OWNER}/${WINGET_REPO}.git"
Set-Location $WINGET_REPO

# Find the package manifest directory
$manifestPath = Get-ChildItem -Path "." -Directory -Recurse |
    Where-Object { $_.Name -eq $PACKAGE_IDENTIFIER } |
    Select-Object -First 1

if (-not $manifestPath) {
    Write-Error "Package manifest directory not found for $PACKAGE_IDENTIFIER"
    exit 1
}

Set-Location $manifestPath.FullName

# Download the Windows installer and calculate checksums
$windowsZipUrl = "https://github.com/${REPO_OWNER}/open-composer/releases/download/${Tag}/open-composer-cli-win32-x64.zip"
Write-Host "Downloading Windows binary..."

try {
    Invoke-WebRequest -Uri $windowsZipUrl -OutFile "$env:TEMP\windows.zip"
    $hash = Get-FileHash "$env:TEMP\windows.zip" -Algorithm SHA256
    $checksum = $hash.Hash.ToLower()
    Write-Host "Windows binary SHA256: $checksum"
} catch {
    Write-Error "Failed to download Windows binary"
    exit 1
}

# Update version manifest
$versionManifestPath = "$version\$PACKAGE_IDENTIFIER.yaml"
if (-not (Test-Path $versionManifestPath)) {
    New-Item -ItemType Directory -Path $version -Force
}

$versionManifest = @"
PackageIdentifier: $PACKAGE_IDENTIFIER
PackageVersion: $version
DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.6.0
"@

$versionManifest | Out-File -FilePath $versionManifestPath -Encoding UTF8

# Update installer manifest
$installerManifestPath = "$version\$PACKAGE_IDENTIFIER.installer.yaml"
$installerManifest = @"
PackageIdentifier: $PACKAGE_IDENTIFIER
PackageVersion: $version
PackageLocale: en-US
Publisher: Shun Kakinoki
PackageName: Open Composer
License: MIT
ShortDescription: AI-powered development workflow tool
Installers:
- Architecture: x64
  InstallerType: zip
  InstallerUrl: $windowsZipUrl
  InstallerSha256: $checksum
  NestedInstallerType: portable
  NestedInstallerFiles:
  - RelativeFilePath: cli-win32-x64\bin\open-composer.exe
    PortableCommandAlias: open-composer
ManifestType: installer
ManifestVersion: 1.6.0
"@

$installerManifest | Out-File -FilePath $installerManifestPath -Encoding UTF8

# Update locale manifest
$localeManifestPath = "$version\$PACKAGE_IDENTIFIER.locale.en-US.yaml"
$localeManifest = @"
PackageIdentifier: $PACKAGE_IDENTIFIER
PackageVersion: $version
PackageLocale: en-US
Publisher: Shun Kakinoki
PublisherUrl: https://github.com/shunkakinoki
PublisherSupportUrl: https://github.com/shunkakinoki/open-composer/issues
Author: Shun Kakinoki
PackageName: Open Composer
PackageUrl: https://github.com/shunkakinoki/open-composer
License: MIT
LicenseUrl: https://github.com/shunkakinoki/open-composer/blob/main/LICENSE
ShortDescription: AI-powered development workflow tool
Description: Open Composer is an AI-powered development workflow tool that helps you write better code faster.
Moniker: open-composer
Tags:
- ai
- development
- workflow
- cli
- productivity
ReleaseNotesUrl: https://github.com/shunkakinoki/open-composer/releases/tag/$Tag
ManifestType: defaultLocale
ManifestVersion: 1.6.0
"@

$localeManifest | Out-File -FilePath $localeManifestPath -Encoding UTF8

# Commit and create PR
git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

git add .
git commit -m "Update $PACKAGE_IDENTIFIER to $version"

# Create a branch for the PR
$branchName = "open-composer-$version"
git checkout -b $branchName
git push origin $branchName

# Create pull request using GitHub CLI or API
Write-Host "Successfully updated WinGet package for $Tag"

# Cleanup
Set-Location /
Remove-Item -Recurse -Force $tempDir
