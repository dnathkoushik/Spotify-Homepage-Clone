/* eslint-disable no-console */
const express = require("express");
const searchYouTube = require("yt-search");
const cors = require("cors");
const path = require("path");

const server = express();
const SERVER_PORT = 3000;

// Middleware setup
server.use(cors());
server.use(express.static(path.resolve(__dirname)));

// Home route – serves frontend file
server.get("/", (request, response) => {
    response.sendFile(path.resolve(__dirname, "index.html"));
});

// YouTube search endpoint
server.get("/search", async (request, response) => {
    const searchTerm = request.query.q;

    if (!searchTerm) {
        return response.status(400).json({
            message: "Search query is required"
        });
    }

    try {
        const searchResult = await searchYouTube(searchTerm);

        const videoList = (searchResult.videos || [])
            .slice(0, 20)
            .map(item => ({
                videoId: item.videoId,
                title: item.title,
                thumbnailUrl: item.thumbnail,
                channelName: item.author?.name || "Unknown",
                length: item.timestamp,
                totalViews: item.views
            }));

        return response.status(200).json(videoList);

    } catch (err) {
        console.error("Error while fetching videos:", err.message);
        return response.status(500).json({
            message: "Unable to fetch search results"
        });
    }
});

// Start server
server.listen(SERVER_PORT, () => {
    console.log(`Application running at http://localhost:${SERVER_PORT}`);
});