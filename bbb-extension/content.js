
function createAndInjectFloatingBadge(data) {
  if (document.getElementById("bbb-rating-badge")) return;

  // Inject @font-face style
  const fontStyle = document.createElement("style");
  fontStyle.textContent = `
    @font-face {
      font-family: 'proximanova_regular';
      src: url(${chrome.runtime.getURL("proximanova_regular.ttf")}) format("truetype");
      font-weight: normal;
      font-style: normal;
    }
  `;
  document.head.appendChild(fontStyle);

  // Create badge
  const badge = document.createElement("div");
  badge.id = "bbb-rating-badge";
  badge.style.cssText = `
    position: fixed;
    top: 100px;
    right: -85px;
    display: flex;
    background: #fff;
    color: #000;
    padding: 0px 0px 0px 5px;
    border-radius: 5px 0 0 5px;
    font-size: 16px;
    align-items: center;
    font-weight: bold;
    z-index: 999999;
    box-shadow: rgba(0, 0, 0, 0.3) 0px 2px 6px;
    cursor: move;
    gap: 8px;
    transition: right 0.5s;
    font-family: 'proximanova_regular', sans-serif;
  `;

  // Slide in/out
  badge.addEventListener("mouseenter", () => {
    badge.style.right = "0";
  });

  badge.addEventListener("mouseleave", () => {
    badge.style.right = "-85px";
  });

  // Dragging
  let isDragging = false;
  let offsetY = 0;

  badge.addEventListener("mousedown", function (e) {
    isDragging = true;
    offsetY = e.clientY - badge.getBoundingClientRect().top;
    badge.style.transition = "none";
  });

  document.addEventListener("mousemove", function (e) {
    if (!isDragging) return;
    const newTop = e.clientY - offsetY;
    badge.style.top = `${newTop}px`;
    badge.style.right = "0";
    badge.style.left = "auto";
  });

  document.addEventListener("mouseup", function () {
    if (isDragging) {
      isDragging = false;
      badge.style.transition = "right 0.5s";
    }
  });

  // BBB Image
  const img = document.createElement("img");
  img.alt = "BBB";
  img.style.height = "24px";
  img.src = data.isBBBAccredited === false
    ? chrome.runtime.getURL("not-accredited-icon.svg")
    : chrome.runtime.getURL("bbb_logo1.png");

  // BBB Rating
  const text = document.createElement("span");
  text.textContent = `${data.bbbRating || "N/A"}`;

  // Star Rating with SVG
  const textReview = document.createElement("span");
  textReview.style.display = "flex";
  textReview.style.alignItems = "center";
  textReview.style.gap = "4px";

  const starIcon = document.createElement("img");
  starIcon.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 576 512'><path fill='%23FFA500' d='M316.9 18c-5.3-11-16.5-18-28.8-18s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329l-24.6 145.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329l104.2-103.1c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7l-143.7-21.2z'/></svg>";
  starIcon.alt = "Star";
  starIcon.style.height = "16px";
  starIcon.style.width = "16px";

  const ratingValue = document.createElement("span");
  const avgRatingRaw = data?.reviews?.averageReviewStarRating;
  const avgRating = avgRatingRaw != null ? Math.round(avgRatingRaw * 10) / 10 : "N/A";
  ratingValue.textContent = avgRating ?? "N/A";

  textReview.appendChild(starIcon);
  textReview.appendChild(ratingValue);

  // Learn More Button
  const learnMoreContainer = document.createElement("a");
  learnMoreContainer.href = data.profileUrl || "#";
  learnMoreContainer.target = "_blank";
  learnMoreContainer.style.cssText = `
    background-color: #1d5d90;
    color: white;
    padding: 4px 8px;
    border-radius: 0px;
    text-decoration: none;
    font-size: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    text-transform: uppercase;
    font-family: 'proximanova_regular', sans-serif;
  `;
  learnMoreContainer.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" height="14" viewBox="0 0 24 24" width="14" fill="white">
      <path d="M0 0h24v24H0V0z" fill="none"/>
      <path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 
      10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 
      8-8 8 3.59 8 8-3.59 8-8 8z"/>
    </svg>
    <span>Learn More</span>
  `;

  // Final assembly
  badge.appendChild(img);
  badge.appendChild(text);
  badge.appendChild(textReview);
  badge.appendChild(learnMoreContainer);
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
      logo.src = data.isBBBAccredited === false
      ? chrome.runtime.getURL("not-accredited-icon.svg")
      : chrome.runtime.getURL("bbb_logo1.png");
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
