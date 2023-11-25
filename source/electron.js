const { app, BrowserWindow, Menu } = require('electron');

Menu.setApplicationMenu(false);
const createWindow = function() {
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true
		}
	});
	mainWindow.loadFile('index.html');
}
app.on('ready', createWindow);
app.on('window-all-closed', function () {
	app.quit();
});
app.on('resize', function(e,x,y){
	mainWindow.setSize(x, y);
});
