<#
.SYNOPSIS
  Builds multi-architecture (linux/amd64) Docker images for Lex-Hub Backend & Frontend
  and pushes them to a single Docker Hub repository using tagged prefixes.

.DESCRIPTION
  Builds and pushes to a single Docker Hub repo (e.g. fadelmamar/lex-hub):
    - <DockerUser>/<RepoName>:backend-<Tag>   (e.g. fadelmamar/lex-hub:backend-latest)
    - <DockerUser>/<RepoName>:frontend-<Tag>  (e.g. fadelmamar/lex-hub:frontend-latest)

.EXAMPLE
  .\scripts\push-images.ps1
  .\scripts\push-images.ps1 -Tag "v1.0.0"
  .\scripts\push-images.ps1 -RepoName "lex-hub" -Tag "latest" -NextPublicApiUrl "https://api.yourdomain.com" -NextPublicSupabaseUrl "https://auth.yourdomain.com"
#>

param (
    [string]$DockerUser = "fadelmamar",
    [string]$RepoName = "lex-hub",
    [string]$Tag = "latest",
    [string]$Platform = "linux/amd64",
    [string]$NextPublicSupabaseUrl = "",
    [string]$NextPublicSupabaseKey = "",
    [string]$NextPublicApiUrl = ""
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path "$PSScriptRoot\.."
$FullRepo = "$DockerUser/$RepoName"

Write-Host "==> Single Docker Hub Repository: $FullRepo" -ForegroundColor Cyan
Write-Host "==> Target Tag Suffix: $Tag" -ForegroundColor Cyan
Write-Host "==> Target Platform: $Platform" -ForegroundColor Cyan

# Check for .env to load default frontend build args if not explicitly provided
$EnvFile = Join-Path $RepoRoot ".env"
if (Test-Path $EnvFile) {
    Write-Host "==> Loading environment variables from .env..." -ForegroundColor Yellow
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $k = $parts[0].Trim()
            $v = $parts[1].Trim()
            if (-not [string]::IsNullOrEmpty($k)) {
                if ($k -eq "NEXT_PUBLIC_SUPABASE_URL" -and [string]::IsNullOrEmpty($NextPublicSupabaseUrl)) { $NextPublicSupabaseUrl = $v }
                if ($k -eq "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY" -and [string]::IsNullOrEmpty($NextPublicSupabaseKey)) { $NextPublicSupabaseKey = $v }
                if ($k -eq "NEXT_PUBLIC_API_BASE_URL" -and [string]::IsNullOrEmpty($NextPublicApiUrl)) { $NextPublicApiUrl = $v }
            }
        }
    }
}

# Fallbacks for frontend build args if still empty
if ([string]::IsNullOrEmpty($NextPublicSupabaseUrl)) { $NextPublicSupabaseUrl = "http://localhost:54321" }
if ([string]::IsNullOrEmpty($NextPublicApiUrl)) { $NextPublicApiUrl = "http://localhost:3001" }

# Ensure Docker Buildx builder exists
Write-Host "==> Setting up Docker Buildx..." -ForegroundColor Cyan
$builderName = "lexhub-builder"
$builders = docker buildx ls
if ($builders -notmatch $builderName) {
    docker buildx create --name $builderName --use
} else {
    docker buildx use $builderName
}
docker buildx inspect --bootstrap

# 1. Build and push Backend
$BackendImage = "$($FullRepo):backend-$Tag"
Write-Host "`n==> [1/2] Building and Pushing Backend Image: $BackendImage ($Platform)..." -ForegroundColor Green
docker buildx build `
    --platform $Platform `
    -t $BackendImage `
    --push `
    "$RepoRoot/backend"

# 2. Build and push Frontend
$FrontendImage = "$($FullRepo):frontend-$Tag"
Write-Host "`n==> [2/2] Building and Pushing Frontend Image: $FrontendImage ($Platform)..." -ForegroundColor Green
Write-Host "    Build Args:" -ForegroundColor Gray
Write-Host "    - NEXT_PUBLIC_SUPABASE_URL: $NextPublicSupabaseUrl" -ForegroundColor Gray
Write-Host "    - NEXT_PUBLIC_API_BASE_URL: $NextPublicApiUrl" -ForegroundColor Gray

docker buildx build `
    --platform $Platform `
    --build-arg NEXT_PUBLIC_SUPABASE_URL="$NextPublicSupabaseUrl" `
    --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="$NextPublicSupabaseKey" `
    --build-arg NEXT_PUBLIC_API_BASE_URL="$NextPublicApiUrl" `
    -t $FrontendImage `
    --push `
    "$RepoRoot/frontend"

Write-Host "`n Successfully built and pushed both images to $($FullRepo):" -ForegroundColor Green
Write-Host "  - $BackendImage" -ForegroundColor White
Write-Host "  - $FrontendImage" -ForegroundColor White
