// Electronメインプロセス
// ウィンドウ生成のみを担当する。ゲームロジックは一切持たない。
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const WINDOW_WIDTH = 1280;
const WINDOW_HEIGHT = 720;

function createWindow() {
  // メニューバー非表示
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    resizable: false,
    autoHideMenuBar: true,
    useContentSize: true,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
