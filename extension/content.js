// Content script for bkMark Web App (bk-mark.vercel.app)

// Helper: Read Firebase Session from IndexedDB
function getIndexedDBSession() {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("firebaseLocalStorageDb");
      request.onerror = () => resolve(null);
      request.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
          return resolve(null);
        }
        const tx = db.transaction("firebaseLocalStorage", "readonly");
        const store = tx.objectStore("firebaseLocalStorage");
        const getAllReq = store.getAll();
        getAllReq.onsuccess = () => {
          const list = getAllReq.result || [];
          for (const item of list) {
            const val = item?.value;
            if (val?.uid && val?.stsTokenManager) {
              return resolve({
                userId: val.uid,
                email: val.email,
                idToken: val.stsTokenManager.accessToken,
                refreshToken: val.stsTokenManager.refreshToken,
                expiresAt: val.stsTokenManager.expirationTime,
              });
            }
          }
          resolve(null);
        };
        getAllReq.onerror = () => resolve(null);
      };
    } catch (err) {
      resolve(null);
    }
  });
}

// Show a floating confirmation banner on the web app page
function showExtensionBanner(msg, isSuccess = true) {
  const existing = document.getElementById("bkmark-ext-bridge-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "bkmark-ext-bridge-banner";
  banner.style.position = "fixed";
  banner.style.top = "18px";
  banner.style.left = "50%";
  banner.style.transform = "translateX(-50%)";
  banner.style.zIndex = "999999";
  banner.style.padding = "10px 18px";
  banner.style.borderRadius = "12px";
  banner.style.fontSize = "13px";
  banner.style.fontWeight = "600";
  banner.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  banner.style.boxShadow = "0 6px 20px rgba(0,0,0,0.25)";
  banner.style.display = "flex";
  banner.style.alignItems = "center";
  banner.style.gap = "8px";
  banner.style.transition = "all 0.3s ease";

  if (isSuccess) {
    banner.style.backgroundColor = "#1e8e3e";
    banner.style.color = "#ffffff";
  } else {
    banner.style.backgroundColor = "#f59e0b";
    banner.style.color = "#000000";
  }

  banner.innerHTML = `
    <span style="font-size: 16px;">🔌</span>
    <span>${msg}</span>
  `;

  document.body.appendChild(banner);
}

// Listen for window message from GoogleView.vue
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "BKMARK_EXTENSION_AUTH_EVENT") {
    const user = event.data.user;
    if (user && user.userId) {
      chrome.runtime.sendMessage({ type: "EXT_AUTH_SUCCESS", user }, () => {
        showExtensionBanner("✓ Extension connected! You can now close this tab.");
        if (window.location.search.includes("ext_auth=1")) {
          setTimeout(() => {
            window.close();
          }, 1800);
        }
      });
    }
  }
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request && request.type === "CHECK_PAGE_AUTH") {
    getIndexDBSession().then((user) => {
      sendResponse({ user });
    });
    return true; // Keep channel open for async response
  }
});

// Auto-check on page load if this tab was opened for extension auth
if (window.location.search.includes("ext_auth=1")) {
  showExtensionBanner("Sign in with Google to connect your bkMark extension...", false);

  // Poll IndexedDB for up to 60 seconds (checking every 1 second)
  let attempts = 0;
  const pollTimer = setInterval(async () => {
    attempts++;
    const user = await getIndexedDBSession();
    if (user && user.userId) {
      clearInterval(pollTimer);
      chrome.runtime.sendMessage({ type: "EXT_AUTH_SUCCESS", user }, () => {
        showExtensionBanner("✓ Connected to bkMark extension! Closing tab in a moment...", true);
        setTimeout(() => {
          window.close();
        }, 1500);
      });
    }
    if (attempts > 60) {
      clearInterval(pollTimer);
    }
  }, 1000);
}
