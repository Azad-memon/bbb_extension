(async function () {
  if (!location.hostname.includes("google.com") || !location.pathname.startsWith("/search")) return;

  function getBaseDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const tld = parts.slice(-2).join('.');
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

            // ✅ Skip right panel (Knowledge Panel) injections
            if (!container || container.closest("#rhs")) return;

            if (injectedContainers.has(container) || container.querySelector(".bbb-result")) return;

            injectedContainers.add(container);
            container.appendChild(element.cloneNode(true));
          });

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
    wrapper.style.backgroundColor = "#f7f9fa";
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
    rating.style.color = "#0046be";
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
    link.style.color = "#0046be";
    link.style.fontWeight = "bold";
    link.style.marginLeft = "auto";
    link.style.textDecoration = "none";
    link.style.whiteSpace = "nowrap";

    wrapper.appendChild(logoContainer);
    wrapper.appendChild(accredited);
    wrapper.appendChild(stats);
    wrapper.appendChild(link);

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
