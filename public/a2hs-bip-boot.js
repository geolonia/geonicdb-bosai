/**
 * beforeinstallprompt を React バンドルより先に捕捉する（#55 / #60）。
 * postbuild（inject-a2hs-bip-boot.mjs）が out/*.html の head 先頭へ挿入する。
 * CSP は script-src 'self'（public 配信）。
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
    } catch (e) {
      // CustomEvent 非対応環境では stash のみ
    }
  });
})();
