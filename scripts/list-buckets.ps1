Continue = 'Stop'
 = Join-Path -Path (Get-Location) -ChildPath '.env'
if (-not (Test-Path -LiteralPath )) { throw 'Missing .env file' }
 = Get-Content -LiteralPath 
function Get-Val([string]) { ( | Where-Object {  -like ( + '=*') } | Select-Object -First 1) -replace ('^' + [regex]::Escape() + '='),'') }
 = Get-Val 'SUPABASE_URL'
 = Get-Val 'SUPABASE_SERVICE_ROLE_KEY'
if ([string]::IsNullOrWhiteSpace() -or [string]::IsNullOrWhiteSpace()) { throw 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }
 = (.TrimEnd('/') + '/rest/v1/storage.buckets')
 = @{ apikey = ; Authorization = ('Bearer ' + ) }
 = Invoke-RestMethod -Method Get -Uri  -Headers 
 = @( | ForEach-Object { .name })
Write-Output ('Buckets: ' + ( -join ', '))
 = @('audio-input','audio-stems','outputs','previews')
 =  | Where-Object {  -notcontains  }
if (.Count -eq 0) { Write-Output 'All required buckets present' } else { Write-Output ('Missing buckets: ' + ( -join ', ')) }
