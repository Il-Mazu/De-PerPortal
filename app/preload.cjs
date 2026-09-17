const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('dePerPortal',{
  state:()=>ipcRenderer.invoke('state'),
  overlay:()=>ipcRenderer.invoke('overlay-show'),
  action:data=>ipcRenderer.invoke('action',data),
  select:data=>ipcRenderer.invoke('select',data),
  game:value=>ipcRenderer.invoke('game',value),
  rescan:()=>ipcRenderer.invoke('rescan'),
  launch:()=>ipcRenderer.invoke('launch'),
  artwork:()=>ipcRenderer.invoke('artwork'),
  artFolder:()=>ipcRenderer.invoke('art-folder'),
  enable:()=>ipcRenderer.invoke('enable'),
  onState:callback=>ipcRenderer.on('state',(_,state)=>callback(state))
});
