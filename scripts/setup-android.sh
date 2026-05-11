#!/bin/bash
# PureDrop — Android setup script
# Run this ONCE after cloning to initialize the Android project.
# Usage: bash scripts/setup-android.sh

set -e

echo "🔧 Building web assets..."
npm run build

echo "📱 Adding Android platform..."
npx cap add android || echo "Android already added, continuing..."

echo "🔄 Syncing Capacitor..."
npx cap sync android

echo "💉 Copying clean AndroidManifest.xml..."
cp android-patches/AndroidManifest.xml android/app/src/main/AndroidManifest.xml
echo "   ✅ AndroidManifest.xml replaced"

echo "🔧 Fixing build.gradle proguard setting..."
sed -i 's/proguard-android\.txt/proguard-android-optimize.txt/g' android/app/build.gradle
echo "   ✅ build.gradle updated"

echo "🎨 Copying app icons..."
DENSITIES=("mipmap-mdpi" "mipmap-hdpi" "mipmap-xhdpi" "mipmap-xxhdpi" "mipmap-xxxhdpi")
for density in "${DENSITIES[@]}"; do
  SRC="android-resources/$density"
  DEST="android/app/src/main/res/$density"
  if [ -d "$SRC" ]; then
    mkdir -p "$DEST"
    cp "$SRC/ic_launcher.png" "$DEST/ic_launcher.png"
    cp "$SRC/ic_launcher_round.png" "$DEST/ic_launcher_round.png"
    echo "   ✅ Copied $density icons"
  fi
done

echo ""
echo "✅ Android setup complete!"
echo "   Run: npx cap open android"
echo "   Then: Build → Clean Project → Build APK(s)"
