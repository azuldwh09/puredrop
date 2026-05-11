#!/bin/bash
# PureDrop — Android setup script
# Run this ONCE after cloning to initialize the Android project.
# Usage: bash scripts/setup-android.sh

set -e

echo "🔧 Building web assets..."
npm run build

echo "📱 Adding Android platform..."
npx cap add android

echo "🔄 Syncing Capacitor..."
npx cap sync android

MANIFEST="android/app/src/main/AndroidManifest.xml"

echo "💉 Injecting AdMob App ID into AndroidManifest.xml..."

if grep -q "com.google.android.gms.ads.APPLICATION_ID" "$MANIFEST"; then
  echo "   ✅ AdMob meta-data already present — skipping."
else
  python3 - <<'PYEOF'
import sys

manifest_path = "android/app/src/main/AndroidManifest.xml"

with open(manifest_path, "r") as f:
    content = f.read()

admob_block = """\n    <!-- AdMob App ID — required by Google Mobile Ads SDK -->\n    <meta-data\n        android:name="com.google.android.gms.ads.APPLICATION_ID"\n        android:value="ca-app-pub-2912984715921362~2822387889"/>\n\n"""

content = content.replace("<application", admob_block + "    <application", 1)

with open(manifest_path, "w") as f:
    f.write(content)

print("   ✅ AdMob App ID injected into AndroidManifest.xml")
PYEOF
fi

echo ""
echo "✅ Android setup complete!"
echo "   Run: npx cap open android"
echo "   Then build and run in Android Studio."
