(function () {
  const ATTR = "data-petrichor-reader";
  const MSG_TYPE = "petrichor-reader:resize";
  const script = document.currentScript;
  const readerOrigin = script && script.src
    ? new URL(script.src, location.href).origin
    : "http://127.0.0.1:3981";

  function chapterSrc(chapterId) {
    return `${readerOrigin}/read?chapterId=${encodeURIComponent(chapterId)}`;
  }

  function mount(el) {
    if (!el || el.nodeType !== 1) {
      return;
    }
    if (!el.hasAttribute(ATTR)) {
      return;
    }
    const chapterId = el.getAttribute("data-chapter-id") || "";
    if (!chapterId) {
      return;
    }
    let iframe = el.querySelector("iframe[data-pr-frame]");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.setAttribute("data-pr-frame", "1");
      iframe.setAttribute("title", "petrichor-reader");
      iframe.style.cssText =
        "width:100%;border:0;display:block;max-width:100%;overflow:hidden;height:240px;";
      el.appendChild(iframe);
    }
    if (iframe.getAttribute("data-chapter-id") !== chapterId) {
      iframe.setAttribute("data-chapter-id", chapterId);
      iframe.src = chapterSrc(chapterId);
    }
  }

  function scan(root) {
    if (!root) {
      return;
    }
    if (root.nodeType === 1 && root.hasAttribute && root.hasAttribute(ATTR)) {
      mount(root);
    }
    if (root.querySelectorAll) {
      root.querySelectorAll("[" + ATTR + "]").forEach(mount);
    }
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== readerOrigin) {
      return;
    }
    const data = event.data;
    if (!data || data.type !== MSG_TYPE) {
      return;
    }
    const height = Number(data.height);
    if (!Number.isFinite(height) || height < 1) {
      return;
    }
    document.querySelectorAll("iframe[data-pr-frame]").forEach(function (frame) {
      if (frame.contentWindow === event.source) {
        frame.style.height = Math.ceil(height) + "px";
      }
    });
  });

  function boot() {
    scan(document);
    const observer = new MutationObserver(function (records) {
      for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        if (rec.type === "attributes") {
          mount(rec.target);
          continue;
        }
        rec.addedNodes.forEach(scan);
        if (rec.removedNodes.length) {
          scan(rec.target);
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-chapter-id", "data-petrichor-reader"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.petrichorReaderScan = function () {
    scan(document);
  };
})();
