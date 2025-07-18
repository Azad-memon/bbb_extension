let currentBBBRating = null; // Global rating tracker

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

  // Dragging functionality
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

  // Image
  const img = document.createElement("img");
  img.alt = "BBB";
  img.style.height = "24px";
  img.src = data.isBBBAccredited === false
    ? chrome.runtime.getURL("not-accredited-icon.svg")
    : chrome.runtime.getURL("bbb_logo1.png");

  // Rating text
  const text = document.createElement("span");
  text.textContent = `${data.bbbRating || "N/A"}`;

  // Learn More button with icon
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
      <path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 
      10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 
      8-8 8 3.59 8 8-3.59 8-8 8z"/>
    </svg>
    <span>Learn More</span>
  `;

  // Add elements to badge
  badge.appendChild(img);
  badge.appendChild(text);
  badge.appendChild(learnMoreContainer);
  document.body.appendChild(badge);
}




  


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
            chrome.runtime.sendMessage({
              action: "GET_DOMAIN_DATA_FORCE",
              domain: new URL(tabs[0].url).hostname.replace(/^www\./, "")
            }, (response) => {
              const data = response?.data;
              if (!data) return;

              chrome.scripting.executeScript({
                target: { tabId },
                func: createAndInjectFloatingBadge,
                args: [data]
              });
            });
          } else {
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
            clearInterval(pollInterval);
            loaderElement.style.display = "none";
            bbbDataElement.style.display = "block";
            errorMessageElement.style.display = "none";

            const businessUrl = new URL(tabs[0].url);
            const domain = businessUrl.hostname.replace("www.", "");
            const name = domain.split(".")[0].replace(/[-_]/g, " ").replace(/\b\w/g, l => l.toUpperCase());

            document.getElementById("businessName").innerText = name;
            const businessUrlEl = document.getElementById("businessUrl");
            if (businessUrlEl) {
              businessUrlEl.innerText = domain;
              businessUrlEl.href = "https://" + domain;
            }

            document.getElementById("bbbData").innerHTML = `
              <div class="business-info business-infothrr">
                <div class="innerbusinfo">
                  <div class="innerbustext">
                    <h1>${name}</h1>
                    <a class="website" href="https://${domain}" target="_blank">${domain}</a>
                  </div>
                  <div class="innerbusimg " style='flex: 1 1 35%;
        text-align: center;' id="notfoundbox">
                    <p class="business-info-text" style=" font-weight: bold;">
                      BUSINESS <br> NOT FOUND
                    </p>
                    <a href="https://www.bbb.org/near-me" target="_blank" class="find-link" style="font-size: 12px;">
                      Find Accredited Businesses
                    </a>
                  </div>
                
                </div>
                <p class="not-registered-text">There is not a BBB profile associated with this website.</p>
                <hr />
                <p class="suggest-text">Would you like to tell us about your experience with this business?</p>
                <p class="submittext">Submit a request to add a new BBB Business Profile.</p>
                <a class="view-btn notbtn" href="https://www.bbb.org/RequestABusiness" target="_blank">
                  <svg width="25px" height="25px" viewBox="0 0 24 24" fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <g id="Interface / External_Link">
                      <path id="Vector"
                        d="M10.0002 5H8.2002C7.08009 5 6.51962 5 6.0918 5.21799C5.71547 5.40973 5.40973 5.71547 5.21799 6.0918C5 6.51962 5 7.08009 5 8.2002V15.8002C5 16.9203 5 17.4801 5.21799 17.9079C5.40973 18.2842 5.71547 18.5905 6.0918 18.7822C6.5192 19 7.07899 19 8.19691 19H15.8031C16.921 19 17.48 19 17.9074 18.7822C18.2837 18.5905 18.5905 18.2839 18.7822 17.9076C19 17.4802 19 16.921 19 15.8031V14M20 9V4M20 4H15M20 4L13 11"
                        stroke="#215fdb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </g>
                  </svg>
                  Request to add business
                </a>
              </div>
            `;

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

          currentBBBRating = bbbRating || "-";
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
              <a href="https://www.bbb.org/all/find-businesses-near-you" 
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
          document.getElementById("avgRating").innerText = `${avgRating}/5`;
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
  const full = Math.round(avg); // round instead of floor to avoid half
  const empty = 5 - full;

  for (let i = 0; i < full; i++) {
    const star = document.createElement("span");
    star.className = "star1 full";
    container.appendChild(star);
  }

  for (let i = 0; i < empty; i++) {
    const star = document.createElement("span");
    star.className = "star1 empty";
    container.appendChild(star);
  }
}

});

const closeBtn = document.querySelector(".close-btn");
if (closeBtn) {
  closeBtn.addEventListener("click", () => {
    window.close();
  });
}
