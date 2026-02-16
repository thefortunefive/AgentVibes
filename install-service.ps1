# AgentVibes Server Auto-Start Installation Script
# Creates a Windows scheduled task to run AgentVibes server at user logon
# Run this script as Administrator

param(
    [string]$WorkingDirectory = "C:\FifthAveAI\AgentVibes",
    [string]$TaskName = "AgentVibes Server"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AgentVibes Server Auto-Start Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Verify working directory exists
if (-not (Test-Path $WorkingDirectory)) {
    Write-Host "ERROR: Working directory not found: $WorkingDirectory" -ForegroundColor Red
    Write-Host "Please ensure AgentVibes is installed at the correct location." -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "Found Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js not found in PATH!" -ForegroundColor Red
    Write-Host "Please ensure Node.js is installed and added to your system PATH." -ForegroundColor Yellow
    exit 1
}

# Remove existing task if it exists
$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Write-Host "Removing existing scheduled task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create the action - run npx tsx with hidden window
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-WindowStyle Hidden -Command `"cd '$WorkingDirectory'; npx tsx --require dotenv/config api/server.ts`" -WorkingDirectory $WorkingDirectory

# Create the trigger - at user logon
$trigger = New-ScheduledTaskTrigger -AtLogOn

# Create task settings - hidden window, allow network connections
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -Hidden

# Create the principal - run with highest privileges
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Highest

# Register the task
try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
    Write-Host "" -ForegroundColor Green
    Write-Host "SUCCESS! AgentVibes Server scheduled task created." -ForegroundColor Green
    Write-Host "Task Name: $TaskName" -ForegroundColor Cyan
    Write-Host "Working Directory: $WorkingDirectory" -ForegroundColor Cyan
    Write-Host "Trigger: User logon" -ForegroundColor Cyan
    Write-Host "Window Mode: Hidden (no terminal visible)" -ForegroundColor Cyan
    Write-Host "" -ForegroundColor Green
    Write-Host "The server will automatically start when you log in to Windows." -ForegroundColor Green
    Write-Host "To start it now, run: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Yellow
    Write-Host "To remove the task, run: .\uninstall-service.ps1" -ForegroundColor Yellow
    exit 0
} catch {
    Write-Host "ERROR: Failed to create scheduled task!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
