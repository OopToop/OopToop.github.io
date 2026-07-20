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

const params = new URLSearchParams(window.location.search);
const videoId = params.get("id");

if (!videoId) {
    window.location.href = "/";
}

const player = document.getElementById("player");
const titleEl = document.getElementById("title");
const channelEl = document.getElementById("channel");
const statsEl = document.getElementById("stats");
const descriptionEl = document.getElementById("description");
const commentsEl = document.getElementById("comments");
const commentBox = document.getElementById("commentBox");
const likeButton = document.getElementById("likeButton");
const mehButton = document.getElementById("mehButton");
const thumbsDownButton = document.getElementById("thumbsDownButton");
const subscribeButton = document.getElementById("subscribeButton");

async function loadVideo() {
    const response = await fetch(`/api/video/${encodeURIComponent(videoId)}`);
    const video = await response.json();

    if (!video || video.error) {
        window.location.href = "/";
        return;
    }

    titleEl.textContent = video.name;
    player.src = `/library/videos/${video.id}.mp4`;
    descriptionEl.textContent = video.description || "";

    fetch(`/api/video/${videoId}/view`, { method: "POST" }).catch(() => {});

    const channelRes = await fetch(`/api/channels/${encodeURIComponent(video.channel)}`);
    const channelData = await channelRes.json();

    channelEl.innerHTML = `
        <a class="channel" href="/channel.html?name=${encodeURIComponent(video.channel)}">${video.channel}</a>
        <span>${formatCompactNumber(channelData.subscribers || 0)} subscribers</span>
    `;

    statsEl.innerHTML = `
        <span>${formatCompactNumber(video.views || 0)} views</span>
        <span>${formatCompactNumber(video.likes || 0)} likes</span>
        <span>${formatCompactNumber(video.mehs || 0)} mehs</span>
        <span>${formatCompactNumber(video.thumbsDowns || 0)} thumbs downs</span>
    `;

    commentsEl.innerHTML = (video.comments || []).map(comment => `
        <div class="comment">
            <strong>${comment.author}</strong>
            <div>${comment.text}</div>
        </div>
    `).join("");
}

likeButton?.addEventListener("click", async () => {
    await fetch(`/api/video/${encodeURIComponent(videoId)}/like`, { method: "POST" });
    await loadVideo();
});

mehButton?.addEventListener("click", async () => {
    await fetch(`/api/video/${encodeURIComponent(videoId)}/meh`, { method: "POST" });
    await loadVideo();
});

thumbsDownButton?.addEventListener("click", async () => {
    await fetch(`/api/video/${encodeURIComponent(videoId)}/thumbs-down`, { method: "POST" });
    await loadVideo();
});

subscribeButton?.addEventListener("click", async () => {
    await fetch(`/api/channel/${encodeURIComponent(document.querySelector("#channel a")?.textContent || "")}/subscribe`, { method: "POST" });
    await loadVideo();
});

document.getElementById("postComment")?.addEventListener("click", async () => {
    const author = prompt("What name should be displayed?");
    const text = commentBox.value.trim();

    if (!author || !text) return;

    await fetch(`/api/video/${encodeURIComponent(videoId)}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author, text })
    });

    commentBox.value = "";
    await loadVideo();
});

loadVideo();
