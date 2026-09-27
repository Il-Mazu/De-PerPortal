const {test}=require('node:test');
const assert=require('node:assert/strict');
const {newer,checksum}=require('../app/updater.cjs');

test('updates only to a strictly newer release with a matching checksum',()=>{
  assert.equal(newer('v1.1.0','1.0.0'),true);
  assert.equal(newer('v1.0.0','1.0.0'),false);
  assert.equal(newer('v0.9.9','1.0.0'),false);
  assert.equal(newer('v1.10.0','1.9.0'),true,'numeric, not alphabetical');
  assert.equal(newer('v2.0','1.9.9'),true);
  const sums=`${'a'.repeat(64)}  De-PerPortal-1.1.0-windows-x64.zip\r\n${'b'.repeat(64)}  other.zip\n`;
  assert.equal(checksum(sums,'De-PerPortal-1.1.0-windows-x64.zip'),'a'.repeat(64));
  assert.equal(checksum(sums,'missing.zip'),null);
  assert.equal(checksum('nothex  De-PerPortal-1.1.0-windows-x64.zip','De-PerPortal-1.1.0-windows-x64.zip'),null);
});
