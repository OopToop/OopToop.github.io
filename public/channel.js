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

async function uploadChannelImage(file, kind, channelName) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("type", kind === "banner" ? "banner" : "avatar");

    const response = await fetch(`/api/channel/${encodeURIComponent(channelName)}/image`, {
        method: "POST",
        body: formData
    });

    const result = await response.json();
    if (result.success) {
        window.location.reload();
    }
}

const params = new URLSearchParams(window.location.search);
const name = params.get("name");
const videosSection = document.querySelector(".channel-videos");
const videoContainer = document.getElementById("videos");
const channelContainer = document.getElementById("channel");

if (!name) {
    fetch("/api/channels")
        .then(res => res.json())
        .then(channels => {
            const sortedChannels = [...channels].sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0));

            if (videosSection) {
                videosSection.style.display = "none";
            }

            channelContainer.innerHTML = `
                <div class="channel-directory">
                    <h1>Channels</h1>
                    <p>Browse creators by subscriber count.</p>
                    <div class="channel-directory__list">
                        ${sortedChannels.map(channel => `
                            <a class="channel-directory__item" href="/channel.html?name=${encodeURIComponent(channel.name)}">
                                <img class="channel-directory__avatar" src="${channel.profilePicture || "/logo.png"}" alt="${channel.name}">
                                <div class="channel-directory__meta">
                                    <div class="channel-directory__name">${channel.name}</div>
                                    <div class="channel-directory__subscribers">${formatCompactNumber(channel.subscribers || 0)} subscribers</div>
                                </div>
                            </a>
                        `).join("")}
                    </div>
                </div>
            `;
        });
} else {
    fetch("/api/channels/" + name)
        .then(res => res.json())
        .then(channel => {
            const banner = channel.banner || "/fallback.jpg";
            const profilePicture = channel.profilePicture || "/logo.png";

            channelContainer.innerHTML = `
                <div class="channel-hero__banner" style="background-image: url('${banner}')"></div>
                <div class="channel-hero__content">
                    <label class="channel-hero__image-upload channel-hero__image-upload--avatar" title="Upload profile picture">
                        <input type="file" accept="image/*" data-kind="avatar">
                        <img class="channel-hero__avatar" src="${profilePicture}" alt="${channel.name}">
                    </label>
                    <div class="channel-hero__info">
                        <h1>${channel.name}</h1>
                        <p>${channel.description || "No description yet."}</p>
                        <p>${formatCompactNumber(channel.subscribers || 0)} subscribers</p>
                    </div>
                </div>
            `;

            const bannerEl = channelContainer.querySelector(".channel-hero__banner");
            if (bannerEl) {
                bannerEl.addEventListener("click", () => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "image/*";
                    input.onchange = async () => {
                        const file = input.files?.[0];
                        if (!file) return;
                        await uploadChannelImage(file, "banner", channel.name);
                    };
                    input.click();
                });
            }

            channelContainer.querySelector("input[data-kind='avatar']")?.addEventListener("change", async event => {
                const file = event.target.files?.[0];
                if (!file) return;
                await uploadChannelImage(file, "avatar", channel.name);
            });
        });

    fetch("/api/videos")
        .then(res => res.json())
        .then(videos => {
            const filtered = videos.filter(video =>
                video.channel &&
                video.channel.toLowerCase() === name.toLowerCase()
            );

            if (filtered.length === 0) {
                videoContainer.innerHTML = '<p class="empty-state">No videos yet for this channel.</p>';
                return;
            }

            filtered.forEach(video => {
                const videoId = encodeURIComponent(video.id || video.name.replace(/\.mp4$/i, ""));
                const watchHref = `/watch.html?id=${videoId}`;

                videoContainer.innerHTML += `
                    <div class="card">
                        <a class="card__video-link" href="${watchHref}">
                            <img class="thumb" src="${video.thumbnailPath}">
                        </a>
                        <div class="card__body">
                            <a class="title-link" href="${watchHref}">${video.name}</a>
                            <div class="stats">
                                ${formatCompactNumber(video.views)} views • ${formatCompactNumber(video.likes)} likes • ${video.date || "Unknown date"}
                            </div>
                        </div>
                    </div>
                `;
            });
        });
}
