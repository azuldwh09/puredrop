param([string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot))

Write-Host '=== PureDrop Android Setup ===' -ForegroundColor Cyan
Set-Location $ProjectRoot

Write-Host '`n[1/9] Installing dependencies...' -ForegroundColor Yellow
npm install --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { Write-Host 'npm install failed!' -ForegroundColor Red; exit 1 }

Write-Host '`n[2/9] Building web assets...' -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host 'Build failed!' -ForegroundColor Red; exit 1 }

Write-Host '`n[3/9] Syncing Capacitor (generates android/ if needed)...' -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) { Write-Host 'cap sync failed!' -ForegroundColor Red; exit 1 }

Write-Host '`n[4/9] Copying google-services.json...' -ForegroundColor Yellow
$src = Join-Path $ProjectRoot 'android-patches\google-services.json'
$dst = Join-Path $ProjectRoot 'android\app\google-services.json'
if (Test-Path $src) {
    Copy-Item $src $dst -Force
    Write-Host '  OK google-services.json' -ForegroundColor Green
} else {
    Write-Host "  MISSING: $src" -ForegroundColor Red
}

Write-Host '`n[5/9] Copying variables.gradle (enables rgcfaIncludeGoogle)...' -ForegroundColor Yellow
$src3 = Join-Path $ProjectRoot 'android-patches\variables.gradle'
$dst3 = Join-Path $ProjectRoot 'android\variables.gradle'
if (Test-Path $src3) {
    Copy-Item $src3 $dst3 -Force
    Write-Host '  OK variables.gradle (rgcfaIncludeGoogle=true)' -ForegroundColor Green
} else {
    Write-Host "  MISSING: $src3 -- Google Sign-In will NOT work without this!" -ForegroundColor Red
}

Write-Host '`n[6/9] Applying AndroidManifest.xml...' -ForegroundColor Yellow
$src2 = Join-Path $ProjectRoot 'android-patches\AndroidManifest.xml'
$dst2 = Join-Path $ProjectRoot 'android\app\src\main\AndroidManifest.xml'
if (Test-Path $src2) {
    Copy-Item $src2 $dst2 -Force
    Write-Host '  OK AndroidManifest.xml' -ForegroundColor Green
} else {
    Write-Host "  MISSING: $src2" -ForegroundColor Red
}

Write-Host '`n[7/9] Fixing ProGuard to use R8-compatible config...' -ForegroundColor Yellow
$gradle = Join-Path $ProjectRoot 'android\app\build.gradle'
if (Test-Path $gradle) {
    $c = Get-Content $gradle -Raw
    $c = $c -replace 'proguard-android\.txt', 'proguard-android-optimize.txt'
    Set-Content $gradle $c -NoNewline
    Write-Host '  OK proguard-android-optimize.txt' -ForegroundColor Green
}

Write-Host '`n[8/9] Deploying app icons...' -ForegroundColor Yellow
$iconSrc = Join-Path $ProjectRoot 'android-resources'
$iconDst = Join-Path $ProjectRoot 'android\app\src\main\res'
if (Test-Path $iconSrc) {
    $densities = 'mipmap-mdpi','mipmap-hdpi','mipmap-xhdpi','mipmap-xxhdpi','mipmap-xxxhdpi'
    foreach ($d in $densities) {
        $s = Join-Path $iconSrc $d
        $t = Join-Path $iconDst $d
        if (Test-Path $s) {
            if (-not (Test-Path $t)) { New-Item -ItemType Directory -Path $t | Out-Null }
            Copy-Item "$s\*" $t -Force
            Write-Host "  OK $d" -ForegroundColor Green
        }
    }
} else {
    Write-Host '  SKIP no android-resources folder' -ForegroundColor Yellow
}


Write-Host "`n[9/9] Installing custom MainActivity.java (audio routing fix)..." -ForegroundColor Yellow
# Read appId from capacitor.config.json -- this is the Java package name.
$cfgPath = Join-Path $ProjectRoot 'capacitor.config.json'
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$pkg = $cfg.appId
if (-not $pkg) {
    Write-Host '  ERROR: appId missing from capacitor.config.json' -ForegroundColor Red
} else {
    $template = Join-Path $ProjectRoot 'android-patches/MainActivity.java.template'
    if (-not (Test-Path $template)) {
        Write-Host ("  MISSING template: " + $template) -ForegroundColor Red
    } else {
        # Build path piece by piece using Join-Path so we never touch backslash regex.
        $maDir = Join-Path $ProjectRoot 'android'
        $maDir = Join-Path $maDir 'app'
        $maDir = Join-Path $maDir 'src'
        $maDir = Join-Path $maDir 'main'
        $maDir = Join-Path $maDir 'java'
        foreach ($segment in $pkg.Split('.')) {
            $maDir = Join-Path $maDir $segment
        }
        if (-not (Test-Path $maDir)) {
            New-Item -ItemType Directory -Path $maDir -Force | Out-Null
        }
        $maDst = Join-Path $maDir 'MainActivity.java'
        $content = Get-Content $template -Raw
        $content = $content.Replace('__PACKAGE__', $pkg)
        Set-Content -Path $maDst -Value $content -NoNewline
        Write-Host ("  OK MainActivity.java -> " + $pkg) -ForegroundColor Green
        Write-Host ("     written to: " + $maDst) -ForegroundColor DarkGray
    }
}

Write-Host '`n=== Setup complete! Open Android Studio, then: Build > Clean Project > Run ===' -ForegroundColor Green
Write-Host 'IMPORTANT: Always do Build > Clean Project before running after setup.' -ForegroundColor Yellow
