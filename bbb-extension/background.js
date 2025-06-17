const BBB_API_URL = "http://localhost:8000/api/bbb/search";
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
        .catch((err) => {
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
