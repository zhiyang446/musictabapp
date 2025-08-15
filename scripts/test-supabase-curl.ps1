# Supabase HTTP Connection Test (PowerShell)
# Tests basic HTTP connectivity to Supabase URL

param(
    [string]$EnvFile = ".env"
)

function Get-EnvVariable {
    param([string]$Name, [string]$FilePath)

    if (-not (Test-Path $FilePath)) {
        Write-Host "ERROR: .env file not found: $FilePath"
        return $null
    }

    $content = Get-Content $FilePath
    foreach ($line in $content) {
        $line = $line.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
            $parts = $line.Split('=', 2)
            if ($parts[0].Trim() -eq $Name) {
                return $parts[1].Trim()
            }
        }
    }
    return $null
}

Write-Host "Testing Supabase HTTP connection..."
Write-Host ""

# Load SUPABASE_URL from .env
$supabaseUrl = Get-EnvVariable -Name "SUPABASE_URL" -FilePath $EnvFile

if (-not $supabaseUrl) {
    Write-Host "ERROR: SUPABASE_URL not found in $EnvFile"
    exit 1
}

if ($supabaseUrl.Contains("your-project-id")) {
    Write-Host "WARNING: SUPABASE_URL contains placeholder value"
    Write-Host "Please update .env with your actual Supabase project URL"
    Write-Host "Visit: https://app.supabase.com/project/YOUR_PROJECT/settings/api"
    exit 1
}

Write-Host "Configuration:"
Write-Host "   SUPABASE_URL: $supabaseUrl"
Write-Host ""

Write-Host "Testing HTTP connection..."

try {
    # Test HTTP connection using Invoke-WebRequest
    $response = Invoke-WebRequest -Uri $supabaseUrl -Method GET -TimeoutSec 10 -ErrorAction Stop

    Write-Host "SUCCESS: HTTP connection successful!"
    Write-Host "   Status Code: $($response.StatusCode)"
    Write-Host "   Status Description: $($response.StatusDescription)"

    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 301 -or $response.StatusCode -eq 302) {
        Write-Host "SUCCESS: Status code is acceptable (200/301/302)"
    } else {
        Write-Host "WARNING: Unexpected status code. Expected 200, 301, or 302"
    }

    Write-Host ""
    Write-Host "SUCCESS: Supabase HTTP test passed!"
    Write-Host "   Your Supabase URL is accessible"

    exit 0

} catch {
    Write-Host "ERROR: HTTP connection failed!"
    Write-Host "   Error: $($_.Exception.Message)"

    if ($_.Exception.Message -like "*timeout*") {
        Write-Host "INFO: This might be a network timeout. Check your internet connection."
    } elseif ($_.Exception.Message -like "*not found*" -or $_.Exception.Message -like "*404*") {
        Write-Host "INFO: The URL might be incorrect. Please verify your SUPABASE_URL."
    } elseif ($_.Exception.Message -like "*unauthorized*" -or $_.Exception.Message -like "*403*") {
        Write-Host "INFO: This is normal - the endpoint exists but requires authentication."
        Write-Host "SUCCESS: The URL is valid and accessible!"
        exit 0
    }

    exit 1
}
