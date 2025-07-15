(async function () {
  if (!location.hostname.includes("google.com") || !location.pathname.startsWith("/search")) return;

  // Helper to extract base domain
  function getBaseDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const tld = parts.slice(-2).join('.');
      // Handle 3rd level TLDs like co.uk, com.au
      const commonTLDs = ['co.uk', 'com.au', 'co.in'];
      if (commonTLDs.includes(tld) && parts.length >= 3) {
        return parts.slice(-3).join('.');
      }
      return tld;
    }
    return hostname;
  }

  const anchors = Array.from(document.querySelectorAll("a"))
    .filter(a => a.href.startsWith("http") && !a.href.includes("google.com"));

  const domainMap = new Map(); // baseDomain => anchors[]

  anchors.forEach(anchor => {
    try {
      const domain = new URL(anchor.href).hostname;
      const base = getBaseDomain(domain);
      if (!domainMap.has(base)) domainMap.set(base, []);
      domainMap.get(base).push(anchor);
    } catch { }
  });

  const domains = Array.from(domainMap.keys());
  if (!domains.length) return;

  // Ask background to fetch these domains
  chrome.runtime.sendMessage({
    type: "SEARCH_RESULTS_DOMAINS",
    domains
  });

  const maxAttempts = 30;
  let attempts = 0;

  const poll = setInterval(() => {
    chrome.storage.local.get(domains, results => {
      let allDone = true;

      domains.forEach(domain => {
        const result = results[domain];
        if (!result || result.loader === true) {
          allDone = false;
          return;
        }

        if (result.data) {
          const data = result.data;
          const element = createBBBElement(data);
          const injectedContainers = new Set();

          (domainMap.get(domain) || []).forEach(anchor => {
            let container = anchor.closest(".MjjYud, .BYM4Nd, .g, .tF2Cxc, .uEierd, .srKDX");
            console.log(container);
            // Fallback for odd structures
            if (!container) {
              let temp = anchor;
              for (let i = 0; i < 5; i++) {
                if (!temp || temp.tagName === "BODY") break;
                if (
                  temp.querySelector("h3") ||
                  temp.querySelector(".LC20lb") ||
                  temp.querySelector("cite") ||
                  temp.getAttribute("data-hveid")
                ) {
                  container = temp;
                  break;
                }
                temp = temp.parentElement;
              }
            }

            // Skip if already injected or container already contains .bbb-result
            if (!container || injectedContainers.has(container) || container.querySelector(".bbb-result")) return;

            injectedContainers.add(container);
            container.appendChild(element.cloneNode(true));
          });

          // Don't block re-checking same domain, just allow multiple containers to be injected
          chrome.storage.local.set({
            [domain]: {
              ...result,
              _injected: false // intentionally allow re-checking subcontainers
            }
          });
        }
      });

      attempts++;
      if (attempts >= maxAttempts || allDone) clearInterval(poll);
    });
  }, 500);

  function createBBBElement(data) {
    const wrapper = document.createElement("div");
    wrapper.className = "bbb-result";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "16px";
    wrapper.style.padding = "6px 10px";
    wrapper.style.border = "1px solid #d2e3fc";
    wrapper.style.borderRadius = "6px";
    wrapper.style.marginTop = "10px";
    wrapper.style.fontSize = "14px";
    wrapper.style.flexWrap = "wrap";
    wrapper.style.boxSizing = "border-box";
    wrapper.style.width = "600px";

    // One-liner elements as spans
    const business = document.createElement("span");
    business.innerHTML = `✅ <strong>Business:</strong> ${data.businessName || "-"}`;

    const rating = document.createElement("span");
    rating.innerHTML = `⭐ <strong>BBB Rating:</strong> ${data.bbbRating || "-"}`;

    const since = document.createElement("span");
    since.innerHTML = `📅 <strong>Since:</strong> ${formatDate(data.accreditationDate)}`;

    wrapper.appendChild(business);
    wrapper.appendChild(rating);
    wrapper.appendChild(since);

    return wrapper;
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
  }
})();
