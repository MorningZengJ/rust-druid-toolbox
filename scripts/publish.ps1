<#
.SYNOPSIS
    One-click build and publish for MToolbox (Tauri v2).
.DESCRIPTION
    Bumps version in all config files, runs the full Tauri build, generates
    updater.json with correct signatures, creates a git tag, pushes to GitHub,
    and creates a GitHub Release with auto-generated Release Notes.
.PARAMETER Version
    New version to publish (semver, e.g. "0.1.5"). If omitted, defaults to current version.
.PARAMETER SkipBuild
    Skip npm build and cargo tauri build (use after a manual build).
.PARAMETER SkipPush
    Skip git push and GitHub Release creation (local dry-run).
.PARAMETER SkipConfirm
    Skip all confirmation prompts (unattended mode).
.PARAMETER AllowDirty
    Allow dirty working tree (skip clean check).
.EXAMPLE
    .\scripts\publish.ps1 -Version "0.1.5"
.EXAMPLE
    .\scripts\publish.ps1
#>

param(
    [string]$Version,
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$SkipConfirm,
    [switch]$AllowDirty
)

$ErrorActionPreference = "Stop"

# Ensure UTF-8 for Chinese characters in git diff / git log
$OutputEncoding = [System.Text.UTF8Encoding]::new()
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8

$RepoRoot = Resolve-Path "$PSScriptRoot/.."

# --- Constants ---
$ProductName = "MToolbox"
$RepoOwner   = "MorningZengJ"
$RepoName    = "mtoolbox"
$RemoteName  = "origin"
$TotalSteps  = 12

# --- File paths ---
$CargoToml   = "$RepoRoot/src-tauri/Cargo.toml"
$TauriConf   = "$RepoRoot/src-tauri/tauri.conf.json"
$UpdaterJson = "$RepoRoot/updater.json"
$PackageJson = "$RepoRoot/frontend/package.json"

# --- Build artifact paths ---
$BundleNsisDir = "$RepoRoot/target/release/bundle/nsis"
$BundleMsiDir  = "$RepoRoot/target/release/bundle/msi"

# ============================================================
# Helper functions
# ============================================================

function Write-Step { param([int]$Num, [string]$Desc); Write-Host "`n[$Num/$TotalSteps] $Desc" -ForegroundColor Cyan }
function Write-Info { param([string]$Msg); Write-Host "  $Msg" -ForegroundColor Green }
function Write-Warn { param([string]$Msg); Write-Host "  WARN: $Msg" -ForegroundColor Yellow }
function Write-Err  { param([string]$Msg); Write-Host "  ERROR: $Msg" -ForegroundColor Red }

function Confirm-Action {
    param([string]$Prompt)
    if ($SkipConfirm) { return $true }
    $resp = Read-Host "$Prompt [Y/n]"
    return ($resp -eq '' -or $resp -eq 'y' -or $resp -eq 'Y')
}

function Get-CurrentVersion {
    return (Get-Content $TauriConf -Raw | ConvertFrom-Json).version
}

function Get-ReleaseNotes {
    $prevTag = git tag --sort=-version:refname | Select-Object -First 1
    if (-not $prevTag) {
        $log = git log --pretty=format:"- %s" --reverse
    } else {
        $log = git log "$prevTag..HEAD" --pretty=format:"- %s" --reverse
    }
    $lines = New-Object System.Collections.ArrayList
    if ($log) {
        [void]$lines.Add("Changes since ${prevTag}:")
        [void]$lines.Add("")
        [void]$lines.Add($log)
    } else {
        [void]$lines.Add("No changes since last release.")
    }
    return $lines -join [System.Environment]::NewLine
}

# ============================================================
# Phase 0: Preflight
# ============================================================

Write-Host "=== MToolbox Publish Script ===" -ForegroundColor Cyan

try {
    # --- Step 1: Prerequisites ---
    Write-Step -Num 1 -Desc "Checking prerequisites..."

    $required = @(
        @{cmd="gh";   name="GitHub CLI (gh)"},
        @{cmd="cargo"; name="cargo"},
        @{cmd="node";  name="Node.js"},
        @{cmd="npm";   name="npm"},
        @{cmd="git";   name="git"}
    )
    $missing = @()
    foreach ($req in $required) {
        $null = Get-Command $req.cmd -ErrorAction SilentlyContinue
        if (-not $?) { $missing += $req.name }
    }
    if ($missing.Count -gt 0) {
        throw "Missing prerequisites: $($missing -join ', '). Please install them first."
    }
    Write-Info "All prerequisites found."

    if (-not $SkipPush) {
        $null = gh auth status 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "GitHub CLI not authenticated. Run 'gh auth login' first, or use -SkipPush." }
        Write-Info "GitHub CLI authenticated."
    }

    # --- Step 2: Signing key ---
    Write-Step -Num 2 -Desc "Checking signing key..."
    if ($env:TAURI_SIGNING_PRIVATE_KEY) {
        Write-Info "Using TAURI_SIGNING_PRIVATE_KEY."
    } elseif ($env:TAURI_PRIVATE_KEY) {
        Write-Info "Using TAURI_PRIVATE_KEY (legacy fallback)."
        $env:TAURI_SIGNING_PRIVATE_KEY = $env:TAURI_PRIVATE_KEY
    } else {
        throw "TAURI_SIGNING_PRIVATE_KEY not set. Set it before running, e.g.:`n  `$env:TAURI_SIGNING_PRIVATE_KEY = `"<key-content>`""
    }

    # --- Step 3: Clean working tree ---
    Write-Step -Num 3 -Desc "Checking git working tree..."
    if (-not $AllowDirty) {
        $status = git status --porcelain
        if ($status) { throw "Working tree not clean. Commit or stash changes first.`n$status`nOr use -AllowDirty to skip this check." }
        Write-Info "Working tree is clean."
    } else {
        Write-Warn "Working tree check skipped (-AllowDirty)."
    }

    # ============================================================
    # Phase 1: Version
    # ============================================================

    # --- Step 4: Determine version ---
    Write-Step -Num 4 -Desc "Determining version..."
    $currentVersion = Get-CurrentVersion
    Write-Info "Current version: $currentVersion"

    if (-not $Version) {
        $input = Read-Host "Enter new version (default: $currentVersion)"
        if (-not $input) { $Version = $currentVersion } else { $Version = $input }
    }
    if ($Version -notmatch '^\d+\.\d+\.\d+$') {
        throw "Invalid version format: '$Version'. Expected semver (e.g., 0.1.5)."
    }
    Write-Info "New version: $Version"

    # --- Step 5: Update config files ---
    Write-Step -Num 5 -Desc "Updating version in config files..."

    # Cargo.toml: version = "X.Y.Z"
    $content = Get-Content $CargoToml -Raw
    $content = $content -replace '(^version\s*=\s*")[^"]+(")', "`${1}$Version`${2}"
    Set-Content -Path $CargoToml -Value $content -NoNewline

    # tauri.conf.json: "version": "X.Y.Z"
    $content = Get-Content $TauriConf -Raw
    $content = $content -replace '("version"\s*:\s*")[^"]+(")', "`${1}$Version`${2}"
    Set-Content -Path $TauriConf -Value $content -NoNewline

    # package.json: "version": "X.Y.Z"
    $content = Get-Content $PackageJson -Raw
    $content = $content -replace '("version"\s*:\s*")[^"]+(")', "`${1}$Version`${2}"
    Set-Content -Path $PackageJson -Value $content -NoNewline

    # updater.json: just version for now, full regen in Step 8
    $content = Get-Content $UpdaterJson -Raw
    $content = $content -replace '("version"\s*:\s*")[^"]+(")', "`${1}$Version`${2}"
    Set-Content -Path $UpdaterJson -Value $content -NoNewline

    Write-Info "Version updated."
    git diff

    if (-not (Confirm-Action "Does the version bump look correct?")) {
        git checkout -- $CargoToml $TauriConf $UpdaterJson $PackageJson
        throw "Aborted by user."
    }

    # ============================================================
    # Phase 2: Build
    # ============================================================

    if (-not $SkipBuild) {
        # --- Step 6: Frontend ---
        Write-Step -Num 6 -Desc "Building frontend..."
        Push-Location "$RepoRoot/frontend"
        try {
            npm run build
            if ($LASTEXITCODE -ne 0) { throw "Frontend build failed. Run 'cd frontend && npm run build' to debug." }
            Write-Info "Frontend built."
        } finally { Pop-Location }

        # --- Step 7: Tauri ---
        Write-Step -Num 7 -Desc "Building Tauri app (this may take a while)..."
        Push-Location $RepoRoot
        try {
            cargo tauri build
            if ($LASTEXITCODE -ne 0) { throw "Tauri build failed. Check the error above." }
            Write-Info "Tauri app built."
        } finally { Pop-Location }
    } else {
        Write-Info "  Step 6 & 7: Build skipped (-SkipBuild)."
    }

    # ============================================================
    # Phase 3: Updater config
    # ============================================================

    # --- Step 8: Generate updater.json ---
    Write-Step -Num 8 -Desc "Generating updater.json..."

    $nsisSigFile = "$BundleNsisDir/${ProductName}_${Version}_x64-setup.exe.sig"
    $msiSigFile  = "$BundleMsiDir/${ProductName}_${Version}_x64_en-US.msi.sig"

    if (-not (Test-Path $nsisSigFile)) { throw "NSIS .sig not found: $nsisSigFile" }
    if (-not (Test-Path $msiSigFile))  { throw "MSI .sig not found: $msiSigFile" }

    $releaseBase = "https://github.com/${RepoOwner}/${RepoName}/releases/download/v${Version}"
    $updater = @{
        version  = $Version
        notes    = ""
        pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        platforms = @{
            "windows-x86_64" = @{
                signature = Get-Content $nsisSigFile -Raw
                url       = "${releaseBase}/${ProductName}_${Version}_x64-setup.exe"
            }
            "windows-x86_64-msi" = @{
                signature = Get-Content $msiSigFile -Raw
                url       = "${releaseBase}/${ProductName}_${Version}_x64_en-US.msi"
            }
        }
    }
    $updater | ConvertTo-Json -Depth 4 | Set-Content -Path $UpdaterJson -NoNewline -Encoding UTF8
    Write-Info "updater.json generated."

    # ============================================================
    # Phase 4: Git
    # ============================================================

    # --- Step 9: Commit ---
    Write-Step -Num 9 -Desc "Committing version bump..."
    git add $CargoToml $TauriConf $UpdaterJson $PackageJson
    git commit -m "chore: bump version to ${Version}"
    if ($LASTEXITCODE -ne 0) { throw "Git commit failed." }
    Write-Info "Committed."

    # --- Step 10: Tag ---
    Write-Step -Num 10 -Desc "Creating git tag..."
    if (-not (Confirm-Action "Create tag v${Version}?")) {
        Write-Warn "Tag skipped."
    } else {
        git tag -a "v${Version}" -m "Release v${Version}"
        if ($LASTEXITCODE -ne 0) { throw "Tag creation failed." }
        Write-Info "Tag v${Version} created."
    }

    # ============================================================
    # Phase 5: Publish
    # ============================================================

    if (-not $SkipPush) {
        # --- Step 11: Push ---
        Write-Step -Num 11 -Desc "Pushing to GitHub..."
        if (-not (Confirm-Action "Push commits and tag v${Version} to GitHub?")) {
            Write-Warn "Push skipped."
        } else {
            git push $RemoteName HEAD
            if ($LASTEXITCODE -ne 0) { throw "Git push failed." }
            Write-Info "Commits pushed."

            git push $RemoteName "v${Version}"
            if ($LASTEXITCODE -ne 0) { throw "Tag push failed." }
            Write-Info "Tag v${Version} pushed."
        }

        # --- Step 12: GitHub Release ---
        Write-Step -Num 12 -Desc "Creating GitHub Release..."
        if (-not (Confirm-Action "Create GitHub Release v${Version}?")) {
            Write-Warn "Release skipped."
        } else {
            $notes    = Get-ReleaseNotes
            $notesTmp = [System.IO.Path]::GetTempFileName()
            try {
                Set-Content -Path $notesTmp -Value $notes -Encoding UTF8

                $artifacts = @(
                    "$BundleNsisDir/${ProductName}_${Version}_x64-setup.exe"
                    "$BundleNsisDir/${ProductName}_${Version}_x64-setup.exe.sig"
                    "$BundleMsiDir/${ProductName}_${Version}_x64_en-US.msi"
                    "$BundleMsiDir/${ProductName}_${Version}_x64_en-US.msi.sig"
                ) | Where-Object { Test-Path $_ }

                if (-not $artifacts) { throw "No artifacts found to upload." }

                & gh release create "v${Version}" `
                    --title "MToolbox v${Version}" `
                    --notes-file $notesTmp `
                    @artifacts

                if ($LASTEXITCODE -ne 0) { throw "gh release create failed." }
                Write-Info "Release created: https://github.com/${RepoOwner}/${RepoName}/releases/tag/v${Version}"
            } finally {
                Remove-Item $notesTmp -Force -ErrorAction SilentlyContinue
            }
        }
    } else {
        Write-Info "  Step 11 & 12: Publish skipped (-SkipPush)."
    }

    # ============================================================
    # Phase 6: Summary
    # ============================================================

    Write-Host "`n=== Publish Complete: MToolbox v${Version} ===" -ForegroundColor Green
    Write-Host ""
    Write-Info "Installers:"
    Write-Info "  NSIS: target/release/bundle/nsis/${ProductName}_${Version}_x64-setup.exe"
    Write-Info "  MSI:  target/release/bundle/msi/${ProductName}_${Version}_x64_en-US.msi"
    if (-not $SkipPush) {
        Write-Info "Release: https://github.com/${RepoOwner}/${RepoName}/releases/tag/v${Version}"
    }
    Write-Info "Updater: https://raw.githubusercontent.com/${RepoOwner}/${RepoName}/master/updater.json"

} catch {
    Write-Host "`n=== Publish Failed ===" -ForegroundColor Red
    Write-Err $_.Exception.Message
    Write-Host ""
    Write-Warn "Recovery:"
    Write-Warn "  Revert version bump: git checkout -- src-tauri/Cargo.toml src-tauri/tauri.conf.json updater.json frontend/package.json"
    try { if (git rev-parse --verify "v${Version}" 2>$null) { Write-Warn "  Delete local tag: git tag -d v${Version}" } } catch {}
    exit 1
}
