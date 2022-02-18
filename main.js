const { app, BrowserWindow } = require('electron')
const path = require('path')
const ViGEmClient = require('vigemclient');
const ioHook = require('iohook');
const { exec, execSync } = require('child_process')
fs = require('fs')

let client;
let controller;
let active = false
let keys = [] //array of keys currently being held
let leftTimeout //stores keys held
let result = keys.some(i => [37, 38, 39, 40].includes(i)); //check if arrow keys are being pressed or not.

let window;

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    show: false,
    width: 400,
    height: 250,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  window = mainWindow

  mainWindow.webContents.on('did-finish-load', function () {
    mainWindow.show();
    start()
  });
};

function start() {
  try {
    main()
  } catch (err) {
    onDriverNotFound()
  }
}

function print(a) {
  window.webContents.send('LOG_REQUEST', a);
}

function main() {
  client = new ViGEmClient()
  client.connect()
  controller = client.createX360Controller()
  controller.connect()

  ioHook.start()

  ioHook.on('keydown', function (event) {
    if (event.rawcode == 46) return onEnabled()
    if (event.rawcode == 35) return process.exit(0)
    if (!keys.includes(event.rawcode)) keys = [...keys, event.rawcode]
  })

  ioHook.on('keyup', function (event) {
    keys = keys.filter(e => e !== event.rawcode)
    if (!result) handleMoveLeftPad(0, 0) //reset pos if not pressing any keys
  })
  print("Ready")
}

function listen() {
  print(keys)
  if (keys.includes(37)) handleMoveLeftPad(-1, 0) //left
  if (keys.includes(38)) handleMoveLeftPad(0, 1) //up
  if (keys.includes(39)) handleMoveLeftPad(1, 0) //right
  if (keys.includes(40)) handleMoveLeftPad(0, -1) //down
  if (keys.includes(38) && keys.includes(39)) handleMoveLeftPad(1, 1) //up+right
  if (keys.includes(38) && keys.includes(37)) handleMoveLeftPad(-1, 1) //upleft
  if (keys.includes(40) && keys.includes(39)) handleMoveLeftPad(1, -1) //downright
  if (keys.includes(40) && keys.includes(37)) handleMoveLeftPad(-1, -1) //downleft

  leftTimeout = setTimeout(function () {
    listen();
  }, 100);
}

function handleMoveLeftPad(x, y) {
  controller.axis.leftX.setValue(x); // x-axis
  controller.axis.leftY.setValue(y); // y-axis
}

function onExit() {
  clearTimeout(leftTimeout)
  handleMoveLeftPad(0, 0)
}

function onEnabled() {
  active = !active
  if (!active) return onExit()
  return listen()
}

const getExtraFilesPath = () => {
  var x = path.join(process.resourcesPath, '..')
  var y = path.join(x, '/extraResources')
  return y;
};

function onDriverNotFound() {
  print("Driver is not installed.")
  print("Installing driver.")

  exec(`cd ${getExtraFilesPath()} && msiexec /i ViGEmBusSetup_x64.msi /q /qn /norestart`, (error, stdout, stderr) => {
    if (error) print(error)
    if (stdout) print(stdout)
    if (stderr) print(stderr)
  }).on('exit', code => {
    print('final exit code is', code)
    main()
  })
}

function isAdmin() {
  try {
    execSync('NET SESSION').toString()
    createWindow()
  } catch {
    throw new Error('This application requires Administrator priviledges.');
  }
}

app.on('ready', () => {
  isAdmin()
})