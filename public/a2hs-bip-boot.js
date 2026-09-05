/**
 * beforeinstallprompt を React バンドルより先に捕捉する（#55 / #60）。
 * layout から beforeInteractive で読み込む。CSP は script-src 'self'。
 */
(function () {
  if (typeof window === "undefined") return;
  var w = window;
  if (w.__bosaiA2hsBipBootstrapped) return;
  w.__bosaiA2hsBipBootstrapped = true;
  w.__bosaiA2hsBip = null;
  w.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    w.__bosaiA2hsBip = event;
    try {
      w.dispatchEvent(new CustomEvent("bosai:beforeinstallprompt"));
    } catch {
      // CustomEvent 非対応環境では stash のみ（ブリッジが window を読む）
    }
  });
})();
