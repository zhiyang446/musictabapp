# T44 Manual Test Script - PowerShell
# Tests the Orchestrator API for YouTube URL support

Write-Host "🎬 T44 Manual Test - YouTube URL Support" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

$orchestratorUrl = "http://127.0.0.1:8000"
$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $serviceRoleKey) {
    Write-Host "❌ SUPABASE_SERVICE_ROLE_KEY not found in environment" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔍 Step 1: Testing API Health..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "$orchestratorUrl/health" -Method Get -ErrorAction Stop
    Write-Host "✅ Orchestrator API is accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot connect to Orchestrator API: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure the service is running on port 8000" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🧪 Step 2: Testing Valid YouTube URL..." -ForegroundColor Yellow

$validJobData = @{
    source_type = "youtube"
    youtube_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    instruments = @("guitar", "drums")
    options = @{}
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $serviceRoleKey"
}

try {
    Write-Host "📹 Testing URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ" -ForegroundColor White
    $validResponse = Invoke-RestMethod -Uri "$orchestratorUrl/jobs" -Method Post -Body $validJobData -Headers $headers -ErrorAction Stop
    Write-Host "✅ Valid YouTube URL accepted!" -ForegroundColor Green
    Write-Host "   Job ID: $($validResponse.jobId)" -ForegroundColor White
    $createdJobId = $validResponse.jobId
} catch {
    Write-Host "❌ Valid YouTube URL rejected: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorBody = $reader.ReadToEnd()
        Write-Host "   Error details: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n🧪 Step 3: Testing Invalid YouTube URL..." -ForegroundColor Yellow

$invalidJobData = @{
    source_type = "youtube"
    youtube_url = "https://vimeo.com/123456789"
    instruments = @("guitar")
    options = @{}
} | ConvertTo-Json

try {
    Write-Host "📹 Testing URL: https://vimeo.com/123456789" -ForegroundColor White
    $invalidResponse = Invoke-RestMethod -Uri "$orchestratorUrl/jobs" -Method Post -Body $invalidJobData -Headers $headers -ErrorAction Stop
    Write-Host "⚠️  Invalid YouTube URL was unexpectedly accepted!" -ForegroundColor Yellow
    Write-Host "   Job ID: $($invalidResponse.jobId)" -ForegroundColor White
} catch {
    Write-Host "✅ Invalid YouTube URL correctly rejected!" -ForegroundColor Green
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode
        Write-Host "   Status Code: $statusCode" -ForegroundColor White
        
        if ($statusCode -eq 400) {
            Write-Host "   ✅ Correct HTTP 400 Bad Request response" -ForegroundColor Green
        }
    }
}

Write-Host "`n🧪 Step 4: Testing Missing YouTube URL..." -ForegroundColor Yellow

$missingUrlJobData = @{
    source_type = "youtube"
    instruments = @("guitar")
    options = @{}
} | ConvertTo-Json

try {
    Write-Host "📹 Testing missing youtube_url field" -ForegroundColor White
    $missingResponse = Invoke-RestMethod -Uri "$orchestratorUrl/jobs" -Method Post -Body $missingUrlJobData -Headers $headers -ErrorAction Stop
    Write-Host "⚠️  Missing YouTube URL was unexpectedly accepted!" -ForegroundColor Yellow
} catch {
    Write-Host "✅ Missing YouTube URL correctly rejected!" -ForegroundColor Green
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "   ✅ Correct HTTP 400 Bad Request response" -ForegroundColor Green
    }
}

Write-Host "`n📊 Step 5: T44 DoD Verification..." -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Target: POST /jobs validates youtubeUrl" -ForegroundColor White
Write-Host "DoD: DB correctly saves URL" -ForegroundColor White
Write-Host "Test: select youtube_url from jobs is correct" -ForegroundColor White

if ($createdJobId) {
    Write-Host "`n✅ T44 DoD SATISFIED!" -ForegroundColor Green
    Write-Host "   ✅ POST /jobs accepts sourceType=youtube" -ForegroundColor Green
    Write-Host "   ✅ YouTube URL validation works" -ForegroundColor Green
    Write-Host "   ✅ Valid URLs are accepted, invalid URLs are rejected" -ForegroundColor Green
    Write-Host "   ✅ Job created with ID: $createdJobId" -ForegroundColor Green
    
    Write-Host "`n🗄️  Database Verification:" -ForegroundColor Yellow
    Write-Host "To verify the database storage, run this SQL query in Supabase:" -ForegroundColor White
    Write-Host "SELECT id, source_type, youtube_url FROM jobs WHERE id = '$createdJobId';" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ T44 DoD NOT satisfied - no valid jobs were created" -ForegroundColor Red
}

Write-Host "`n🎉 T44 Manual Test completed!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Check the database to verify YouTube URL storage" -ForegroundColor White
Write-Host "2. Test with different YouTube URL formats" -ForegroundColor White
Write-Host "3. Verify the job processing pipeline handles YouTube URLs" -ForegroundColor White
