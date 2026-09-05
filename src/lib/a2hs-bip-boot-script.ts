/**
 * BIP 早期捕捉スクリプト本文（#55 / #60）。
 * layout のインライン <script> に埋め込み、postbuild の
 * externalize-inline-scripts が `out/_next/csp-inline/<hash>.js` へ書き出す。
 * CSP は `script-src 'self'` のまま（unsafe-inline 不要）。
 */
export const A2HS_BIP_BOOT_SCRIPT = `(function () {
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
})();`;
