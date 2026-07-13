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
    const normalized = {
        ...metadata,
        id: metadata.id || baseName,
        name: metadata.name || baseName.replace(/_/g, " "),
        views: Number(metadata.views) || 0,
        likes: Number(metadata.likes) || 0,
        channel: metadata.channel || "Unknown",
        description: metadata.description || "",
        comments: metadata.comments || [],
        date: metadata.date || ""
    };

    fs.writeFileSync(metadataPath, JSON.stringify(normalized, null, 4));

    return normalized;
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

                return {
                    id: metadata.id || baseName,
                    name: metadata.name || baseName.replace(/_/g, " "),
                    channel: metadata.channel || "Unknown",
                    views: Number(metadata.views) || 0,
                    likes: Number(metadata.likes) || 0,
                    date: metadata.date || "",
                    videoPath: "/library/videos/" + file,
                    thumbnailPath: "/library/thumbnails/" + baseName + ".jpg"
                };
            });

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
        const likes = Math.floor(views / ratio);

        let subscriberGain;
        if (tier === 1) {
            subscriberGain = Math.floor(Math.random() * 10) + 1;
        } else if (tier === 2) {
            subscriberGain = Math.floor(Math.random() * 91) + 10;
        } else if (tier === 3) {
            subscriberGain = Math.floor(Math.random() * 201) + 50;
        } else if (tier === 4) {
            subscriberGain = Math.floor(Math.random() * 501) + 200;
        } else if (tier === 5) {
            subscriberGain = Math.floor(Math.random() * 2001) + 1000;
        } else if (tier === 6) {
            subscriberGain = Math.floor(Math.random() * 9001) + 5000;
        } else if (tier === 7) {
            subscriberGain = Math.floor(Math.random() * 50001) + 20000;
        } else if (tier === 8) {
            subscriberGain = Math.floor(Math.random() * 100001) + 50000;
        } else {
            subscriberGain = Math.floor(Math.random() * 250001) + 100000;
        }

        const channelData = JSON.parse(fs.readFileSync(channelFile));
        channelData.subscribers = (channelData.subscribers || 0) + subscriberGain;
        fs.writeFileSync(channelFile, JSON.stringify(channelData, null, 4));

        const metadata = {
            id: safeName,
            name: title,
            channel: channel,
            uploadDate: uploadDate,
            views: views,
            likes: likes,
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

const allowedExtensions = [".mp4", ".webm", ".mov"];

app.listen(PORT, () => {
    console.log(`OopToop is running at http://localhost:${PORT}`);

    exec(`open http://localhost:${PORT}`);
});
