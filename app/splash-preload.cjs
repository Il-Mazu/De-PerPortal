const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('splash',{onStatus:callback=>ipcRenderer.on('splash',(_,status)=>callback(status))});
