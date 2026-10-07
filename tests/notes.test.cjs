const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {render,SITE}=require('../app/notes.cjs');

test('release notes become escaped HTML sections, newest first',()=>{
  const sections=render(`# Dè PerPortal 2.1.0\r\n\r\n- **New:** see ${SITE} and \`<b>\`\r\n\r\n## Validation\r\n\r\nChecked <script>.\r\n\r\n---\r\n\r\n# Dè PerPortal 2.0.0\n\n- Old.\n`);
  assert.deepEqual(sections.map(s=>s.version),['2.1.0','2.0.0']);
  assert.equal(sections[0].html,`<ul><li><strong>New:</strong> see <button type="button" class="link" data-site>${SITE}</button> and <code>&lt;b&gt;</code></li></ul><h4>Validation</h4><p>Checked &lt;script&gt;.</p>`);
  assert.equal(sections[1].html,'<ul><li>Old.</li></ul>');
});

test('the shipped notes start with the version in package.json',()=>{
  const root=path.join(__dirname,'..');
  const [first]=render(fs.readFileSync(path.join(root,'RELEASE_NOTES.md'),'utf8'));
  assert.equal(first.version,require('../package.json').version);
});
