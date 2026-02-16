# AgentVibes Server Auto-Start Uninstallation Script
# Removes the Windows scheduled task for AgentVibes server
# Run this script as Administrator

param(
    [string]$TaskName = "AgentVibes Server"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AgentVibes Server Auto-Start Uninstaller" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Check if task exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $existingTask) {
    Write-Host "Scheduled task '$TaskName' not found." -ForegroundColor Yellow
    Write-Host "Nothing to uninstall." -ForegroundColor Yellow
    exit 0
}

# Stop the task if running
try {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    Write-Host "Stopped any running instances of the task." -ForegroundColor Green
} catch {
    # Task might not be running, that's fine
}

# Remove the task
try {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "" -ForegroundColor Green
    Write-Host "SUCCESS! Scheduled task '$TaskName' has been removed." -ForegroundColor Green
    Write-Host "" -ForegroundColor Green
    Write-Host "AgentVibes Server will no longer auto-start on Windows logon." -ForegroundColor Green
    exit 0
} catch {
    Write-Host "ERROR: Failed to remove scheduled task!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
