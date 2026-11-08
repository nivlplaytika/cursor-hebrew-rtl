const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { applyToTree, isDirectionReady, patchBundle, patchHtml } = require("../src/patch");

const DESKTOP = [
  'mode:t="streaming",dir:n,parseIncompleteMarkdown:i=!0',
  'n==="auto"&&t==="static"&&(Ge=[...Ge,HVf])',
  'function Bb_(e){return qQu.test(e)?"rtl":zQu.test(e)?"ltr":null}',
  'return r>i?"rtl":i>r?"ltr":n??"ltr"',
  '.replace(/`[^`]*`/g,"")',
  't.type==="element"&&!xLs.has(t.tagName)?sWl(t):""',
  'k_("p",{dir:"auto",style:{margin:0,lineHeight:"inherit"},children:k_("span",{"data-lexical-text":"true",children:e.map((n,i)=>n.kind==="text"?n.text:chip',
].join("\n");

test("a fresh desktop bundle becomes right-to-left for any Hebrew word", () => {
  const result = patchBundle(DESKTOP);
  assert.equal(result.supported, true);
  assert.equal(result.text.includes('rtlCount>0?"rtl"'), true);
  assert.equal(result.text.includes("rtlCount>ltrCount"), false);
  assert.equal(result.text.includes('return r>0?"rtl":"ltr"'), true);
  assert.equal(result.text.includes('.replace(/`[^`]*`/g,"")'), false);
  assert.equal(result.text.includes('n.kind==="text"?n.text:'), true);
  assert.equal(result.text.includes("for(let ch of parts)"), false);
  assert.equal(isDirectionReady(result.text), true);
});

test("patching twice changes nothing", () => {
  const once = patchBundle(DESKTOP);
  const twice = patchBundle(once.text);
  assert.equal(twice.text, once.text);
  assert.deepEqual(twice.applied, []);
});

test("an unknown build is left untouched", () => {
  const result = patchBundle("function notCursor(){return 1}");
  assert.equal(result.supported, false);
  assert.equal(result.text, "function notCursor(){return 1}");
});

test("stylesheet injection is idempotent", () => {
  const first = patchHtml("<html><body></body>\n</html>");
  assert.equal(first.changed, true);
  assert.equal(first.html.includes(".markdown-root li"), true);
  const second = patchHtml(first.html);
  assert.equal(second.changed, false);
  assert.equal(second.html, first.html);
});

test("apply writes a fake install and a second run is a no-op", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hebrew-rtl-"));
  const htmlPath = path.join(root, "out/vs/code/electron-sandbox/workbench/workbench.html");
  const jsPath = path.join(root, "out/vs/workbench/workbench.desktop.main.js");
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.mkdirSync(path.dirname(jsPath), { recursive: true });
  fs.writeFileSync(htmlPath, "<html><body></body>\n</html>");
  fs.writeFileSync(jsPath, DESKTOP);
  fs.writeFileSync(
    path.join(root, "product.json"),
    JSON.stringify({
      checksums: {
        "vs/code/electron-sandbox/workbench/workbench.html": "old",
        "vs/workbench/workbench.desktop.main.js": "old",
      },
    })
  );
  const first = applyToTree(root);
  assert.equal(first.supported, true);
  assert.equal(first.changed, true);
  const product = JSON.parse(fs.readFileSync(path.join(root, "product.json"), "utf8"));
  assert.notEqual(product.checksums["vs/workbench/workbench.desktop.main.js"], "old");
  const second = applyToTree(root);
  assert.equal(second.changed, false);
  assert.equal(second.supported, true);
});

test("the installed Cursor build is left intact when its script is unknown", () => {
  const file = "/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js";
  if (!fs.existsSync(file)) return;
  const original = fs.readFileSync(file, "utf8");
  const result = patchBundle(original);
  if (!result.supported) assert.equal(result.text, original);
  else assert.equal(isDirectionReady(result.text), true);
});

test("a renamed Cursor build still gets the page script", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "hebrew-rtl-"));
  const htmlPath = path.join(root, "out/vs/code/electron-sandbox/workbench/workbench.html");
  const jsPath = path.join(root, "out/vs/workbench/workbench.desktop.main.js");
  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.mkdirSync(path.dirname(jsPath), { recursive: true });
  fs.writeFileSync(htmlPath, "<html><body></body>\n</html>");
  fs.writeFileSync(jsPath, "function notCursor(){return 1}");
  fs.writeFileSync(
    path.join(root, "product.json"),
    JSON.stringify({
      checksums: {
        "vs/code/electron-sandbox/workbench/workbench.html": "old",
        "vs/workbench/workbench.desktop.main.js": "old",
      },
    })
  );
  const first = applyToTree(root);
  assert.equal(first.supported, true);
  assert.equal(first.changed, true);
  const html = fs.readFileSync(htmlPath, "utf8");
  assert.equal(html.includes("hebrew-rtl-start"), true);
  assert.equal(html.includes("\\u0590"), true);
  assert.equal(fs.readFileSync(jsPath, "utf8"), "function notCursor(){return 1}");
  const product = JSON.parse(fs.readFileSync(path.join(root, "product.json"), "utf8"));
  assert.notEqual(product.checksums["vs/code/electron-sandbox/workbench/workbench.html"], "old");
  assert.equal(applyToTree(root).changed, false);
});
