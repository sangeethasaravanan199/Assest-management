param()

# run-local.ps1
# Attempts to start a local Postgres (Docker), initialize DB, and start backend/frontend dev servers

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

function Find-ProjectDirs {
    if (Test-Path (Join-Path $scriptDir 'backend')) {
        return @{ root = $scriptDir; backend = Join-Path $scriptDir 'backend'; frontend = Join-Path $scriptDir 'frontend' }
    }
    if (Test-Path (Join-Path $scriptDir 'Assest-project\backend')) {
        $r = Join-Path $scriptDir 'Assest-project'
        return @{ root = $r; backend = Join-Path $r 'backend'; frontend = Join-Path $r 'frontend' }
    }
    Write-Error "Could not locate backend/frontend directories relative to $scriptDir"
    exit 1
}

$paths = Find-ProjectDirs
$backendDir = $paths.backend
$frontendDir = $paths.frontend

Write-Output "Backend: $backendDir"
Write-Output "Frontend: $frontendDir"

function Ensure-DockerPostgres {
    $containerName = 'asset-postgres'
    Write-Output 'Checking Docker availability...'
    $dockerVersion = & docker version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Warning 'Docker CLI not available or Docker daemon not running. Skipping container startup.'
        return $false
    }

    $exists = docker ps -a --filter "name=$containerName" --format "{{.Names}}" | Select-String $containerName
    if (-not $exists) {
        Write-Output 'Creating Postgres container...'
        docker run --name $containerName -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=assetdb -p 5432:5432 -d postgres:15 | Out-Null
        Start-Sleep -Seconds 2
    } else {
        $running = docker ps --filter "name=$containerName" --format "{{.Names}}" | Select-String $containerName
        if (-not $running) {
            Write-Output 'Starting existing Postgres container...'
            docker start $containerName | Out-Null
        } else {
            Write-Output 'Postgres container already running.'
        }
    }

    Write-Output 'Waiting for Postgres to accept connections on localhost:5432...'
    for ($i=0; $i -lt 30; $i++) {
        if (Test-NetConnection -ComputerName '127.0.0.1' -Port 5432 -WarningAction SilentlyContinue) {
            Write-Output 'Postgres is reachable.'
            return $true
        }
        Start-Sleep -Seconds 2
    }
    Write-Warning 'Postgres did not become reachable in time.'
    return $false
}

$dockerOk = Ensure-DockerPostgres

if ($dockerOk) {
    $env:DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/assetdb'
    Write-Output "Set DATABASE_URL=$($env:DATABASE_URL)"
} else {
    Write-Warning 'No Postgres started. If you have a DB, set DATABASE_URL in your environment before proceeding.'
}

function Run-CommandWindow($workingDir, $command, $title) {
    $cmd = "cd `"$workingDir`"; $command"
    Start-Process -FilePath powershell -ArgumentList "-NoExit","-NoProfile","-Command","$cmd" -WindowStyle Normal
    Write-Output "Launched: $title"
}

Write-Output 'Initializing database schema (backend)...'
Push-Location $backendDir
try {
    if ($null -ne $env:DATABASE_URL) {
        & npm run db:init
        if ($LASTEXITCODE -ne 0) { Write-Warning '`npm run db:init` returned non-zero exit code.' }
    } else {
        Write-Warning 'Skipping DB init because DATABASE_URL is not set.'
    }
} finally { Pop-Location }

Write-Output 'Starting backend and frontend in new terminal windows...'
Run-CommandWindow -workingDir $backendDir -command 'npm run dev' -title 'Backend (dev)'
Run-CommandWindow -workingDir $frontendDir -command 'npm run dev' -title 'Frontend (dev)'

Write-Output 'Done. Check the launched windows for server output.'
