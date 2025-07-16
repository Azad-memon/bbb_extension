let currentBBBRating = null; // Global rating tracker

document.addEventListener("DOMContentLoaded", () => {
  const loaderElement = document.getElementById("loader");
  const errorMessageElement = document.getElementById("errorMessage");
  const bbbDataElement = document.getElementById("bbbData");
  const toggleCheckbox = document.querySelector(".footer-fixed input[type='checkbox']");
  const mainContainer = document.getElementById("main-container");

  chrome.storage.local.get("showBBB", (res) => {
    const storedStatus = res.showBBB === true;

    if (toggleCheckbox) {
      toggleCheckbox.checked = storedStatus;
      toggleCheckbox.addEventListener("change", () => {
        const isActive = toggleCheckbox.checked;
        chrome.storage.local.set({ showBBB: isActive });

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tabId = tabs[0]?.id;
          if (!tabId) return;

          if (isActive) {
            // Inject badge with already stored rating
            chrome.scripting.executeScript({
              target: { tabId },
              func: (rating) => {
                const existing = document.getElementById("bbb-rating-badge");
                if (existing) return;

                const badge = document.createElement("div");
                badge.id = "bbb-rating-badge";
                badge.style.position = "fixed";
                badge.style.top = "100px";
                badge.style.right = "20px";
                badge.style.background = "#006187";
                badge.style.color = "#fff";
                badge.style.padding = "10px 14px";
                badge.style.borderRadius = "8px";
                badge.style.fontSize = "16px";
                badge.style.fontWeight = "bold";
                badge.style.zIndex = "999999";
                badge.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
                badge.style.cursor = "default";
                badge.innerText = `Rating: ${rating || "N/A"}`;

                document.body.appendChild(badge);
              },
              args: [currentBBBRating]
            });
          } else {
            // Remove badge
            chrome.scripting.executeScript({
              target: { tabId },
              func: () => {
                const badge = document.getElementById("bbb-rating-badge");
                if (badge) badge.remove();
              }
            });
          }
        });
      });
    }

    if (storedStatus) {
      loaderElement.style.display = "none";
      errorMessageElement.style.display = "none";
      bbbDataElement.style.display = "none";
      mainContainer.style.paddingBottom = "40px";
    }

    loaderElement.style.display = "block";
    errorMessageElement.style.display = "none";
    bbbDataElement.style.display = "none";
    mainContainer.style.paddingBottom = "300px";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;

      const currentDomain = new URL(tabs[0].url).hostname;
      let attempts = 0;
      const maxAttempts = 50;

      const pollInterval = setInterval(() => {
        chrome.storage.local.get([currentDomain], (result) => {
          const domainData = result[currentDomain];
          attempts++;

          if (!domainData) return;

          const { loader, data } = domainData;

          if (loader === true) {
            if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              loaderElement.style.display = "none";
              errorMessageElement.style.display = "block";
              errorMessageElement.innerHTML = `
                <h3>⏳ Server Busy</h3>
                <p>The server is taking too long to respond.<br>
                Please try again later.</p>
              `;
              bbbDataElement.style.display = "none";
            }
            return;
          }

          clearInterval(pollInterval);

          if (!data) {
            loaderElement.style.display = "none";
            bbbDataElement.style.display = "block";
            errorMessageElement.style.display = "none";

            const hostname = currentDomain.replace("www.", "");
            const baseDomain = getBaseDomain(hostname);
            const name = baseDomain.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase());

            document.getElementById("businessName").innerText = name;

            const businessUrlEl = document.getElementById("businessUrl");
            if (businessUrlEl) {
              businessUrlEl.innerText = baseDomain;
              businessUrlEl.href = "https://" + baseDomain;
            }

            return;
          }

          const {
            businessName,
            businessUrl,
            bbbRating,
            isBBBAccredited,
            profileUrl,
            accreditationDate,
            primaryCategory,
            reviews,
            ratingIcon,
            logoUrl,
          } = data;

          currentBBBRating = bbbRating || "-"; // ✅ Store for badge use
          chrome.storage.local.set({
            _lastShownBBB: {
              domain: currentDomain,
              rating: currentBBBRating
            }
          });


          document.getElementById("businessName").innerText = businessName || "-";

          const businessUrlEl = document.getElementById("businessUrl");
          if (businessUrlEl) {
            businessUrlEl.innerText = businessUrl || "-";
            businessUrlEl.href = businessUrl || "#";
          }

          const accLogoEl = document.getElementById("logoUrl");
          const accTextEl = document.getElementById("accreditationText");
          const ratingIconEl = document.getElementById("ratingIcon");

          const accreditedBox = document.getElementById("accreditedBox");
          const notAccreditedBox = document.getElementById("notAccreditedBox");
          const summaryAccreditedBox = document.querySelector(".accreditation-box");

          if (isBBBAccredited) {
            accreditedBox?.classList.remove("hidden-section");
            notAccreditedBox?.classList.add("hidden-section");

            accTextEl.innerText = `${businessName} is BBB Accredited.`;

            if (ratingIconEl) {
              ratingIconEl.style.display = "block";
              ratingIconEl.src = logoUrl || "";
            }

            if (accLogoEl) {
              accLogoEl.src = logoUrl || "";
            }

            document.getElementById("accreditationDate").innerText = formatDateUS(accreditationDate);
          } else {
            accreditedBox?.classList.add("hidden-section");
            notAccreditedBox?.classList.remove("hidden-section");

            summaryAccreditedBox.innerHTML = `
              <p class="small-title1" style="font-weight: bold;">
                ${businessName} is <br><span style="color: red;">NOT BBB Accredited.</span>
              </p>
              <hr style="border: none;border-top: 2px solid #006187;margin: 6px 0;">
              <a href="https://www.bbb.org/search?find_country=USA&find_text=${encodeURIComponent(primaryCategory || 'Business')}" 
                 target="_blank" 
                 class="find-link" 
                 style="font-size: 13px; color: #0077cc; font-weight: 600;">
                Find BBB Accredited Businesses in ${primaryCategory || 'your area'}.
              </a>
            `;
          }

          document.getElementById("primaryCategory").innerText = `Products and Services - ${primaryCategory || "-"}`;
          document.getElementById("profileUrl").href = profileUrl || "#";
          document.getElementById("ratingReasonLink").href = profileUrl || "#";
          document.getElementById("bbbRating").innerText = bbbRating || "-";

          const avgRating = Number(reviews?.averageReviewStarRating || 0).toFixed(1);
          const totalReviews = reviews?.totalCustomReviews || 0;

          renderStars(document.getElementById("starRatingContainer"), avgRating);
          document.getElementById("avgRating").innerText = `${avgRating}/5 ⭐`;
          document.getElementById("totalReviews").innerText = `Average of ${totalReviews} Customer Reviews`;
          document.getElementById("complaints12mo").innerText = reviews?.totalClosedComplaintsPastTwelveMonths || 0;
          document.getElementById("complaints3yr").innerText = reviews?.totalClosedComplaintsPastThreeYears || 0;

          loaderElement.style.display = "none";
          errorMessageElement.style.display = "none";
          bbbDataElement.style.display = "block";
        });
      }, 300);
    });
  });

  function formatDateUS(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isNaN(date)
      ? dateStr
      : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
  }

  function getBaseDomain(hostname) {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }

  function renderStars(container, average) {
    if (!container) return;
    container.innerHTML = "";

    const avg = parseFloat(average) || 0;
    const full = Math.floor(avg);
    const half = avg % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;

    for (let i = 0; i < full; i++) {
      const star = document.createElement("span");
      star.className = "star full";
      container.appendChild(star);
    }

    if (half) {
      const star = document.createElement("span");
      star.className = "star half";
      container.appendChild(star);
    }

    for (let i = 0; i < empty; i++) {
      const star = document.createElement("span");
      star.className = "star empty";
      container.appendChild(star);
    }
  }
});

// Close button logic
const closeBtn = document.querySelector(".close-btn");
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    window.close();
  });
}
