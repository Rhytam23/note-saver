<#
.SYNOPSIS
  Packages the already-built Tauri Windows release into an MSIX package for
  Microsoft Store submission ("Desktop Bridge" style - wraps the existing
  Win32 exe, not a rewrite as native UWP).

.DESCRIPTION
  Run `npm run tauri:build` (or `cargo tauri build`) first so
  src-tauri/target/release/notenirman.exe exists. This script then:
    1. Stages that exe + its runtime DLL, the Store tile icons, and a
       manifest (with identity values substituted in) into a folder.
    2. Packs that folder into a .msix with the Windows SDK's makeappx.exe.
    3. Optionally self-signs it (-SignForTesting) so you can sideload and
       test it locally. That self-signed cert is NOT what ships to the
       Store - the Store re-signs with its own certificate on
       certification, so signing here is purely for your own local test
       install before you submit.

  Without real identity values (from Microsoft Partner Center, after you've
  reserved the app name), this produces a package with the placeholder
  identity baked in - it will pack and can be sideload-tested, but the
  Store will reject it on submission until you pass your real
  IdentityName/Publisher/PublisherDisplayName. See docs/MICROSOFT-STORE.md.

.PARAMETER IdentityName
  The exact "Package/Identity/Name" from your Partner Center app identity
  reservation. Defaults to a placeholder that will NOT pass Store
  submission.

.PARAMETER Publisher
  The exact "Package/Identity/Publisher" certificate subject (e.g.
  "CN=1A2B3C4D-...") from the same reservation.

.PARAMETER PublisherDisplayName
  The publisher display name shown to users, also from Partner Center.

.PARAMETER Version
  Four-part MSIX version (Major.Minor.Build.Revision). Defaults to the app
  version from tauri.conf.json with a trailing .0.

.PARAMETER SignForTesting
  If set, generates (or reuses) a local self-signed certificate and signs
  the package so you can sideload-install it for testing. Requires
  Developer Mode enabled on the test machine, or the cert trusted into
  Local Machine > Trusted People.

.EXAMPLE
  ./build-msix.ps1
  # Builds with placeholder identity - fine for a local sideload test.

.EXAMPLE
  ./build-msix.ps1 -IdentityName "12345Publisher.NoteNirman" `
    -Publisher "CN=A1B2C3D4-1234-5678-9ABC-DEF012345678" `
    -PublisherDisplayName "Your Publisher Display Name" `
    -SignForTesting
#>

param(
  [string]$IdentityName = "UnpublishedPlaceholder.NoteNirman",
  [string]$Publisher = "CN=00000000-0000-0000-0000-000000000000",
  [string]$PublisherDisplayName = "NoteNirman (placeholder - not yet reserved)",
  [string]$Version = "",
  [switch]$SignForTesting
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot           # src-tauri/
$repoRoot = Split-Path -Parent $root                # repo root
$releaseDir = Join-Path $root "target/release"
$iconsDir = Join-Path $root "icons"
$stagingDir = Join-Path $root "msix/staging"
$outDir = Join-Path $root "msix/dist"

if (-not (Test-Path (Join-Path $releaseDir "notenirman.exe"))) {
  throw "notenirman.exe not found in $releaseDir - run 'npm run tauri:build' (or 'cargo tauri build') first."
}

if ([string]::IsNullOrWhiteSpace($Version)) {
  $tauriConf = Get-Content (Join-Path $root "tauri.conf.json") -Raw | ConvertFrom-Json
  $Version = "$($tauriConf.version).0"
}

Write-Host "Packaging NoteNirman $Version as MSIX"
Write-Host "  IdentityName          : $IdentityName"
Write-Host "  Publisher             : $Publisher"
Write-Host "  PublisherDisplayName  : $PublisherDisplayName"
if ($IdentityName -eq "UnpublishedPlaceholder.NoteNirman") {
  Write-Warning "Using placeholder identity - this package will sideload-test fine but will be REJECTED on Store submission. See docs/MICROSOFT-STORE.md."
}

# --- Stage files -------------------------------------------------------
if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
New-Item -ItemType Directory -Path $stagingDir | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stagingDir "Assets") | Out-Null
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

Copy-Item (Join-Path $releaseDir "notenirman.exe") $stagingDir
Copy-Item (Join-Path $releaseDir "WebView2Loader.dll") $stagingDir -ErrorAction SilentlyContinue

$assetFiles = @(
  "Square44x44Logo.png", "Square71x71Logo.png", "Square150x150Logo.png",
  "Square310x310Logo.png", "StoreLogo.png"
)
foreach ($f in $assetFiles) {
  $src = Join-Path $iconsDir $f
  if (Test-Path $src) {
    Copy-Item $src (Join-Path $stagingDir "Assets")
  } else {
    Write-Warning "Missing icon asset: $f (expected at $src) - run 'npx tauri icon' to regenerate."
  }
}

$manifest = Get-Content (Join-Path $PSScriptRoot "AppxManifest.template.xml") -Raw
$manifest = $manifest.Replace("__IDENTITY_NAME__", $IdentityName)
$manifest = $manifest.Replace("__PUBLISHER__", $Publisher)
$manifest = $manifest.Replace("__PUBLISHER_DISPLAY_NAME__", $PublisherDisplayName)
$manifest = $manifest.Replace("__VERSION__", $Version)
Set-Content -Path (Join-Path $stagingDir "AppxManifest.xml") -Value $manifest -Encoding UTF8

# --- Locate makeappx.exe / signtool.exe (Windows SDK) -------------------
function Find-SdkTool([string]$name) {
  $found = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin\*\x64\$name" -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $found) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw "$name not found. Install the Windows 10/11 SDK (includes the App Certification / MSIX Packaging tools)."
  }
  return $found.FullName
}

$makeappx = Find-SdkTool "makeappx.exe"

# --- Pack ----------------------------------------------------------------
$outFile = Join-Path $outDir "NoteNirman_$($Version)_x64.msix"
if (Test-Path $outFile) { Remove-Item $outFile -Force }

& $makeappx pack /d $stagingDir /p $outFile /o
if ($LASTEXITCODE -ne 0) { throw "makeappx failed with exit code $LASTEXITCODE" }

Write-Host "Built: $outFile"

# --- Optional local sideload signing --------------------------------------
if ($SignForTesting) {
  $signtool = Find-SdkTool "signtool.exe"
  $certSubject = $Publisher
  $pfxPath = Join-Path $root "msix/local-test-cert.pfx"
  $pfxPassword = "notenirman-local-test"

  $existing = Get-ChildItem Cert:\CurrentUser\My |
    Where-Object { $_.Subject -eq $certSubject -and $_.NotAfter -gt (Get-Date) } |
    Select-Object -First 1

  if ($existing) {
    $cert = $existing
  } else {
    Write-Host "Creating a local self-signed test certificate for $certSubject (NOT used for the real Store submission)"
    $cert = New-SelfSignedCertificate -Type Custom -Subject $certSubject `
      -KeyUsage DigitalSignature -FriendlyName "NoteNirman local MSIX test cert" `
      -CertStoreLocation "Cert:\CurrentUser\My" `
      -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
    $securePwd = ConvertTo-SecureString -String $pfxPassword -Force -AsPlainText
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePwd | Out-Null
    Write-Host "Exported test cert to $pfxPath (password: $pfxPassword) - import it into 'Trusted People' to sideload-install without a Developer Mode prompt loop."
  }

  & $signtool sign /fd SHA256 /a /s My /sha1 $cert.Thumbprint $outFile
  if ($LASTEXITCODE -ne 0) { throw "signtool failed with exit code $LASTEXITCODE" }
  Write-Host "Signed for local testing. Install with: Add-AppxPackage -Path '$outFile'"
}
