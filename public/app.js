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

const uploadForm = document.getElementById("uploadForm");

uploadForm?.addEventListener("submit", async event => {
    event.preventDefault();

    const formData = new FormData(event.target);
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

        videos.forEach(video => {
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