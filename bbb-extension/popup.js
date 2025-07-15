document.addEventListener("DOMContentLoaded", () => {
  const loaderElement = document.getElementById("loader");
  const errorMessageElement = document.getElementById("errorMessage");
  const bbbDataElement = document.getElementById("bbbData");
  const bbbContainerWrapper = document.querySelector(".bbb-container-wrapper");
  const toggleCheckbox = document.querySelector(".footer-fixed input[type='checkbox']");

  // Toggle show/hide content on switch and persist in localStorage
  if (toggleCheckbox && bbbContainerWrapper) {
    toggleCheckbox.addEventListener("change", () => {
      const isActive = toggleCheckbox.checked;
      localStorage.setItem("bbbStatusToggle", isActive);
      bbbContainerWrapper.style.display = isActive ? "none" : "block";
    });

    // Load persisted toggle state
    const storedStatus = localStorage.getItem("bbbStatusToggle") === "true";
    toggleCheckbox.checked = storedStatus;
    bbbContainerWrapper.style.display = storedStatus ? "none" : "block";

    // If toggle is active, skip API load
    if (storedStatus) return;
  }

  loaderElement.style.display = "block";
  errorMessageElement.style.display = "none";
  bbbDataElement.style.display = "none";

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

  function renderStars(container, average) {
    if (!container) return;
    container.innerHTML = ""; // clear previous stars
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
          errorMessageElement.style.display = "block";
          bbbDataElement.style.display = "none";
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
          ratingIcon,
          reviews,
          logoUrl,
        } = data;

        const businessNameEl = document.getElementById("businessName");
        if (businessNameEl) businessNameEl.innerText = businessName || "-";

        const businessUrlEl = document.getElementById("businessUrl");
        if (businessUrlEl) {
          businessUrlEl.innerText = businessUrl || "-";
          businessUrlEl.href = businessUrl || "#";
        }

        const logoEl = document.getElementById("logoUrl");
        if (logoEl) logoEl.src = logoUrl || "bbb_logo.svg";

        const accDateEl = document.getElementById("accreditationDate");
        if (accDateEl) accDateEl.innerText = formatDateUS(accreditationDate);

        const catEl = document.getElementById("primaryCategory");
        if (catEl) catEl.innerText = `Products and Services - ${primaryCategory || "-"}`;

        const profileLink = document.getElementById("profileUrl");
        if (profileLink) profileLink.href = profileUrl || "#";

        const reasonLink = document.getElementById("ratingReasonLink");
        if (reasonLink) reasonLink.href = profileUrl || "#";

        const ratingEl = document.getElementById("bbbRating");
        if (ratingEl) ratingEl.innerText = bbbRating || "-";

        const ratingIconEl = document.getElementById("ratingIcon");
        const accTextEl = document.getElementById("accreditationText");

        if (isBBBAccredited) {
          if (ratingIconEl) {
            ratingIconEl.style.display = "block";
            ratingIconEl.src = logoUrl || ""; // use logoUrl from API only
          }
          if (accTextEl) accTextEl.innerText = "This business is BBB Accredited.";
        } else {
          if (ratingIconEl) ratingIconEl.style.display = "none";
          if (accTextEl) accTextEl.innerText = "This business is not BBB Accredited.";
        }

        const avgRating = Number(reviews?.averageReviewStarRating || 0).toFixed(1);
        const totalReviews = reviews?.totalCustomReviews || 0;

        const starContainer = document.getElementById("starRatingContainer");
        renderStars(starContainer, avgRating);

        const avgRatingEl = document.getElementById("avgRating");
        if (avgRatingEl) avgRatingEl.innerText = `${avgRating}/5`;

        const totalReviewsEl = document.getElementById("totalReviews");
        if (totalReviewsEl)
          totalReviewsEl.innerText = `Average of ${totalReviews} Customer Reviews`;

        const complaints12moEl = document.getElementById("complaints12mo");
        if (complaints12moEl)
          complaints12moEl.innerText =
            reviews?.totalClosedComplaintsPastTwelveMonths || 0;

        const complaints3yrEl = document.getElementById("complaints3yr");
        if (complaints3yrEl)
          complaints3yrEl.innerText =
            reviews?.totalClosedComplaintsPastThreeYears || 0;

        loaderElement.style.display = "none";
        errorMessageElement.style.display = "none";
        bbbDataElement.style.display = "block";
      });
    }, 300);
  });
});
