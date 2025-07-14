document.addEventListener("DOMContentLoaded", () => {
    const domainFromURL = (urlString) => {
        try {
            return new URL(urlString).hostname;
        } catch {
            return "";
        }
    };

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const domain = domainFromURL(tabs[0].url);

        chrome.storage.local.get([domain], (result) => {
            const data = result[domain]?.data;
            if (!data) return;

            // Business Info
            document.querySelector("h1").innerText = data.businessName || "-";
            document.querySelector(".website").innerText = domain;
            document.querySelector(".website").href = data.businessUrl || "#";
            document.querySelector(".services").innerText = `Products and Services - ${data.primaryCategory || "-"}`;
            document.querySelector(".business-info-text").innerText = `Accredited since ${formatDateUS(data.accreditationDate)}`;
            document.querySelectorAll(".bbb-logo").forEach(img => {
                img.src = data.logoUrl || "bbb_logo.svg";
            });

            // Rating Section
            document.querySelector(".grade").innerText = data.bbbRating || "-";
            document.querySelector(".view-btn").href = data.profileUrl || "#";
            document.querySelector(".reason-link").href = data.profileUrl || "#";

            // Reviews
            const avgRating = Number(data.reviews?.averageReviewStarRating || 0).toFixed(1);
            const totalReviews = data.reviews?.totalCustomReviews || 0;

            const ratingNumEl = document.querySelector(".rating-number");
            const captionEl = document.querySelector(".caption");
            const starsEl = document.querySelector(".star-rating");

            ratingNumEl.innerText = `${avgRating}/5`;
            captionEl.innerText = `Average of ${totalReviews} Customer Reviews`;

            // Clear old stars
            starsEl.querySelectorAll(".star").forEach(star => star.remove());

            const fullStars = Math.floor(avgRating);
            const halfStar = avgRating - fullStars >= 0.5 ? 1 : 0;
            const emptyStars = 5 - fullStars - halfStar;

            for (let i = 0; i < fullStars; i++) {
                const span = document.createElement("span");
                span.className = "star full";
                starsEl.insertBefore(span, ratingNumEl);
            }
            if (halfStar) {
                const span = document.createElement("span");
                span.className = "star half";
                starsEl.insertBefore(span, ratingNumEl);
            }
            for (let i = 0; i < emptyStars; i++) {
                const span = document.createElement("span");
                span.className = "star empty";
                starsEl.insertBefore(span, ratingNumEl);
            }

            // Complaints
            document.querySelector(".complaint-box").innerHTML = `
                <p class="rating-label">Customer Complaint Summary</p>
                <p><strong>${data.reviews?.totalClosedComplaintsPastTwelveMonths || 0}</strong> complaints closed in the<br>last 12 months.</p>
                <p><strong>${data.reviews?.totalClosedComplaintsPastThreeYears || 0}</strong> total complaints in the<br>last 3 years.</p>
            `;
        });
    });
});

function formatDateUS(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return isNaN(date)
        ? "-"
        : date.toLocaleDateString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
          });
}
