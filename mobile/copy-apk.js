const fs = require('fs');
const path = require('path');

const srcApkPath = path.join(__dirname, 'build', 'app', 'outputs', 'flutter-apk', 'app-release.apk');
const fallbackApkPath = path.join(__dirname, 'build', 'app', 'outputs', 'flutter-apk', 'app-debug.apk');
const destApkPath = path.join(__dirname, '..', 'frontend', 'public', 'nexo-chat-mobile.apk');

// Ensure destination public directory exists
const publicDir = path.dirname(destApkPath);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

let activeSrcPath = srcApkPath;
if (!fs.existsSync(activeSrcPath)) {
  activeSrcPath = fallbackApkPath;
}

if (fs.existsSync(activeSrcPath)) {
  fs.copyFileSync(activeSrcPath, destApkPath);
  console.log(`[Success] Copied Android APK package: ${activeSrcPath} -> ${destApkPath}`);
} else {
  console.error(`[Error] Built APK not found at: ${srcApkPath} or ${fallbackApkPath}`);
  console.info('Please build the project first using "flutter build apk --release"');
}

