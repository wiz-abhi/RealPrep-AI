const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Platform detection
    platform: process.platform,
    isElectron: true,

    // Add any IPC methods you need here
    // Example:
    // send: (channel, data) => ipcRenderer.send(channel, data),
    // receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
});
