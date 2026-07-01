param(
    [string]$Email = "niravkagathara4@gmail.com",
    [string]$Password = "admin123"
)

$API = "http://localhost:3000"
Write-Host ""
Write-Host "Logging in as: $Email"

$loginBody = '{"email":"' + $Email + '","password":"' + $Password + '"}'

try {
    $loginResp = Invoke-RestMethod -Uri "$API/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
    $token = $loginResp.token
    $userName = $loginResp.user.name
    $userRole = $loginResp.user.role

    Write-Host "Logged in as: $userName (role: $userRole)"

    if ($userRole -ne "superadmin") {
        Write-Host "ERROR: Need superadmin role. Got: $userRole"
        exit 1
    }

    Write-Host "Triggering Google Drive backup..."

    $headers = @{ Authorization = "Bearer $token" }
    try {
        $backupResp = Invoke-RestMethod -Uri "$API/admin/backup/trigger" -Method POST -Headers $headers -ContentType "application/json" -Body "{}"
        Write-Host ""
        Write-Host "SUCCESS! Backup Response:"
        Write-Host "  success      : $($backupResp.success)"
        Write-Host "  jsonUploaded : $($backupResp.jsonUploaded)"
        Write-Host "  dbUploaded   : $($backupResp.dbUploaded)"
        Write-Host "  codeUploaded : $($backupResp.codeUploaded)"
        Write-Host "  message      : $($backupResp.message)"
        Write-Host ""
        Write-Host "Google Drive folder: https://drive.google.com/drive/folders/1_nyvh6i0kV9BC7JQu2_14j8gcO1n9VSM"
    } catch {
        $raw = $_.ErrorDetails.Message
        Write-Host "Backup endpoint response: $raw"
        if ($raw -like "*credentials not found*") {
            Write-Host ""
            Write-Host "No Google Service Account found."
            Write-Host "Place your key file at: d:\projects\backend\google-service-account.json"
        }
    }

} catch {
    $raw = $_.ErrorDetails.Message
    Write-Host "Login failed: $raw"
    Write-Host "Run with correct password: .\test_backup.ps1 -Email 'email' -Password 'pass'"
}
