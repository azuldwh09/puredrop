param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

Write-Host "=== PureDrop Android Setup ===" -ForegroundColor Cyan
Set-Location $ProjectRoot

Write-Host "`n[1/6] Building web assets..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n[2/6] Copying google-services.json..." -ForegroundColor Yellow
$src = Join-Path $ProjectRoot "android-patches\google-services.json"
$dst = Join-Path $ProjectRoot "android\app\google-services.json"
if (Test-Path $src) {
    Copy-Item $src $dst -Force
    Write-Host "  OK google-services.json copied" -ForegroundColor Green
} else {
    Write-Host "  MISSING: $src" -ForegroundColor Red
}

Write-Host "`n[3/6] Applying AndroidManifest.xml..." -ForegroundColor Yellow
$src2 = Join-Path $ProjectRoot "android-patches\AndroidManifest.xml"
$dst2 = Join-Path $ProjectRoot "android\app\src\main\AndroidManifest.xml"
if (Test-Path $src2) {
    Copy-Item $src2 $dst2 -Force
    Write-Host "  OK AndroidManifest.xml applied" -ForegroundColor Green
} else {
    Write-Host "  MISSING: $src2" -ForegroundColor Red
}

Write-Host "`n[4/6] Fixing ProGuard config..." -ForegroundColor Yellow
$gradle = Join-Path $ProjectRoot "android\app\build.gradle"
if (Test-Path $gradle) {
    $c = Get-Content $gradle -Raw
    $c = $c -replace 'proguard-android\.txt', 'proguard-android-optimize.txt'
    Set-Content $gradle $c -NoNewline
    Write-Host "  OK proguard-android-optimize.txt set" -ForegroundColor Green
}

Write-Host "`n[5/6] Deploying app icons..." -ForegroundColor Yellow
$iconSrc = Join-Path $ProjectRoot "android-resources"
$iconDst = Join-Path $ProjectRoot "android\app\src\main\res"
if (Test-Path $iconSrc) {
    $densities = "mipmap-mdpi","mipmap-hdpi","mipmap-xhdpi","mipmap-xxhdpi","mipmap-xxxhdpi"
    foreach ($d in $densities) {
        $s = Join-Path $iconSrc $d
        $t = Join-Path $iconDst $d
        if (Test-Path $s) {
            if (-not (Test-Path $t)) {
                New-Item -ItemType Directory -Path $t | Out-Null
            }
            Copy-Item "$s\*" $t -Force
            Write-Host "  OK $d" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  SKIP no android-resources folder found" -ForegroundColor Yellow
}

Write-Host "`n[6/6] Syncing Capacitor..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n=== Done! Open Android Studio and Build APK ===" -ForegroundColor Green
} else {
    Write-Host "`nCapacitor sync had errors - check above" -ForegroundColor Red
}
