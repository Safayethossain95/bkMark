// bkMark Extension Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log("bkMark Extension installed");
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "EXT_AUTH_SUCCESS") {
    if (message.user && message.user.userId) {
      chrome.storage.local.set({ bkmark_user: message.user }, () => {
        sendResponse({ success: true, saved: true });
      });

      // Auto-close floating auth window if sender has windowId
      if (sender && sender.tab && sender.tab.windowId) {
        setTimeout(() => {
          try {
            chrome.windows.remove(sender.tab.windowId);
          } catch (e) {}
        }, 1200);
      }
      return true; // Keep channel open for async response
    }
  }
});
