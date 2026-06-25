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

function Remove-FileWithRetry {
    param([string]$Path, [int]$MaxRetries = 5, [int]$BaseDelayMs = 1000)
    for ($i = 0; $i -lt $MaxRetries; $i++) {
        if (-not (Test-Path $Path)) { return $true }
        try {
            Remove-Item $Path -Force -ErrorAction Stop
            return $true
        } catch {
            Write-Warn "Cannot remove ${Path} (attempt $($i+1)/$MaxRetries): $_"
            Start-Sleep -Milliseconds ($BaseDelayMs * [Math]::Pow(2, $i))
        }
    }
    return $false
}

function Confirm-Action {
    param([string]$Prompt)
    if ($SkipConfirm) { return $true }
    $resp = Read-Host "$Prompt [Y/n]"
    return ($resp -eq '' -or $resp -eq 'y' -or $resp -eq 'Y')
}

function Get-CurrentVersion {
    return (Get-Content $TauriConf -Raw -Encoding UTF8 | ConvertFrom-Json).version
}

function Get-ReleaseNotes {
    $prevTag = git tag --sort=-version:refname | Select-Object -First 1
    if (-not $prevTag) {
        return ""
    }
    $log = git log "$prevTag..HEAD" --pretty=format:"- %s" --reverse 2>$null
    if (-not $log) { return "" }
    return "Changes since ${prevTag}:`r`n`r`n${log}"
}

function Escape-JsonString {
    param([string]$S)
    $S = $S -replace '\\', '\\'
    $S = $S -replace '"', '\"'
    $S = $S -replace "`r`n", '\n'
    $S = $S -replace "`n", '\n'
    $S = $S -replace "`t", '\t'
    return $S
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

    # Resolve legacy TAURI_PRIVATE_KEY fallback
    if ((-not $env:TAURI_SIGNING_PRIVATE_KEY) -and $env:TAURI_PRIVATE_KEY) {
        Write-Info "Using TAURI_PRIVATE_KEY (legacy fallback)."
        $env:TAURI_SIGNING_PRIVATE_KEY = $env:TAURI_PRIVATE_KEY
    }

    if (-not $env:TAURI_SIGNING_PRIVATE_KEY) {
        throw "TAURI_SIGNING_PRIVATE_KEY not set. Set it before running, e.g.:`n  `$env:TAURI_SIGNING_PRIVATE_KEY = `"<key-file-path-or-content>`""
    }

    # Detect if the value is a file path rather than inline key content
    if (Test-Path $env:TAURI_SIGNING_PRIVATE_KEY -PathType Leaf) {
        Write-Info "TAURI_SIGNING_PRIVATE_KEY is a file path, reading contents..."
        $keyContent = Get-Content $env:TAURI_SIGNING_PRIVATE_KEY -Raw
        # Save original path for MSI manual signing fallback
        $env:TAURI_SIGNING_PRIVATE_KEY_PATH = $env:TAURI_SIGNING_PRIVATE_KEY
        # Set inline content so both `cargo tauri build` and `signer sign` can use it
        $env:TAURI_SIGNING_PRIVATE_KEY = $keyContent.Trim()
        Write-Info "Key loaded from file."
    } else {
        Write-Info "Using TAURI_SIGNING_PRIVATE_KEY as inline key content."
    }

    # Ensure password env exists (empty password for unencrypted keys)
    if (-not (Test-Path "env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD")) {
        $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ""
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
    $content = Get-Content $CargoToml -Raw -Encoding UTF8
    $content = $content -replace '(^version\s*=\s*")[^"]+(")', "`${1}$Version`${2}"
    [System.IO.File]::WriteAllText($CargoToml, $content, (New-Object System.Text.UTF8Encoding $false))

    # tauri.conf.json: "version": "X.Y.Z"
    $content = Get-Content $TauriConf -Raw -Encoding UTF8
    $content = $content -replace '("version"\s*:\s*")[^"]+(")', "`${1}$Version`${2}"
    [System.IO.File]::WriteAllText($TauriConf, $content, (New-Object System.Text.UTF8Encoding $false))

    # package.json: "version": "X.Y.Z"
    $content = Get-Content $PackageJson -Raw -Encoding UTF8
    $content = $content -replace '("version"\s*:\s*")[^"]+(")', "`${1}$Version`${2}"
    [System.IO.File]::WriteAllText($PackageJson, $content, (New-Object System.Text.UTF8Encoding $false))

    Write-Info "Version updated."
    git diff

    if (-not (Confirm-Action "Does the version bump look correct?")) {
        git checkout -- $CargoToml $TauriConf $PackageJson
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

        # 7a: NSIS — build separately to avoid WiX light.exe file-lock contention
        Write-Info "Building NSIS installer..."
        Push-Location $RepoRoot
        try {
            cargo tauri build --bundles nsis
            if ($LASTEXITCODE -ne 0) { throw "NSIS build failed. Check the error above." }
            Write-Info "NSIS installer built."
        } finally { Pop-Location }

        # 7b: MSI — built separately; light.exe may fail due to file locking
        Write-Info "Building MSI installer..."

        # Pre-clean: remove old MSI to release stale file locks
        $msiOut = "$BundleMsiDir/${ProductName}_${Version}_x64_en-US.msi"
        if (Test-Path $msiOut) {
            Write-Info "Removing old MSI file..."
            if (-not (Remove-FileWithRetry $msiOut)) {
                throw "Cannot remove locked MSI: $msiOut. Close any programs that may be holding it."
            }
            Write-Info "Old MSI file removed."
        }

        Push-Location $RepoRoot
        try {
            cargo tauri build --bundles msi
            if ($LASTEXITCODE -eq 0) {
                Write-Info "MSI installer built."
            } else {
                # light.exe often fails with IOException (file locked by another process).
                # Fall back to manual invocation with exponential backoff retry.
                Write-Warn "cargo tauri build --bundles msi failed (likely light.exe file lock)."
                Write-Info "Retrying with manual light.exe..."

                $wixObj   = "$RepoRoot/target/release/wix/x64/main.wixobj"
                $wxl      = "$RepoRoot/target/release/wix/x64/locale.wxl"
                $wixTools = "$env:LOCALAPPDATA/tauri/WixTools314"
                $lightExe = "$wixTools/light.exe"

                if (-not (Test-Path $wixObj)) {
                    throw "WiX object file not found: $wixObj. MSI build cannot proceed."
                }

                $lightArgs = @(
                    "-nologo",
                    "-sval",
                    "-ext", "WixUtilExtension",
                    "-ext", "WixUIExtension",
                    "-out", $msiOut,
                    $wixObj,
                    "-loc", $wxl,
                    "-cultures:en-US"
                )

                # Exponential backoff retry loop
                $maxRetries = 5
                $success = $false
                for ($retry = 0; $retry -lt $maxRetries; $retry++) {
                    $delay = [Math]::Pow(2, $retry + 1)  # 2, 4, 8, 16, 32 seconds
                    Write-Info "Retry $($retry+1)/$maxRetries — waiting ${delay}s..."
                    Start-Sleep -Seconds $delay

                    # Re-delete MSI in case a previous failed attempt left a locked file
                    Remove-Item $msiOut -Force -ErrorAction SilentlyContinue

                    & $lightExe @lightArgs
                    if ($LASTEXITCODE -eq 0) {
                        $success = $true
                        Write-Info "MSI built via manual light.exe (attempt $($retry+1))."
                        break
                    }
                    Write-Warn "light.exe failed (exit code: $LASTEXITCODE), retrying..."
                }
                if (-not $success) {
                    throw "Manual light.exe failed after $maxRetries attempts."
                }
            }
        } finally { Pop-Location }

        # 7c: Sign MSI manually if it wasn't auto-signed
        $msiSigPath = "$BundleMsiDir/${ProductName}_${Version}_x64_en-US.msi.sig"
        if (-not (Test-Path $msiSigPath)) {
            Write-Info "MSI not auto-signed, signing manually..."
            Push-Location $RepoRoot
            try {
                $msiFile = "$BundleMsiDir/${ProductName}_${Version}_x64_en-US.msi"
                if ($env:TAURI_SIGNING_PRIVATE_KEY_PATH) {
                    # Temporarily clear TAURI_SIGNING_PRIVATE_KEY to avoid conflict with --private-key-path
                    $savedPrivateKey = $env:TAURI_SIGNING_PRIVATE_KEY
                    Remove-Item Env:\TAURI_SIGNING_PRIVATE_KEY -ErrorAction SilentlyContinue
                    try {
                        cargo tauri signer sign --private-key-path $env:TAURI_SIGNING_PRIVATE_KEY_PATH $msiFile
                    } finally {
                        $env:TAURI_SIGNING_PRIVATE_KEY = $savedPrivateKey
                    }
                } else {
                    # Temporarily clear TAURI_SIGNING_PRIVATE_KEY_PATH to avoid conflict with --private-key
                    # (unlikely but defensive — the env var might be set from a previous run)
                    $savedPrivateKeyPath = $env:TAURI_SIGNING_PRIVATE_KEY_PATH
                    Remove-Item Env:\TAURI_SIGNING_PRIVATE_KEY_PATH -ErrorAction SilentlyContinue
                    try {
                        cargo tauri signer sign --private-key $env:TAURI_SIGNING_PRIVATE_KEY $msiFile
                    } finally {
                        if ($savedPrivateKeyPath) {
                            $env:TAURI_SIGNING_PRIVATE_KEY_PATH = $savedPrivateKeyPath
                        }
                    }
                }
                if ($LASTEXITCODE -ne 0) { throw "MSI signing failed." }
                Write-Info "MSI signed."
            } finally { Pop-Location }
        } else {
            Write-Info "MSI already signed."
        }
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

    $nsisSig = Get-Content $nsisSigFile -Raw -Encoding UTF8
    $msiSig  = Get-Content $msiSigFile -Raw -Encoding UTF8
    $pubDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $releaseBase = "https://github.com/${RepoOwner}/${RepoName}/releases/download/v${Version}"

    # Build JSON manually to avoid ConvertTo-Json encoding issues with PowerShell 5.x
    $nsisUrl  = "${releaseBase}/${ProductName}_${Version}_x64-setup.exe"
    $msiUrl   = "${releaseBase}/${ProductName}_${Version}_x64_en-US.msi"
    $releaseNotes = Get-ReleaseNotes
    $notesEscaped = Escape-JsonString $releaseNotes
    $jsonStr = @"
{
  "version": "${Version}",
  "notes": "${notesEscaped}",
  "pub_date": "${pubDate}",
  "platforms": {
    "windows-x86_64": {
      "signature": "${nsisSig}",
      "url": "${nsisUrl}"
    },
    "windows-x86_64-msi": {
      "signature": "${msiSig}",
      "url": "${msiUrl}"
    }
  }
}
"@
    # Write UTF-8 WITHOUT BOM (Tauri updater requires pure UTF-8)
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($UpdaterJson, $jsonStr, $utf8NoBom)
    Write-Info "updater.json generated."

    # Validate the generated updater.json
    try {
        $validateJson = Get-Content $UpdaterJson -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($validateJson.version -ne $Version) {
            throw "updater.json version mismatch: expected $Version, got $($validateJson.version)"
        }
        $platformNames = $validateJson.platforms | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name
        if ($platformNames.Count -eq 0) {
            throw "updater.json has no platforms defined"
        }
        Write-Info "updater.json validated (version: $Version, platforms: $platformNames)"
    } catch {
        throw "updater.json validation failed: $_"
    }

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
            $notes    = $releaseNotes
            $notesTmp = [System.IO.Path]::GetTempFileName()
            try {
                [System.IO.File]::WriteAllText($notesTmp, $notes, (New-Object System.Text.UTF8Encoding $false))

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
    Write-Warn "  Revert version bump: git checkout -- src-tauri/Cargo.toml src-tauri/tauri.conf.json frontend/package.json"
    Write-Warn "  Revert updater.json: git checkout -- updater.json"
    try { if (git rev-parse --verify "v${Version}" 2>$null) { Write-Warn "  Delete local tag: git tag -d v${Version}" } } catch {}
    exit 1
}
