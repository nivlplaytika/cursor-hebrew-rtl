const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const CSS = fs.readFileSync(path.join(__dirname, "rtl.css"), "utf8");
const START = "<!-- hebrew-rtl-start -->";
const END = "<!-- hebrew-rtl-end -->";
const BLOCK_RE = /<!-- hebrew-rtl-start -->[\s\S]*?<!-- hebrew-rtl-end -->\n*/;
const CHECKSUM_KEYS = {
  "vs/code/electron-sandbox/workbench/workbench.html":
    "out/vs/code/electron-sandbox/workbench/workbench.html",
  "vs/workbench/workbench.desktop.main.js": "out/vs/workbench/workbench.desktop.main.js",
};

function majority(param, fallback) {
  return (
    "let rtlCount=0,ltrCount=0,first,rtlRe=/[\\u0590-\\u08FF\\uFB1D-\\uFDFF\\uFE70-\\uFEFF]/," +
    "ltrRe=/\\p{L}/u;for(let ch of " + param + "){if(rtlRe.test(ch)){first!=null||(first=\"rtl\");" +
    "rtlCount++;continue}ltrRe.test(ch)&&(first!=null||(first=\"ltr\"),ltrCount++)}" +
    "return rtlCount>0?\"rtl\":ltrCount>0?\"ltr\":" + fallback
  );
}

function humanDir(partsName) {
  return (
    "(function(parts){let text=\"\";for(let part of parts)part&&part.kind===\"text\"" +
    "&&typeof part.text==\"string\"&&(text+=part.text);" +
    majority("text", "\"ltr\"") +
    "})(" + partsName + ")"
  );
}

const EXACT_PATCHES = [
  [
    'mode:t="streaming",dir:n,parseIncompleteMarkdown:i=!0',
    'mode:t="streaming",dir:n="auto",parseIncompleteMarkdown:i=!0',
  ],
  [
    'mode:e="streaming",dir:n,parseIncompleteMarkdown:i=!0',
    'mode:e="streaming",dir:n="auto",parseIncompleteMarkdown:i=!0',
  ],
  [
    'n==="auto"&&t==="static"&&(Ge=[...Ge,HVf])',
    "n===\"auto\"&&(Ge=[...Ge,HVf])",
  ],
  [
    'n==="auto"&&e==="static"&&(we=[...we,NyS])',
    "n===\"auto\"&&(we=[...we,NyS])",
  ],
  [
    'function Bb_(e){return qQu.test(e)?"rtl":zQu.test(e)?"ltr":null}',
    "function Bb_(e){" + majority("e", "null") + "}",
  ],
  [
    'function zZ0(t){return X2m.test(t)?"rtl":Q2m.test(t)?"ltr":null}',
    "function zZ0(t){" + majority("t", "null") + "}",
  ],
  [
    'return rtlCount>ltrCount?"rtl":ltrCount>rtlCount?"ltr":first??null',
    'return rtlCount>0?"rtl":ltrCount>0?"ltr":null',
  ],
  [
    'return rtlCount>ltrCount?"rtl":ltrCount>rtlCount?"ltr":first??"ltr"',
    'return rtlCount>0?"rtl":ltrCount>0?"ltr":"ltr"',
  ],
  [
    'return r>i?"rtl":i>r?"ltr":n??"ltr"',
    'return r>0?"rtl":"ltr"',
  ],
  ['.replace(/`[^`]*`/g,"")', ""],
  [
    't.type==="element"&&!xLs.has(t.tagName)?sWl(t):""',
    't.type==="element"?sWl(t):""',
  ],
  [
    'e.type==="element"&&!CRa.has(e.tagName)?Qnp(e):""',
    'e.type==="element"?Qnp(e):""',
  ],
];

const HUMAN_RE =
  /dir:"auto"(,style:\{margin:0,lineHeight:"inherit"\},children:[A-Za-z0-9_]+\("span",\{"data-lexical-text":"true",children:)([A-Za-z0-9_]+)\.map\(\(n,i\)=>n\.kind==="text"\?n\.text:/;

function countOf(text, needle) {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (true) {
    const at = text.indexOf(needle, from);
    if (at < 0) return count;
    count += 1;
    from = at + needle.length;
  }
}

function replaceOnce(text, oldText, newText, applied, label) {
  const count = countOf(text, oldText);
  if (count > 1) {
    throw new Error("patch matched " + count + " times: " + label);
  }
  if (count === 1) {
    applied.push(label);
    return text.replace(oldText, newText);
  }
  return text;
}

function isDirectionReady(text) {
  return (
    text.includes('dir:n="auto"') &&
    text.includes('rtlCount>0?"rtl"') &&
    !text.includes("rtlCount>ltrCount") &&
    !text.includes('return r>i?"rtl"') &&
    !text.includes('==="static"&&(Ge=[...Ge,HVf])') &&
    !text.includes('==="static"&&(we=[...we,NyS])') &&
    !text.includes("for(let ch of parts)")
  );
}

function patchBundle(original) {
  const applied = [];
  let text = original;
  try {
    for (const [oldText, newText] of EXACT_PATCHES) {
      text = replaceOnce(text, oldText, newText, applied, oldText.slice(0, 48));
    }
    text = text.replace(HUMAN_RE, (match, styleAndSpan, partsName) => {
      applied.push("human message");
      return (
        "dir:" +
        humanDir(partsName) +
        styleAndSpan +
        partsName +
        '.map((n,i)=>n.kind==="text"?n.text:'
      );
    });
    text = replaceOnce(
      text,
      "for(let ch of parts){if(rtlRe.test(ch)){",
      'let text="";for(let part of parts)part&&part.kind==="text"&&typeof part.text=="string"&&(text+=part.text);for(let ch of text){if(rtlRe.test(ch)){',
      applied,
      "repair human message"
    );
  } catch (error) {
    return { text: original, applied: [], supported: false, reason: error.message };
  }
  if (
    original.includes('n.kind==="text"?n.text:') &&
    !text.includes('n.kind==="text"?n.text:')
  ) {
    return {
      text: original,
      applied: [],
      supported: false,
      reason: "The message text would have been dropped.",
    };
  }
  if (!isDirectionReady(text)) {
    return {
      text: original,
      applied: [],
      supported: false,
      reason: "This Cursor version is not supported yet.",
    };
  }
  return { text, applied, supported: true, reason: "" };
}

function extractStyle(html) {
  const match = BLOCK_RE.exec(html);
  if (!match) return null;
  const style = /<style>([\s\S]*?)<\/style>/.exec(match[0]);
  return style ? style[1] : null;
}

function injectHtml(html, css) {
  const stripped = html.replace(BLOCK_RE, "");
  if (!stripped.includes("</html>")) {
    throw new Error("workbench.html has no </html>");
  }
  const block = START + "\n<style>" + css + "</style>\n" + END + "\n";
  return stripped.replace("</html>", block + "</html>");
}

function checksum(data) {
  return crypto.createHash("sha256").update(data).digest("base64").replace(/=+$/, "");
}

function patchHtml(html) {
  if (extractStyle(html) === CSS) {
    return { html, changed: false };
  }
  return { html: injectHtml(html, CSS), changed: true };
}

function applyToTree(root) {
  const productPath = path.join(root, "product.json");
  const htmlPath = path.join(root, CHECKSUM_KEYS["vs/code/electron-sandbox/workbench/workbench.html"]);
  const bundles = [
    path.join(root, "out/vs/workbench/workbench.desktop.main.js"),
    path.join(root, "out/vs/workbench/workbench.glass.main.js"),
  ].filter((file) => fs.existsSync(file));
  if (!fs.existsSync(htmlPath) || bundles.length === 0) {
    return { changed: false, supported: false, reason: "Cursor's chat files were not found." };
  }

  const originals = new Map();
  const pending = [];
  let supported = true;
  let reason = "";

  const htmlResult = patchHtml(fs.readFileSync(htmlPath, "utf8"));
  if (htmlResult.changed) pending.push([htmlPath, Buffer.from(htmlResult.html), "stylesheet"]);

  for (const bundle of bundles) {
    const original = fs.readFileSync(bundle, "utf8");
    const result = patchBundle(original);
    if (!result.supported) {
      supported = false;
      reason = result.reason;
      break;
    }
    if (result.text !== original) pending.push([bundle, Buffer.from(result.text), path.basename(bundle)]);
  }
  if (!supported) {
    return { changed: false, supported: false, reason };
  }

  for (const [file, data] of pending) originals.set(file, fs.readFileSync(file));
  for (const [file, data] of pending) fs.writeFileSync(file, data);

  if (fs.existsSync(productPath)) {
    let product = fs.readFileSync(productPath, "utf8");
    let productChanged = false;
    for (const [key, relative] of Object.entries(CHECKSUM_KEYS)) {
      const file = path.join(root, relative);
      if (!fs.existsSync(file) || !product.includes('"' + key + '"')) continue;
      const digest = checksum(fs.readFileSync(file));
      const pattern = new RegExp(
        '("' + key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '":\\s*")[^"]+(")'
      );
      if (!pattern.test(product)) continue;
      const next = product.replace(pattern, "$1" + digest + "$2");
      if (next !== product) {
        product = next;
        productChanged = true;
      }
    }
    if (productChanged) {
      try {
        fs.writeFileSync(productPath, product);
        pending.push([productPath, null, "checksum"]);
      } catch (error) {
        for (const [file, data] of originals) fs.writeFileSync(file, data);
        return { changed: false, supported: true, reason: error.message };
      }
    }
  }

  return {
    changed: pending.length > 0,
    supported: true,
    reason: "",
    applied: pending.map((item) => item[2]),
  };
}

module.exports = {
  CSS,
  EXACT_PATCHES,
  applyToTree,
  checksum,
  humanDir,
  injectHtml,
  isDirectionReady,
  patchBundle,
  patchHtml,
};
