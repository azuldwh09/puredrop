# PureDrop — Android setup script (Windows PowerShell)
# Run this ONCE after cloning to initialize the Android project.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\setup-android.ps1

Write-Host "🔧 Building web assets..." -ForegroundColor Cyan
npm run build

Write-Host "📱 Adding Android platform..." -ForegroundColor Cyan
npx cap add android

Write-Host "🔄 Syncing Capacitor..." -ForegroundColor Cyan
npx cap sync android

Write-Host "💉 Copying clean AndroidManifest.xml..." -ForegroundColor Cyan
Copy-Item "android-patches\AndroidManifest.xml" "android\app\src\main\AndroidManifest.xml" -Force
Write-Host "   ✅ AndroidManifest.xml replaced"

Write-Host "🔧 Fixing build.gradle proguard setting..." -ForegroundColor Cyan
$gradlePath = "android\app\build.gradle"
(Get-Content $gradlePath) -replace "proguard-android\.txt", "proguard-android-optimize.txt" | Set-Content $gradlePath
Write-Host "   ✅ build.gradle updated"

Write-Host "🎨 Copying app icons..." -ForegroundColor Cyan
$densities = @("mipmap-mdpi", "mipmap-hdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi")
foreach ($density in $densities) {
    $src = "android-resources\$density"
    $dest = "android\app\src\main\res\$density"
    if (Test-Path $src) {
        New-Item -ItemType Directory -Force -Path $dest | Out-Null
        Copy-Item "$src\ic_launcher.png" "$dest\ic_launcher.png" -Force
        Copy-Item "$src\ic_launcher_round.png" "$dest\ic_launcher_round.png" -Force
        Write-Host "   ✅ Copied $density icons"
    }
}

Write-Host ""
Write-Host "✅ Android setup complete!" -ForegroundColor Green
Write-Host "   Run: npx cap open android"
Write-Host "   Then: Build → Clean Project → Build APK(s)"
