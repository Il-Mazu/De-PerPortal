'use strict';
const version=new URLSearchParams(location.search).get('version');
if(version)document.getElementById('version').textContent=`Version ${version}`;
window.splash.onStatus(({text,progress})=>{
  document.getElementById('status').textContent=text;
  const fill=document.getElementById('fill');
  fill.classList.toggle('progress',progress!==null);
  if(progress!==null)fill.style.strokeDashoffset=String(100-progress*100);
});
