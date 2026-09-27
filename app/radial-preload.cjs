const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('radial',{
  hold:seconds=>ipcRenderer.invoke('radial-hold',seconds),
  pick:data=>ipcRenderer.invoke('radial-pick',data),
  close:()=>ipcRenderer.invoke('radial-close'),
  onState:callback=>ipcRenderer.on('radial-state',(_,state)=>callback(state))
});
