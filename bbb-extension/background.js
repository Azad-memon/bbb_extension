// const BBB_API_URL = "http://localhost:8000/api/bbb/search";
const BBB_API_URL = "https://testlink.doodlendash.com/bbb/bbb-extension-api/public/api/bbb/search";
const BEARER_TOKEN = "@K7p#9vL!x3$Mz2";
const CACHE_EXPIRY_HOURS = 24;

// Helper function to simplify fetch with JSON response and status handling
async function fetchJson(url, options) {
  const res = await fetch(url, options);

  if (res.status === 404) {
    // Return fallback object for known 404 case
    return { message: "No business ID found" };
  }

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`);
  }

  return await res.json();
}

// ✅ Core functionality: run for active tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url.startsWith("http")) {
    const url = new URL(tab.url);
    const domain = url.hostname;
    const now = Date.now();

    // Step 1: Set loader = true immediately
    chrome.storage.local.set({
      [domain]: {
        loader: true,
        data: null,
        errorMessage: null,
        timestamp: now,
      },
    });

    // Step 2: Check local cache
    chrome.storage.local.get([domain], (result) => {
      const cached = result[domain];
      const isFresh =
        cached?.timestamp &&
        now - cached.timestamp < CACHE_EXPIRY_HOURS * 60 * 60 * 1000 &&
        cached.data;

      if (isFresh) {
        chrome.storage.local.set({
          [domain]: {
            ...cached,
            loader: false,
            errorMessage: null,
          },
        });
        return;
      }

      // Step 3: Fetch from API
      fetchJson(BBB_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BEARER_TOKEN}`,
        },
        body: JSON.stringify({ url: domain }),
      })
        .then((data) => {
          if (data.message === "No business ID found") {
            chrome.storage.local.set({
              [domain]: {
                timestamp: now,
                data: null,
                loader: false,
                errorMessage: "No business ID found for this domain.",
              },
            });
          } else {
            chrome.storage.local.set({
              [domain]: {
                timestamp: now,
                data: data,
                loader: false,
                errorMessage: null,
              },
            });
          }
        })
        .catch(() => {
          chrome.storage.local.set({
            [domain]: {
              timestamp: now,
              data: null,
              loader: false,
              errorMessage: "Something went wrong. Try again later.",
            },
          });
        });
    });
  }
});

// ✅ Additional: Support batch fetch for multiple domains (from content.js)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SEARCH_RESULTS_DOMAINS" && Array.isArray(message.domains)) {
    const now = Date.now();

    message.domains.forEach((domain) => {
      chrome.storage.local.get([domain], (result) => {
        const cached = result[domain];
        const isFresh =
          cached?.timestamp &&
          now - cached.timestamp < CACHE_EXPIRY_HOURS * 60 * 60 * 1000 &&
          cached.data;

        if (isFresh) return;

        chrome.storage.local.set({
          [domain]: {
            loader: true,
            data: null,
            errorMessage: null,
            timestamp: now,
            _source: "batch" // just for reference
          },
        });

        fetchJson(BBB_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${BEARER_TOKEN}`,
          },
          body: JSON.stringify({ url: domain }),
        })
          .then((data) => {
            chrome.storage.local.set({
              [domain]: {
                timestamp: now,
                data: data.message === "No business ID found" ? null : data,
                loader: false,
                errorMessage: data.message === "No business ID found"
                  ? "No business ID found"
                  : null,
                _source: "batch"
              },
            });
          })
          .catch(() => {
            chrome.storage.local.set({
              [domain]: {
                timestamp: now,
                data: null,
                loader: false,
                errorMessage: "Something went wrong",
                _source: "batch"
              },
            });
          });
      });
    });
  }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openPopup") {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 400,
      height: 620
    });
  }
});


// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "GET_DOMAIN_DATA") {
//     const domain = message.domain;
//     chrome.storage.local.get([domain], (result) => {
//       sendResponse(result[domain]);
//     });
//     return true; // needed for async sendResponse
//   }
// });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_DOMAIN_DATA_FORCE") {
    const domain = message.domain;
    const now = Date.now();

    chrome.storage.local.get([domain], async (result) => {
      const cached = result[domain];
      const isFresh =
        cached?.timestamp &&
        now - cached.timestamp < CACHE_EXPIRY_HOURS * 60 * 60 * 1000 &&
        cached.data;

      // ✅ If fresh data available, return
      if (isFresh) {
        sendResponse({ data: cached.data });
        return;
      }

      // 🚀 Otherwise, fetch from API
      try {
        const data = await fetchJson(BBB_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${BEARER_TOKEN}`,
          },
          body: JSON.stringify({ url: domain }),
        });

        const finalData = data.message === "No business ID found" ? null : data;

        chrome.storage.local.set({
          [domain]: {
            timestamp: now,
            data: finalData,
            loader: false,
            errorMessage: finalData ? null : "No business ID found"
          }
        });

        sendResponse({ data: finalData });
      } catch (err) {
        sendResponse({ data: null });
      }
    });

    return true; // async sendResponse
  }
});
