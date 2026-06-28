const fs = require('fs');
const path = require('path');

const srcApkPath = path.join(__dirname, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
const destApkPath = path.join(__dirname, '..', 'frontend', 'public', 'nexo-chat-mobile.apk');

// Ensure destination public directory exists
const publicDir = path.dirname(destApkPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

if (fs.existsSync(srcApkPath)) {
  fs.copyFileSync(srcApkPath, destApkPath);
  console.log(`[Success] Copied Android APK package: ${srcApkPath} -> ${destApkPath}`);
} else {
  console.error(`[Error] Built APK not found at: ${srcApkPath}`);
  console.info('Please build the project first in Android Studio (Build > Build Bundle(s) / APK(s) > Build APK(s))');
}
