/* eslint-disable no-console */
const express = require("express");
const ytSearch = require("yt-search");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname, '')));

// Serve the frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Search API
app.get("/search", async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: "No query provided" });
        }
        
        const results = await ytSearch(query);
        const videos = results.videos.slice(0, 20).map(video => ({
            id: video.videoId,
            title: video.title,
            thumbnail: video.thumbnail,
            author: video.author.name,
            duration: video.timestamp,
            views: video.views
        }));
        
        res.json(videos);
    } catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ error: "Failed to search" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
