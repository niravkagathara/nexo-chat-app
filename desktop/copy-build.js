const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, '..', 'frontend', 'public');

if (!fs.existsSync(distDir)) {
  console.error('Dist directory does not exist. Run electron-builder first.');
  process.exit(1);
}

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const files = fs.readdirSync(distDir);

// Find the installer EXE package (Nexo Chat Setup 1.0.0.exe)
const exeFile = files.find(f => f.endsWith('.exe') && f.includes('Setup') && !f.includes('blockmap'));

if (exeFile) {
  const srcExePath = path.join(distDir, exeFile);
  const destExePath = path.join(publicDir, 'nexo-chat-desktop.exe');
  
  // 1. Copy the raw EXE installer directly
  fs.copyFileSync(srcExePath, destExePath);
  console.log(`[Success] Copied installer EXE package: ${exeFile} -> ${destExePath}`);
  
  // 2. Compress the installer EXE into a ZIP archive
  // This bypasses browser download blocks while ensuring the user gets the installer!
  const destZipPath = path.join(publicDir, 'nexo-chat-desktop.zip');
  try {
    if (process.platform === 'win32') {
      console.log('Compressing installer EXE into ZIP archive using PowerShell...');
      execSync(`powershell -Command "Compress-Archive -Path '${srcExePath}' -DestinationPath '${destZipPath}' -Force"`);
    } else {
      console.log('Compressing installer EXE into ZIP archive using zip...');
      execSync(`zip -j "${destZipPath}" "${srcExePath}"`);
    }
    console.log(`[Success] Created ZIP archive containing the installer -> ${destZipPath}`);
  } catch (err) {
    console.error('[Error] Failed to compress installer EXE into ZIP:', err.message);
  }
} else {
  console.warn('[Warning] No Windows setup exe file found in desktop/dist/ directory.');
}
