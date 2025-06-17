document.addEventListener("DOMContentLoaded", () => {
  const loaderElement = document.getElementById("loader");
  const errorMessageElement = document.getElementById("errorMessage");
  const bbbDataElement = document.getElementById("bbbData");

  loaderElement.style.display = "block";
  errorMessageElement.style.display = "none";
  bbbDataElement.style.display = "none";

  function formatDateUS(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;

    const currentDomain = new URL(tabs[0].url).hostname;
    let attempts = 0;
    const maxAttempts = 50; // 50 x 300ms = 15 seconds

    const pollInterval = setInterval(() => {
      chrome.storage.local.get([currentDomain], (result) => {
        const domainData = result[currentDomain];
        attempts++;

        if (!domainData) return;

        const { loader, data, errorMessage } = domainData;

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

        // If loader is false (completed)
        clearInterval(pollInterval);

        if (!data) {
          loaderElement.style.display = "none";
          errorMessageElement.style.display = "block";
          bbbDataElement.style.display = "none";
          return;
        }

        const {
          businessName,
          bbbRating,
          isBBBAccredited,
          location,
          profileUrl,
          businessId,
          primaryCategory,
          bbbFileOpenDate,
          accreditationDate,
          dateBusinessStarted,
          reviews,
        } = data;

        document.getElementById("businessName").innerText = businessName || "-";
        document.getElementById("bbbRating").innerText = bbbRating || "-";
        document.getElementById("location").innerText = location || "-";
        document.getElementById("profileUrl").href = profileUrl || "#";
        document.getElementById("profileUrl").innerText = "View Profile →";

        const accreditedElement = document.getElementById("accredited");
        accreditedElement.innerHTML = isBBBAccredited
          ? `<span class="yes">Yes ✅</span>`
          : `<span class="no">No ❌</span>`;

        const accreditationRow = document.getElementById("accreditationRow");
        if (isBBBAccredited && accreditationDate) {
          accreditationRow.style.display = "flex";
          document.getElementById("accreditationDate").innerText = formatDateUS(accreditationDate);
        } else {
          accreditationRow.style.display = "none";
        }

        document.getElementById("businessId").innerText = businessId || "-";
        document.getElementById("primaryCategory").innerText = primaryCategory || "-";
        document.getElementById("fileOpenDate").innerText = formatDateUS(bbbFileOpenDate);
        document.getElementById("startDate").innerText = formatDateUS(dateBusinessStarted);
        document.getElementById("totalReviews").innerText = reviews?.totalCustomReviews ?? "-";
        document.getElementById("avgRating").innerText = reviews?.averageReviewStarRating ?? "-";
        document.getElementById("totalComplaints").innerText = reviews?.totalComplaints ?? "-";

        loaderElement.style.display = "none";
        errorMessageElement.style.display = "none";
        bbbDataElement.style.display = "block";
      });
    }, 300);
  });
});
