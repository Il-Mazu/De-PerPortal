'use strict';
// Gamepad reader shared by the main window and the radial menu. Uses the
// W3C "standard" button layout, which Chromium applies to XInput pads and to
// DualShock/DualSense over USB or Bluetooth.
// ponytail: pads without a standard mapping may report other button indices.
const Pad=(()=>{
  const buttons={A:0,B:1,X:2,Y:3,L1:4,R1:5,VIEW:8,START:9,L3:10,R3:11,UP:12,DOWN:13,LEFT:14,RIGHT:15};
  const directions=['UP','DOWN','LEFT','RIGHT'];
  const family=id=>/054c|sony|dualsense|dualshock|playstation|wireless controller/i.test(id)?'ps':'xbox';
  const labels={
    ps:{A:'✕',B:'○',X:'□',Y:'△',L1:'L1',R1:'R1',VIEW:'Create'},
    xbox:{A:'A',B:'B',X:'X',Y:'Y',L1:'LB',R1:'RB',VIEW:'View'}
  };
  // Returns a function that reports new presses since the previous call.
  // With stickAsDpad, the left stick also moves like the d-pad, repeating
  // while held.
  function reader({stickAsDpad=false}={}) {
    const last=new Map();
    let lastFamily='xbox';
    return (pads,now)=>{
      const out={pressed:new Set(),combo:false,stick:null,idle:true,family:lastFamily};
      let strongest=.5;
      for(const pad of pads) {
        if(!pad)continue;
        const was=last.get(pad.index) || {down:{},repeat:{}},down={};
        for(const [name,i] of Object.entries(buttons)) down[name]=!!pad.buttons[i]?.pressed;
        const [lx=0,ly=0,rx=0,ry=0]=pad.axes;
        if(stickAsDpad) {
          if(ly<-.6)down.UP=true; if(ly>.6)down.DOWN=true;
          if(lx<-.6)down.LEFT=true; if(lx>.6)down.RIGHT=true;
        }
        for(const name in down) {
          if(!down[name])continue;
          if(!was.down[name]) {out.pressed.add(name);was.repeat[name]=now+400;lastFamily=family(pad.id);}
          else if(directions.includes(name) && now>=was.repeat[name]) {out.pressed.add(name);was.repeat[name]=now+140;}
        }
        if(Object.values(down).some(Boolean) || Math.hypot(lx,ly)>.3 || Math.hypot(rx,ry)>.3) out.idle=false;
        if(down.L3 && down.R3) {out.combo=true;lastFamily=family(pad.id);}
        for(const [x,y] of [[lx,ly],[rx,ry]]) if(Math.hypot(x,y)>strongest) {strongest=Math.hypot(x,y);out.stick=[x,y];}
        last.set(pad.index,{down,repeat:was.repeat});
      }
      out.family=lastFamily;
      return out;
    };
  }
  // Index of the ring item a stick points at; item 0 sits at 12 o'clock.
  function sector([x,y],count) {
    const angle=(Math.atan2(x,-y)+2*Math.PI)%(2*Math.PI);
    return Math.round(angle/(2*Math.PI/count))%count;
  }
  return {buttons,family,labels,reader,sector};
})();
if(typeof module!=='undefined')module.exports=Pad;
