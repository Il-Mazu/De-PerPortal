const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('overlay',{
  close:()=>ipcRenderer.invoke('overlay-close'),
  ready:()=>ipcRenderer.invoke('overlay-ready'),
  onState:callback=>ipcRenderer.on('overlay-state',(_,state)=>callback(state))
});
