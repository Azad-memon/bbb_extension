(async function () {
  const currentDomain = location.hostname.replace(/^www\./, "");

  // Always check toggle + inject badge on any page
  chrome.storage.local.get(["showBBB"], (res) => {
    const isEnabled = res.showBBB === true;

    if (isEnabled) {
      chrome.runtime.sendMessage({ action: "GET_DOMAIN_DATA_FORCE", domain: currentDomain }, (response) => {
        const data = response?.data;

        if (data && !document.getElementById("bbb-rating-badge")) {
          const badge = document.createElement("div");
          badge.id = "bbb-rating-badge";
          badge.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: #006187;
            color: #fff;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            z-index: 999999;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: default;
          `;
          badge.innerText = `Rating: ${data.bbbRating || "N/A"}`;
          document.body.appendChild(badge);
        }
      });
    }
  });

  // Now handle Google search results separately
  if (!location.hostname.includes("google.com") || !location.pathname.startsWith("/search")) return;

  chrome.storage.local.get("showBBB", (res) => {
    const isEnabled = res.showBBB === true;
    if (!isEnabled) return;

    function getBaseDomain(hostname) {
      const parts = hostname.split('.');
      const commonTLDs = ['co.uk', 'com.au', 'co.in'];
      if (parts.length >= 2) {
        const tld = parts.slice(-2).join('.');
        if (commonTLDs.includes(tld) && parts.length >= 3) {
          return parts.slice(-3).join('.');
        }
        return tld;
      }
      return hostname;
    }

    const anchors = Array.from(document.querySelectorAll("a"))
      .filter(a => a.href.startsWith("http") && !a.href.includes("google.com"));

    const domainMap = new Map();

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

    chrome.runtime.sendMessage({ type: "SEARCH_RESULTS_DOMAINS", domains });

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

              if (!container || container.closest("#rhs")) return;
              if (injectedContainers.has(container) || container.querySelector(".bbb-result")) return;

              injectedContainers.add(container);
              container.appendChild(element.cloneNode(true));
            });

            if (attempts === 1 && data && !document.querySelector(".bbb-floating-badge")) {
              injectFloatingBadge(data);
            }

            chrome.storage.local.set({
              [domain]: {
                ...result,
                _injected: false
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
      wrapper.style.backgroundColor = "#F7F9FA";
      wrapper.style.borderRadius = "10px";
      wrapper.style.padding = "8px 12px";
      wrapper.style.marginTop = "12px";
      wrapper.style.fontSize = "14px";
      wrapper.style.fontFamily = "Arial, sans-serif";
      wrapper.style.color = "#000";
      wrapper.style.boxShadow = "0 1px 4px rgba(0,0,0,0.1)";
      wrapper.style.flexWrap = "wrap";
      wrapper.style.minWidth = "600px";
      wrapper.style.gap = "12px";
      const logoContainer = document.createElement("div");
      logoContainer.style.display = "flex";
      logoContainer.style.alignItems = "center";
      logoContainer.style.gap = "6px";
      const logo = document.createElement("img");
      logo.src = chrome.runtime.getURL("bbb_logo1.png");
      logo.alt = "BBB Logo";
      logo.style.height = "20px";
      const rating = document.createElement("div");
      rating.textContent = data.bbbRating || "-";
      rating.style.color = "#0046BE";
      rating.style.fontWeight = "bold";
      logoContainer.appendChild(logo);
      logoContainer.appendChild(rating);
      const accredited = document.createElement("div");
      if (data.isBBBAccredited) {
        accredited.innerHTML = `<strong style="color:#0046be;">BBB Accredited</strong>`;
      } else {
        accredited.innerHTML = `<strong style="color:red;">NOT BBB Accredited</strong>`;
      }
      const stats = document.createElement("div");
      stats.style.display = "flex";
      stats.style.alignItems = "center";
      stats.style.gap = "6px";
      const reviews = document.createElement("span");
      reviews.textContent = `${data.reviews?.totalCustomReviews || 0} reviews`;
      const complaints = document.createElement("span");
      complaints.textContent = `${data.reviews?.totalComplaints || 0} complaints`;
      stats.innerHTML = `|&nbsp;`;
      stats.appendChild(reviews);
      stats.innerHTML += `&nbsp;`;
      stats.appendChild(complaints);
      stats.innerHTML += `&nbsp;|`;
      const link = document.createElement("a");
      link.href = data.profileUrl;
      link.textContent = "See full business profile";
      link.target = "_blank";
      link.style.color = "#0046BE";
      link.style.fontWeight = "bold";
      link.style.marginLeft = "auto";
      link.style.textDecoration = "none";
      link.style.whiteSpace = "nowrap";
      wrapper.appendChild(logoContainer);
      wrapper.appendChild(accredited);
      wrapper.appendChild(stats);
      wrapper.appendChild(link);
      return wrapper;
    }`  1`

    function injectFloatingBadge(data) {
      const badge = document.createElement("div");
      badge.className = "bbb-floating-badge";
      badge.style.cssText = `
        position: fixed;
        top: 100px;
        right: 10px;
        z-index: 99999;
        background-color: #fff;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        padding: 6px 10px;
        font-size: 14px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 6px;
        pointer-events: none;
      `;

      const icon = document.createElement("img");
      icon.src = chrome.runtime.getURL("bbb_logo1.png");
      icon.alt = "BBB";
      icon.style.height = "20px";

      const rating = document.createElement("span");
      const ratingText = data.bbbRating || "-";
      const avgRating = data.reviews?.averageReviewStarRating;
      rating.textContent = `${ratingText}${avgRating ? ` (${avgRating.toFixed(1)}⭐)` : ""}`;
      rating.style.color = "#0046be";

      badge.appendChild(icon);
      badge.appendChild(rating);
      document.body.appendChild(badge);
    }
  });
})();
