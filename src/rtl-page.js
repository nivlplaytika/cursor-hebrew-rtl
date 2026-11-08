(function () {
  if (window.__hebrewRtl) return;
  window.__hebrewRtl = true;
  var HEBREW = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
  var LETTER = /\p{L}/u;
  var ROOT = ".markdown-root, .ui-markdown, .ui-thinking-collapsible, [data-message-kind], .aislash-editor-input, .aislash-editor-input-readonly, .composer-rendered-message";
  var BLOCK = { P: 1, LI: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1, TD: 1, TH: 1, BLOCKQUOTE: 1, DIV: 1 };
  var NESTED = { P: 1, DIV: 1, UL: 1, OL: 1, LI: 1, TABLE: 1, PRE: 1, BLOCKQUOTE: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, H6: 1 };

  function direction(text) {
    if (HEBREW.test(text)) return "rtl";
    if (LETTER.test(text)) return "ltr";
    return "";
  }

  function textOf(el) {
    var text = "";
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        while (parent && parent !== el) {
          if (parent.tagName === "PRE" || parent.tagName === "SCRIPT" || parent.tagName === "STYLE") {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentElement;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) text += walker.currentNode.nodeValue;
    return text;
  }

  function isTextBlock(el) {
    if (el.tagName !== "DIV") return true;
    for (var child = el.firstElementChild; child; child = child.nextElementSibling) {
      if (NESTED[child.tagName]) return false;
    }
    return true;
  }

  function apply(el) {
    if (!el || el.nodeType !== 1) return;
    var tag = el.tagName;
    if (tag === "PRE" || tag === "CODE" || tag === "KBD" || tag === "SAMP" || tag === "VAR") {
      if (el.getAttribute("dir") !== "ltr") el.setAttribute("dir", "ltr");
      return;
    }
    if (!BLOCK[tag] || !isTextBlock(el)) return;
    var next = direction(textOf(el));
    if (next && el.getAttribute("dir") !== next) el.setAttribute("dir", next);
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    apply(root);
    var nodes = root.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, div, pre, code, kbd, samp, var");
    for (var i = 0; i < nodes.length; i++) apply(nodes[i]);
  }

  function rootsFrom(node) {
    var el = node && node.nodeType === 1 ? node : node && node.parentElement;
    var found = [];
    if (!el || !el.closest) return found;
    var closest = el.closest(ROOT);
    if (closest) found.push(closest);
    if (el.querySelectorAll) {
      var nested = el.querySelectorAll(ROOT);
      for (var i = 0; i < nested.length; i++) found.push(nested[i]);
    }
    return found;
  }

  var queued = false;
  var pending = [];
  function schedule(node) {
    pending.push(node);
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      var batch = pending;
      pending = [];
      for (var i = 0; i < batch.length; i++) {
        var roots = rootsFrom(batch[i]);
        for (var j = 0; j < roots.length; j++) scan(roots[j]);
      }
    });
  }

  function start() {
    var roots = document.querySelectorAll(ROOT);
    for (var i = 0; i < roots.length; i++) scan(roots[i]);
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) schedule(records[i].target);
    }).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["dir"]
    });
  }

  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
