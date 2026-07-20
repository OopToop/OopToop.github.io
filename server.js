const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { exec } = require("child_process");

const app = express();
const PORT = 6700;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/library", express.static(path.join(__dirname, "library")));
app.use("/library/thumbnails", express.static(path.join(__dirname, "library/thumbnails")));

const upload = multer({ dest: path.join(__dirname, "temp") });

function createMetadata(file) {
    const baseName = path.parse(file).name;
    const metadataPath = path.join(
        __dirname,
        "library/metadata",
        baseName + ".json"
    );

    if (!fs.existsSync(metadataPath)) {
        const tierRoll = Math.random();
        let tier;

        if (tierRoll < 0.3) {
            tier = Math.random() < 0.5 ? 1 : 2;
        } else if (tierRoll < 0.8) {
            tier = Math.floor(Math.random() * 4) + 3;
        } else if (tierRoll < 0.95) {
            tier = 7;
        } else {
            tier = Math.random() < 0.5 ? 8 : 9;
        }

        let views;
        let likes;
        let mehs;
        let thumbsDowns;

        if (tier === 1) {
            views = Math.floor(Math.random() * 901) + 100;
        } else if (tier === 2) {
            views = Math.floor(Math.random() * 9001) + 1000;
        } else if (tier === 3) {
            views = Math.floor(Math.random() * 15001) + 10000;
        } else if (tier === 4) {
            views = Math.floor(Math.random() * 75001) + 26000;
        } else if (tier === 5) {
            views = Math.floor(Math.random() * 900000) + 100000;
        } else if (tier === 6) {
            views = Math.floor(Math.random() * 9000001) + 1000000;
        } else if (tier === 7) {
            views = Math.floor(Math.random() * 90000001) + 10000000;
        } else if (tier === 8) {
            views = Math.floor(Math.random() * 900000001) + 100000000;
        } else {
            views = Math.floor(Math.random() * 4000000001) + 1000000000;
        }

        const ratio = [5, 4, 3, 2][Math.floor(Math.random() * 4)];
        likes = Math.floor(views / ratio);
        mehs = Math.floor(views / (ratio + 2));
        thumbsDowns = Math.floor(views / (ratio + 4));

        const now = new Date();
        const date = [
            now.getMonth() + 1,
            now.getDate(),
            now.getFullYear()
        ].map(value => String(value).padStart(2, "0")).join("-");

        const metadata = {
            id: baseName,
            name: baseName.replace(/_/g, " "),
            views: views,
            likes: likes,
            mehs: mehs,
            thumbsDowns: thumbsDowns,
            channel: "Unknown",
            description: "",
            comments: [],
            date: date
        };

        fs.writeFileSync(
            metadataPath,
            JSON.stringify(metadata, null, 4)
        );
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath));
    const views = Number(metadata.views) || 0;
    const likes = Number(metadata.likes) || 0;
    const mehs = Number(metadata.mehs) || 0;
    const thumbsDowns = Number(metadata.thumbsDowns) || 0;
    const shouldBackfillReactions = likes >= 1000000 || views >= 10000000;

    const normalized = {
        ...metadata,
        id: metadata.id || baseName,
        name: metadata.name || baseName.replace(/_/g, " "),
        views: views,
        likes: likes,
        mehs: shouldBackfillReactions && mehs < 10 ? 10 : mehs,
        thumbsDowns: shouldBackfillReactions && thumbsDowns < 10 ? 10 : thumbsDowns,
        subscribersGained: Number(metadata.subscribersGained) || 0,
        channel: metadata.channel || "Unknown",
        description: metadata.description || "",
        comments: metadata.comments || [],
        date: metadata.date || ""
    };

    fs.writeFileSync(metadataPath, JSON.stringify(normalized, null, 4));

    return normalized;
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

function generateVideoStats(popularity) {
    const popularityRanges = {
        low: [100, 999],
        medium: [1000, 9999],
        high: [10000, 99999],
        viral: [100000, 9999999],
        "super-viral": [10000000, 1000000000]
    };

    const tierRoll = Math.random();
    let tier;

    if (tierRoll < 0.3) {
        tier = Math.random() < 0.5 ? 1 : 2;
    } else if (tierRoll < 0.8) {
        tier = Math.floor(Math.random() * 4) + 3;
    } else if (tierRoll < 0.95) {
        tier = 7;
    } else {
        tier = Math.random() < 0.5 ? 8 : 9;
    }

    let views;
    if (popularityRanges[popularity]) {
        const [minViews, maxViews] = popularityRanges[popularity];
        views = Math.floor(Math.random() * (maxViews - minViews + 1)) + minViews;
    } else if (tier === 1) {
        views = Math.floor(Math.random() * 901) + 100;
    } else if (tier === 2) {
        views = Math.floor(Math.random() * 9001) + 1000;
    } else if (tier === 3) {
        views = Math.floor(Math.random() * 15001) + 10000;
    } else if (tier === 4) {
        views = Math.floor(Math.random() * 75001) + 26000;
    } else if (tier === 5) {
        views = Math.floor(Math.random() * 900000) + 100000;
    } else if (tier === 6) {
        views = Math.floor(Math.random() * 9000001) + 1000000;
    } else if (tier === 7) {
        views = Math.floor(Math.random() * 90000001) + 10000000;
    } else if (tier === 8) {
        views = Math.floor(Math.random() * 900000001) + 100000000;
    } else {
        views = Math.floor(Math.random() * 4000000001) + 1000000000;
    }

    const ratio = [5, 4, 3, 2][Math.floor(Math.random() * 4)];
    const likes = Math.floor(views / ratio);
    const mehs = Math.floor(views / (ratio + 2));
    const thumbsDowns = Math.floor(views / (ratio + 4));
    const subscribersGained = Math.floor(views / (ratio + 8));

    return {
        views,
        likes,
        mehs,
        thumbsDowns,
        subscribersGained
    };
}

function resolveChannelProfilePicture(channelName) {
    const channelFolder = path.join(__dirname, "library/channels", channelName);

    if (!fs.existsSync(channelFolder)) {
        return "/logo.png";
    }

    for (const fileName of ["icon.jpg", "icon.png"]) {
        const candidatePath = path.join(channelFolder, fileName);

        if (fs.existsSync(candidatePath)) {
            return "/library/channels/" + encodeURIComponent(channelName) + "/" + fileName;
        }
    }

    return "/logo.png";
}

function findMetadataById(videoId) {
    const metadataFolder = path.join(__dirname, "library/metadata");
    const directPath = path.join(metadataFolder, videoId + ".json");

    if (fs.existsSync(directPath)) {
        return JSON.parse(fs.readFileSync(directPath));
    }

    const files = fs.existsSync(metadataFolder) ? fs.readdirSync(metadataFolder) : [];

    for (const file of files) {
        if (!file.endsWith(".json")) continue;

        const metadataPath = path.join(metadataFolder, file);
        const metadata = JSON.parse(fs.readFileSync(metadataPath));

        if (metadata.id === videoId || path.parse(file).name === videoId) {
            return metadata;
        }
    }

    return null;
}

app.get("/api/videos", (req, res) => {
    const videoFolder = path.join(__dirname, "library/videos");

    fs.readdir(videoFolder, (err, files) => {
        if (err) return res.json([]);

        const videos = files
            .filter(file => file.endsWith(".mp4"))
            .map(file => {
                const baseName = path.parse(file).name;
                const metadata = createMetadata(file);
                const fileStats = fs.statSync(path.join(videoFolder, file));

                return {
                    id: metadata.id || baseName,
                    name: metadata.name || baseName.replace(/_/g, " "),
                    channel: metadata.channel || "Unknown",
                    views: Number(metadata.views) || 0,
                    likes: Number(metadata.likes) || 0,
                    date: metadata.date || "",
                    videoPath: "/library/videos/" + file,
                    thumbnailPath: "/library/thumbnails/" + baseName + ".jpg",
                    _sortDate: parseVideoDate(metadata.date) || fileStats.mtimeMs
                };
            })
            .sort((a, b) => (b._sortDate || 0) - (a._sortDate || 0));

        res.json(videos);
    });
});

app.get("/api/channels", (req, res) => {
    const channelFolder = path.join(__dirname, "library/channels");

    fs.readdir(channelFolder, (err, channels) => {
        if (err) return res.json([]);

        const data = channels.map(channel => {
            const file = path.join(
                channelFolder,
                channel,
                "channel.json"
            );

            if (fs.existsSync(file)) {
                const parsedChannel = JSON.parse(fs.readFileSync(file));
                parsedChannel.profilePicture = resolveChannelProfilePicture(channel);
                return parsedChannel;
            }

            return null;
        }).filter(Boolean);

        res.json(data);
    });
});

app.get("/api/channels/:name", (req, res) => {
    const channelName = req.params.name;

    const channelFile = path.join(
        __dirname,
        "library/channels",
        channelName,
        "channel.json"
    );

    if (!fs.existsSync(channelFile)) {
        return res.status(404).json({
            error: "Channel not found"
        });
    }

    const channel = JSON.parse(fs.readFileSync(channelFile));
    channel.profilePicture = resolveChannelProfilePicture(channelName);

    res.json(channel);
});

app.get("/api/video/:id", (req, res) => {
    const metadata = findMetadataById(req.params.id);

    if (!metadata) {
        return res.status(404).json({ error: "Video not found" });
    }

    res.json(metadata);
});

app.post("/api/video/:id/view", (req, res) => {
    const metadata = findMetadataById(req.params.id);

    if (!metadata) {
        return res.status(404).json({ error: "Video not found" });
    }

    const metadataFile = path.join(
        __dirname,
        "library/metadata",
        (metadata.id || req.params.id) + ".json"
    );

    metadata.views = (metadata.views || 0) + 1;
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 4));

    res.json({ success: true });
});

app.post("/api/video/:id/like", (req, res) => {
    const metadata = findMetadataById(req.params.id);

    if (!metadata) {
        return res.status(404).json({ error: "Video not found" });
    }

    const metadataFile = path.join(
        __dirname,
        "library/metadata",
        (metadata.id || req.params.id) + ".json"
    );

    metadata.likes = (metadata.likes || 0) + 1;
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 4));

    res.json({ success: true });
});

app.post("/api/video/:id/meh", (req, res) => {
    const metadata = findMetadataById(req.params.id);

    if (!metadata) {
        return res.status(404).json({ error: "Video not found" });
    }

    const metadataFile = path.join(
        __dirname,
        "library/metadata",
        (metadata.id || req.params.id) + ".json"
    );

    metadata.mehs = (metadata.mehs || 0) + 1;
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 4));

    res.json({ success: true });
});

app.post("/api/video/:id/thumbs-down", (req, res) => {
    const metadata = findMetadataById(req.params.id);

    if (!metadata) {
        return res.status(404).json({ error: "Video not found" });
    }

    const metadataFile = path.join(
        __dirname,
        "library/metadata",
        (metadata.id || req.params.id) + ".json"
    );

    metadata.thumbsDowns = (metadata.thumbsDowns || 0) + 1;
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 4));

    res.json({ success: true });
});

app.post("/api/video/:id/comment", (req, res) => {
    const metadata = findMetadataById(req.params.id);

    if (!metadata) {
        return res.status(404).json({ error: "Video not found" });
    }

    const metadataFile = path.join(
        __dirname,
        "library/metadata",
        (metadata.id || req.params.id) + ".json"
    );

    metadata.comments = metadata.comments || [];
    metadata.comments.push({
        author: req.body.author,
        text: req.body.text
    });
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 4));

    res.json({ success: true });
});

app.post("/api/channel/:name/subscribe", (req, res) => {
    const channelFile = path.join(
        __dirname,
        "library/channels",
        req.params.name,
        "channel.json"
    );

    if (!fs.existsSync(channelFile)) {
        return res.status(404).json({ error: "Channel not found" });
    }

    const channel = JSON.parse(fs.readFileSync(channelFile));
    channel.subscribers = (channel.subscribers || 0) + 1;
    fs.writeFileSync(channelFile, JSON.stringify(channel, null, 4));

    res.json({ success: true });
});

app.post("/api/channel/:name/image", upload.single("image"), (req, res) => {
    const channelName = req.params.name;
    const channelFolder = path.join(__dirname, "library/channels", channelName);
    const channelFile = path.join(channelFolder, "channel.json");

    if (!fs.existsSync(channelFolder)) {
        fs.mkdirSync(channelFolder, { recursive: true });
    }

    if (!fs.existsSync(channelFile)) {
        fs.writeFileSync(
            channelFile,
            JSON.stringify({
                name: channelName,
                description: "New channel",
                subscribers: 0,
                profilePicture: "/logo.png"
            }, null, 4)
        );
    }

    const imageFile = req.file;
    if (!imageFile) {
        return res.status(400).json({ error: "No image provided" });
    }

    const ext = path.extname(imageFile.originalname || "").toLowerCase();
    const targetName = req.body.type === "banner" ? "banner" + ext : "icon" + ext;
    const targetPath = path.join(channelFolder, targetName);

    if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
    }

    fs.renameSync(imageFile.path, targetPath);

    const channel = JSON.parse(fs.readFileSync(channelFile));
    if (req.body.type === "banner") {
        channel.banner = "/library/channels/" + encodeURIComponent(channelName) + "/" + path.basename(targetPath);
    } else {
        channel.profilePicture = "/library/channels/" + encodeURIComponent(channelName) + "/" + path.basename(targetPath);
    }

    fs.writeFileSync(channelFile, JSON.stringify(channel, null, 4));

    res.json({ success: true, path: channel.profilePicture || channel.banner });
});

app.post(
    "/api/upload",
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    (req, res) => {
        const title = req.body.title;
        const channel = req.body.channel;
        const uploadDate = req.body.uploadDate;
        const popularity = String(req.body.popularity || "").trim().toLowerCase();

        const channelFolder = path.join(__dirname, "library/channels", channel);
        if (!fs.existsSync(channelFolder)) {
            fs.mkdirSync(channelFolder, { recursive: true });
        }

        const channelFile = path.join(channelFolder, "channel.json");
        if (!fs.existsSync(channelFile)) {
            fs.writeFileSync(
                channelFile,
                JSON.stringify({
                    name: channel,
                    description: "New channel",
                    subscribers: 0,
                    profilePicture: "/logo.png"
                }, null, 4)
            );
        }

        const safeName = title
            .replace(/\s+/g, "_")
            .replace(/[^\w-]/g, "");

        const videoFile = req.files.video[0];
        const thumbnailFile = req.files.thumbnail[0];

        const videoPath = path.join(
            __dirname,
            "library/videos",
            safeName + ".mp4"
        );

        const thumbnailPath = path.join(
            __dirname,
            "library/thumbnails",
            safeName + ".jpg"
        );

        fs.renameSync(videoFile.path, videoPath);
        fs.renameSync(thumbnailFile.path, thumbnailPath);

        const { views, likes, mehs, thumbsDowns, subscribersGained } = generateVideoStats(popularity);

        const channelData = JSON.parse(fs.readFileSync(channelFile));
        channelData.subscribers = (channelData.subscribers || 0) + subscribersGained;
        fs.writeFileSync(channelFile, JSON.stringify(channelData, null, 4));

        const metadata = {
            id: safeName,
            name: title,
            channel: channel,
            uploadDate: uploadDate,
            popularity: popularity || "random",
            views: views,
            likes: likes,
            mehs: mehs,
            thumbsDowns: thumbsDowns,
            subscribersGained: subscribersGained,
            description: "",
            comments: [],
            date: uploadDate
        };

        fs.writeFileSync(
            path.join(
                __dirname,
                "library/metadata",
                safeName + ".json"
            ),
            JSON.stringify(metadata, null, 4)
        );

        res.json({ success: true });
    }
);

app.post("/api/reroll-video-stats", (req, res) => {
    const videoId = String(req.body.videoId || "").trim();
    const popularity = String(req.body.popularity || "").trim().toLowerCase();
    const reroll = req.body.reroll || {};
    const rerollViews = reroll.views !== false;
    const rerollLikes = reroll.likes !== false;
    const rerollMehs = reroll.mehs !== false;
    const rerollThumbsDowns = reroll.thumbsDowns !== false;
    const rerollSubscribers = reroll.subscribers !== false;

    const metadata = findMetadataById(videoId);

    if (!metadata) {
        return res.status(404).json({ error: "Video not found" });
    }

    const metadataFile = path.join(
        __dirname,
        "library/metadata",
        (metadata.id || videoId) + ".json"
    );

    const channelName = metadata.channel;
    const channelFile = path.join(__dirname, "library/channels", channelName, "channel.json");

    if (!fs.existsSync(channelFile)) {
        return res.status(404).json({ error: "Channel not found" });
    }

    const { views, likes, mehs, thumbsDowns, subscribersGained } = generateVideoStats(popularity);
    const previousSubscriberGain = Number(metadata.subscribersGained) || 0;

    const channelData = JSON.parse(fs.readFileSync(channelFile));
    if (rerollSubscribers) {
        channelData.subscribers = (channelData.subscribers || 0) + subscribersGained - previousSubscriberGain;
    }
    fs.writeFileSync(channelFile, JSON.stringify(channelData, null, 4));

    metadata.popularity = popularity || "random";
    metadata.views = rerollViews ? views : Number(metadata.views) || 0;
    metadata.likes = rerollLikes ? likes : Number(metadata.likes) || 0;
    metadata.mehs = rerollMehs ? mehs : Number(metadata.mehs) || 0;
    metadata.thumbsDowns = rerollThumbsDowns ? thumbsDowns : Number(metadata.thumbsDowns) || 0;
    metadata.subscribersGained = rerollSubscribers ? subscribersGained : previousSubscriberGain;
    fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 4));

    res.json({ success: true });
});

const allowedExtensions = [".mp4", ".webm", ".mov"];

app.listen(PORT, () => {
    console.log(`OopToop is running at http://localhost:${PORT}`);

    exec(`open http://localhost:${PORT}`);
});
