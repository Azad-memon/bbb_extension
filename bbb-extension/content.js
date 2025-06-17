chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getDomain") {
      sendResponse({ domain: window.location.hostname });
    }
  });
  