# PureDrop - Android setup script (Windows PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\setup-android.ps1

Write-Host "Building web assets..."
npm run build

Write-Host "Adding Android platform..."
npx cap add android

Write-Host "Syncing Capacitor..."
npx cap sync android

Write-Host "Copying clean AndroidManifest.xml..."
Copy-Item "android-patches\AndroidManifest.xml" "android\app\src\main\AndroidManifest.xml" -Force
Write-Host "AndroidManifest.xml replaced"

Write-Host "Fixing build.gradle proguard setting..."
$gradlePath = "android\app\build.gradle"
$content = Get-Content $gradlePath
$content = $content -replace "proguard-android.txt", "proguard-android-optimize.txt"
Set-Content $gradlePath $content
Write-Host "build.gradle updated"

Write-Host "Copying app icons..."
$densities = @("mipmap-mdpi", "mipmap-hdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi")
foreach ($density in $densities) {
    $src = "android-resources\$density"
    $dest = "android\app\src\main\res\$density"
    if (Test-Path $src) {
        New-Item -ItemType Directory -Force -Path $dest | Out-Null
        Copy-Item "$src\ic_launcher.png" "$dest\ic_launcher.png" -Force
        Copy-Item "$src\ic_launcher_round.png" "$dest\ic_launcher_round.png" -Force
        Write-Host "Copied $density icons"
    }
}

Write-Host "Android setup complete!"
Write-Host "Run: npx cap open android"
Write-Host "Then: Build > Clean Project > Build APK(s)"
