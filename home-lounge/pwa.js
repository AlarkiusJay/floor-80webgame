// Registers the FL80R service worker (served at the site root, scope "/") so
// the /hub pages are installable and cached offline like the game.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
