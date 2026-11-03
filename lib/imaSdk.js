// Shared loader for the Google IMA HTML5 SDK. Used by the live player
// pre-roll and the floating article video ad, so the script is injected at
// most once per page and a failed load can be retried later.
export const IMA_SDK_URL = "https://imasdk.googleapis.com/js/sdkloader/ima3.js";

let imaSdkPromise = null;

export function loadImaSdk() {
  if (imaSdkPromise) return imaSdkPromise;

  imaSdkPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.google?.ima) {
      resolve();
      return;
    }
    const stale = document.querySelector(`script[src="${IMA_SDK_URL}"]`);
    if (stale) stale.remove();

    const timeout = setTimeout(() => {
      reject(new Error("IMA SDK load timed out"));
    }, 8000);

    const script = document.createElement("script");
    script.src = IMA_SDK_URL;
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      window.google?.ima
        ? resolve()
        : reject(new Error("IMA SDK loaded but google.ima not available"));
    };
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Failed to load IMA SDK"));
    };
    document.head.appendChild(script);
  });

  imaSdkPromise.catch(() => {
    imaSdkPromise = null;
  });
  return imaSdkPromise;
}
