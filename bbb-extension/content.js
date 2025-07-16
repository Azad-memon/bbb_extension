function createAndInjectFloatingBadge(data) {
  if (document.getElementById("bbb-rating-badge")) return;

  const badge = document.createElement("div");
  badge.id = "bbb-rating-badge";
  badge.style.cssText = `
    position: fixed;
    top: 100px;
    right: -20px;
    display: flex !important;
    background: rgb(255, 255, 255);
    color: rgb(0, 0, 0);
    padding: 5px 10px 5px 5px;
    border-radius: 5px 0px 0px 5px !important;
    font-size: 16px;
    align-items: center !important;
    font-weight: bold;
    z-index: 999999;
    box-shadow: rgba(0, 0, 0, 0.3) 0px 2px 6px;
    cursor: move;
    gap: 5px;
    transition: right 0.5s;
  `;

  // Slide in on hover
  badge.addEventListener("mouseenter", () => {
    badge.style.right = "0";
  });

  badge.addEventListener("mouseleave", () => {
    badge.style.right = "-20px";
  });

  // Vertical drag only
  let isDragging = false;
  let offsetY = 0;

  badge.addEventListener("mousedown", function (e) {
    isDragging = true;
    offsetY = e.clientY - badge.getBoundingClientRect().top;
    badge.style.transition = "none"; // disable animation during drag
  });

  document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;
    const newTop = e.clientY - offsetY;
    badge.style.top = `${newTop}px`;
    badge.style.right = "0";         // always fixed to right
    badge.style.left = "auto";       // make sure left doesn't interfere
  });

  document.addEventListener("mouseup", function () {
    if (isDragging) {
      isDragging = false;
      badge.style.transition = "right 0.5s"; // re-enable animation
    }
  });

  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("bbb_logo1.png");
  img.alt = "BBB";
  img.style.height = "20px";

  const text = document.createElement("span");
  text.textContent = ` ${data.bbbRating || "N/A"} ::`;

  badge.appendChild(img);
  badge.appendChild(text);
  document.body.appendChild(badge);
}

(async function () {
  const currentDomain = location.hostname.replace(/^www\./, "");

  chrome.storage.local.get(["showBBB"], (res) => {
    const isEnabled = res.showBBB === true;

    if (isEnabled) {
      chrome.runtime.sendMessage({ action: "GET_DOMAIN_DATA_FORCE", domain: currentDomain }, (response) => {
        const data = response?.data;
        if (data) {
          createAndInjectFloatingBadge(data); // ✅ reused here
        }
      });
    }
  });

  // Only continue for Google Search
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
              createAndInjectFloatingBadge(data); // ✅ reused here too
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
      wrapper.style.cssText = `
        display: flex;
        align-items: center;
        background-color: #f7f9fa;
        border-radius: 10px;
        padding: 8px 12px;
        margin-top: 12px;
        font-size: 14px;
        font-family: Arial, sans-serif;
        color: #000;
        box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        flex-wrap: wrap;
        min-width: 600px;
        gap: 12px;
      `;

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
      accredited.innerHTML = data.isBBBAccredited
        ? `<strong style="color:#0046be;">BBB Accredited</strong>`
        : `<strong style="color:red;">NOT BBB Accredited</strong>`;

      const stats = document.createElement("div");
      stats.style.display = "flex";
      stats.style.alignItems = "center";
      stats.style.gap = "6px";

      const reviews = document.createElement("span");
      reviews.textContent = `${data.reviews?.totalCustomReviews || 0} reviews`;

      const complaints = document.createElement("span");
      complaints.textContent = `${data.reviews?.totalComplaints || 0} complaints`;

      stats.innerHTML = `| `;
      stats.appendChild(reviews);
      stats.innerHTML += ` `;
      stats.appendChild(complaints);
      stats.innerHTML += ` |`;

      const link = document.createElement("a");
      link.href = data.profileUrl;
      link.textContent = "See full business profile";
      link.target = "_blank";
      link.style.cssText = `
        color: #0046be;
        font-weight: bold;
        margin-left: auto;
        text-decoration: none;
        white-space: nowrap;
      `;

      wrapper.appendChild(logoContainer);
      wrapper.appendChild(accredited);
      wrapper.appendChild(stats);
      wrapper.appendChild(link);

      return wrapper;
    }


  });
})();
