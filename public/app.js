function formatCompactNumber(value) {
    const num = Number(value) || 0;
    const abs = Math.abs(num);

    if (abs >= 1000000000) {
        return (num / 1000000000).toFixed(abs >= 10000000000 ? 0 : 1).replace(/\.0$/, "") + "B";
    }

    if (abs >= 1000000) {
        return (num / 1000000).toFixed(abs >= 10000000 ? 0 : 1).replace(/\.0$/, "") + "M";
    }

    if (abs >= 1000) {
        return (num / 1000).toFixed(abs >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K";
    }

    return num.toString();
}

function parseVideoDate(dateString) {
    if (!dateString) {
        return 0;
    }

    const normalized = String(dateString).trim();
    const parts = normalized.split(/[-/]/).map(value => Number(value));

    if (parts.length === 3 && parts.every(Number.isFinite)) {
        const [first, second, third] = parts;

        if (first > 12 && second <= 12 && third <= 31) {
            return new Date(first, second - 1, third).getTime();
        }

        if (second > 12 && first <= 12 && third <= 31) {
            return new Date(third, first - 1, second).getTime();
        }

        if (third > 12 && first <= 12 && second <= 31) {
            return new Date(third, first - 1, second).getTime();
        }
    }

    const parsed = Date.parse(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
}

const searchInput = document.querySelector(".topbar__search");
const popularitySection = document.getElementById("popularitySection");
const rerollSelectionSection = document.getElementById("rerollSelectionSection");
const uploadForm = document.getElementById("uploadForm");
const uploadMode = document.getElementById("uploadMode");
const oldVideoSection = document.getElementById("oldVideoSection");
const rerollVideoSelect = document.getElementById("rerollVideoSelect");
const channelInput = document.getElementById("channelInput");
const uploadDateInput = document.querySelector('input[name="uploadDate"]');
const videoInput = document.getElementById("videoInput");
const thumbnailInput = document.getElementById("thumbnailInput");

function updatePopularitySection() {
    if (!searchInput || !popularitySection || !uploadMode) {
        return;
    }

    const isUploadPage = window.location.pathname.endsWith("/upload.html");
    const shouldShow = isUploadPage && (
        searchInput.value.trim().toLowerCase().includes("popularity") ||
        uploadMode.value === "reroll"
    );

    popularitySection.hidden = !shouldShow;
    if (rerollSelectionSection) {
        rerollSelectionSection.hidden = !shouldShow || uploadMode.value !== "reroll";
    }
}

function updateUploadModeUI() {
    const reroll = uploadMode?.value === "reroll";

    if (oldVideoSection) {
        oldVideoSection.hidden = !reroll;
    }

    if (channelInput) {
        channelInput.disabled = reroll;
        channelInput.required = !reroll;
    }

    if (uploadDateInput) {
        uploadDateInput.disabled = reroll;
        uploadDateInput.required = !reroll;
    }

    if (videoInput) {
        videoInput.disabled = reroll;
        videoInput.required = !reroll;
    }

    if (thumbnailInput) {
        thumbnailInput.disabled = reroll;
        thumbnailInput.required = !reroll;
    }

    document.querySelectorAll("[data-reroll-stat]").forEach(check => {
        check.disabled = !reroll;
    });

    updatePopularitySection();
}

async function populateRerollVideoSelect() {
    if (!rerollVideoSelect) {
        return;
    }

    const response = await fetch("/api/videos");
    const videos = await response.json();

    rerollVideoSelect.innerHTML = '<option value="">Select a video</option>' + videos.map(video => {
        const safeName = video.name || video.id;
        return `<option value="${video.id}">${safeName}</option>`;
    }).join("");
}

searchInput?.addEventListener("input", updatePopularitySection);
uploadMode?.addEventListener("change", () => {
    updateUploadModeUI();
    if (uploadMode?.value === "reroll") {
        populateRerollVideoSelect();
    }
});
window.addEventListener("pageshow", () => {
    if (searchInput) {
        searchInput.value = "";
    }
    updateUploadModeUI();
});
updateUploadModeUI();

uploadForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const mode = formData.get("mode")?.toString() || "new";

    if (mode === "reroll") {
        const videoId = formData.get("videoId")?.toString().trim();
        const popularity = formData.get("popularity")?.toString().trim();
        const rerollSelections = {};

        document.querySelectorAll("[data-reroll-stat]").forEach(check => {
            rerollSelections[check.dataset.rerollStat] = check.checked;
        });

        if (!videoId) {
            alert("Please choose an old video to reroll.");
            return;
        }

        const response = await fetch("/api/reroll-video-stats", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                videoId,
                popularity,
                reroll: rerollSelections
            })
        });

        const result = await response.json();

        if (result.success) {
            alert("Video stats rerolled successfully.");
            window.location.href = "/";
        } else {
            alert(result.error || "Unable to reroll video stats.");
        }

        return;
    }

    const channelName = formData.get("channel")?.toString().trim();

    if (!channelName) {
        alert("Please enter a channel name.");
        return;
    }

    const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
    });

    const result = await response.json();

    if (result.success) {
        alert(`Video uploaded to ${channelName}!`);
        window.location.href = "/";
    }
});

fetch("/api/videos")
    .then(res => res.json())
    .then(videos => {
        const grid = document.createElement("div");
        grid.className = "grid";

        const container = document.getElementById("content");
        const sortedVideos = [...videos].sort((a, b) => parseVideoDate(b.date) - parseVideoDate(a.date));

        sortedVideos.forEach(video => {
            const card = document.createElement("div");
            card.className = "card";

            const displayName = video.name.replace(/\.mp4$/i, "");
            const channelName = video.channel || "Unknown Channel";
            const channelHref = "/channel.html?name=" + encodeURIComponent(channelName);

            const videoId = encodeURIComponent(video.id || video.name.replace(/\.mp4$/i, ""));

            card.innerHTML = `
                <a class="card__video-link" href="/watch.html?id=${videoId}">
                    <img class="thumb" src="${video.thumbnailPath}">
                </a>
                <div class="card__body">
                    <a class="title-link" href="/watch.html?id=${videoId}">${displayName}</a>
                    <a class="channel" href="${channelHref}">${channelName}</a>
                    <div class="stats">
                        ${formatCompactNumber(video.views)} views • ${formatCompactNumber(video.likes)} likes • ${video.date || "Unknown date"}
                    </div>
                </div>
            `;

            grid.appendChild(card);
        });

        if (container) {
            container.innerHTML = "";
            container.appendChild(grid);
        } else {
            document.body.appendChild(grid);
        }
    });