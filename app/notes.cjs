'use strict';
// Turns RELEASE_NOTES.md into one HTML section per version, newest first.
// Only the little Markdown the notes use: headings, bullets, paragraphs,
// **bold** and `code`. Everything is escaped first; the website address
// becomes a button the app opens in the browser.
const SITE='https://il-mazu.github.io/De-PerPortal/';
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inline=s=>escape(s)
  .replace(/`([^`]+)`/g,'<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
  .replace(new RegExp(SITE.replace(/[.\/]/g,'\\$&'),'g'),`<button type="button" class="link" data-site>${SITE}</button>`);

function render(markdown) {
  return markdown.replace(/\r/g,'').split(/^---$/m).map(chunk=>{
    const lines=chunk.trim().split('\n');
    const version=(lines[0].match(/^# .*?(\d+\.\d+\.\d+)/) || [])[1];
    if(!version) return null;
    const html=[];let list=false;
    for(const line of lines.slice(1)) {
      if(line.startsWith('- ')) {if(!list){html.push('<ul>');list=true;}html.push(`<li>${inline(line.slice(2))}</li>`);continue;}
      if(list) {html.push('</ul>');list=false;}
      if(line.startsWith('## ')) html.push(`<h4>${inline(line.slice(3))}</h4>`);
      else if(line.trim()) html.push(`<p>${inline(line)}</p>`);
    }
    if(list) html.push('</ul>');
    return {version,html:html.join('')};
  }).filter(Boolean);
}

module.exports={render,SITE};
