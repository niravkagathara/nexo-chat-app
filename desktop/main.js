const { app, BrowserWindow, Menu, session, shell } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Nexo Chat",
    icon: path.join(__dirname, 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Enable WebRTC (camera/microphone) and notification permissions automatically for desktop app
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    const allowedPermissions = ['media', 'notifications', 'mediaKeySystem'];
    return allowedPermissions.includes(permission);
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const allowedPermissions = ['media', 'notifications', 'mediaKeySystem'];
    const allowed = allowedPermissions.includes(permission);
    callback(allowed);
  });

  // Load the web app URL. Defaults to local server, but can be overridden with env APP_URL.
  const appUrl = process.env.APP_URL || 'https://www.nexochat.in';
  mainWindow.loadURL(appUrl, {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  });

  // Setup application menu with keyboard shortcuts (Reload, Copy/Paste, DevTools)
  // We keep it registered so the shortcuts are active, but hide the menu bar on Windows/Linux
  const menuTemplate = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { role: 'toggleDevTools', accelerator: 'F12' },
        { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Hide the menu bar visually for a clean desktop app look
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setAutoHideMenuBar(true);

  // Intercept new window requests (e.g. target="_blank" links)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://localhost') || url.startsWith('https://www.nexochat.in') || url.startsWith('https://api.nexochat.in') || url.startsWith('https://www.figma.com')) {
      return { action: 'allow' };
    }
    // Open in system browser
    shell.openExternal(url).catch(err => console.error("Failed to open URL:", err));
    return { action: 'deny' };
  });

  // Prevent title updates from changing the app name to "localhost:3000" or raw URL title
  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault();
  });
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length) {
      const mainWin = windows[0];
      if (mainWin.isMinimized()) mainWin.restore();
      mainWin.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
