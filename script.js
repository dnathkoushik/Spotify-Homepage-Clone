document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       GLOBAL STATE
    ========================================================== */

    let ytPlayer = null;
    let progressTimer = null;

    let queue = [];
    let queueIndex = -1;

    let shuffleEnabled = false;
    let repeatState = "none"; // none | all | single
    let backupQueue = [];

    let activeVideo = null;
    let likedMap = JSON.parse(localStorage.getItem("spotify_liked_songs")) || {};
    let playlists = JSON.parse(localStorage.getItem("spotify_playlists")) || {};

    const PLAY_ICON = "./assets/player_icon3.png";
    const PAUSE_ICON = "./assets/play_musicbar.png";

    /* =========================================================
       TOAST SYSTEM
    ========================================================== */

    const toastRoot = document.getElementById("toast-container");

    function notify(msg, type = "default", duration = 2500) {
        if (!toastRoot) return;

        const box = document.createElement("div");
        box.className = `toast ${type}`;
        box.textContent = msg;

        toastRoot.appendChild(box);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => box.classList.add("show"));
        });

        setTimeout(() => {
            box.classList.remove("show");
            box.addEventListener("transitionend", () => box.remove(), { once: true });
        }, duration);
    }

    /* =========================================================
       LOCAL FILE WARNING
    ========================================================== */

    if (window.location.protocol === "file:") {
        const warning = document.createElement("div");
        warning.style.cssText = `
            position:fixed; top:0; left:0; width:100%;
            background:red; color:white; padding:10px;
            text-align:center; z-index:10000;
        `;
        warning.textContent = "⚠ Open http://localhost:3000 to use this app.";
        document.body.prepend(warning);
    }

    /* =========================================================
       YOUTUBE API LOADER
    ========================================================== */

    function loadYTScript() {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
        ytPlayer = new YT.Player("youtube-player", {
            height: "1",
            width: "1",
            videoId: "",
            playerVars: {
                playsinline: 1,
                controls: 0,
                autoplay: 1
            },
            events: {
                onReady: handlePlayerReady,
                onStateChange: handlePlayerState,
                onError: e => console.error("YT Error:", e.data)
            }
        });
    };

    function handlePlayerReady() {
        const volumeSlider = document.getElementById("volume-slider");
        if (!volumeSlider) return;

        volumeSlider.addEventListener("input", e => {
            const value = (e.target.value / 15) * 100;
            ytPlayer.setVolume(value);
        });
    }

    function handlePlayerState(e) {
        const playBtn = document.querySelector(".controls .play");

        if (e.data === YT.PlayerState.PLAYING) {
            if (playBtn) playBtn.src = PAUSE_ICON;
            beginProgressTracking();
        }
        else if (e.data === YT.PlayerState.ENDED) {
            stopProgressTracking();
            if (repeatState === "single") {
                ytPlayer.seekTo(0, true);
                ytPlayer.playVideo();
            } else {
                nextTrack();
            }
        }
        else {
            if (playBtn) playBtn.src = PLAY_ICON;
            stopProgressTracking();
        }
    }

    loadYTScript();

    /* =========================================================
       PROGRESS BAR
    ========================================================== */

    function beginProgressTracking() {
        stopProgressTracking();

        progressTimer = setInterval(() => {
            if (!ytPlayer) return;

            const current = ytPlayer.getCurrentTime();
            const total = ytPlayer.getDuration();

            updateProgress(current, total);
        }, 1000);
    }

    function stopProgressTracking() {
        if (progressTimer) clearInterval(progressTimer);
    }

    function updateProgress(current, total) {
        const slider = document.querySelector(".musictrack .track");
        const timeLabels = document.querySelectorAll(".musictrack span");

        if (slider && total > 0) {
            slider.value = (current / total) * 100;
        }

        if (timeLabels.length >= 2) {
            timeLabels[0].textContent = formatTime(current);
            timeLabels[1].textContent = formatTime(total);
        }
    }

    function formatTime(sec) {
        if (!sec) return "0:00";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? "0" : ""}${s}`;
    }

    /* =========================================================
       PLAYBACK CONTROL
    ========================================================== */

    function togglePlay() {
        if (!ytPlayer) return;

        const state = ytPlayer.getPlayerState();
        state === YT.PlayerState.PLAYING
            ? ytPlayer.pauseVideo()
            : ytPlayer.playVideo();
    }

    function playVideo(video) {
        activeVideo = video;

        const img = document.querySelector(".playingsongimg img");
        const title = document.querySelector(".playingsonginfo .p1");
        const artist = document.querySelector(".playingsonginfo .p2");

        if (img) img.src = video.thumbnail;
        if (title) title.innerHTML = `<a href="#">${video.title}</a>`;
        if (artist) artist.innerHTML = `<a href="#" class="opacity">${video.author}</a>`;

        const idx = queue.findIndex(v => v.id === video.id);
        if (idx !== -1) queueIndex = idx;

        if (ytPlayer) ytPlayer.loadVideoById(video.id);

        updateHeartUI(video.id);
    }

    function nextTrack() {
        if (queue.length === 0) return;

        if (repeatState === "all") {
            queueIndex = (queueIndex + 1) % queue.length;
        } else {
            if (queueIndex + 1 >= queue.length) return;
            queueIndex++;
        }

        playVideo(queue[queueIndex]);
    }

    function previousTrack() {
        if (!ytPlayer) return;

        if (ytPlayer.getCurrentTime() > 3) {
            ytPlayer.seekTo(0, true);
            return;
        }

        queueIndex = (queueIndex - 1 + queue.length) % queue.length;
        playVideo(queue[queueIndex]);
    }

    /* =========================================================
       LIKE SYSTEM
    ========================================================== */

    function saveLikes() {
        localStorage.setItem("spotify_liked_songs", JSON.stringify(likedMap));
        updateLikeCount();
    }

    function updateLikeCount() {
        const el = document.getElementById("liked-songs-count");
        if (!el) return;

        const n = Object.keys(likedMap).length;
        el.textContent = `${n} song${n !== 1 ? "s" : ""}`;
    }

    function updateHeartUI(id) {
        const heart = document.getElementById("heart-btn");
        if (!heart) return;

        if (likedMap[id]) {
            heart.classList.remove("fa-regular");
            heart.classList.add("fa-solid");
        } else {
            heart.classList.remove("fa-solid");
            heart.classList.add("fa-regular");
        }
    }

    document.getElementById("heart-btn")?.addEventListener("click", () => {
        if (!activeVideo) {
            notify("No track playing");
            return;
        }

        const id = activeVideo.id;

        if (likedMap[id]) {
            delete likedMap[id];
            notify("Removed from liked songs");
        } else {
            likedMap[id] = activeVideo;
            notify("Added to liked songs", "success");
        }

        saveLikes();
        updateHeartUI(id);
    });

    updateLikeCount();

    /* =========================================================
       PLAYLIST SYSTEM
    ========================================================== */

    function savePlaylistData() {
        localStorage.setItem("spotify_playlists", JSON.stringify(playlists));
    }

    function createPlaylist() {
        const name = prompt("Playlist name:");
        if (!name) return;

        if (playlists[name]) {
            alert("Playlist already exists");
            return;
        }

        playlists[name] = [];
        savePlaylistData();
        renderSidebarPlaylists();
    }

    function renderSidebarPlaylists() {
        const container = document.getElementById("playlist-list");
        if (!container) return;

        container.innerHTML = "";

        Object.keys(playlists).forEach(name => {
            const item = document.createElement("div");
            item.className = "sidebar-playlist-item";
            item.textContent = name;

            item.onclick = () => showPlaylist(name);
            container.appendChild(item);
        });
    }

    function showPlaylist(name) {
        const panel = document.getElementById("search-view");
        if (!panel) return;

        panel.innerHTML = `<h2 style="margin:20px;">Playlist: ${name}</h2>`;

        playlists[name].forEach(video => {
            const card = buildCard(video);
            panel.appendChild(card);
        });
    }

    function addToPlaylist(video) {
        const names = Object.keys(playlists);
        if (names.length === 0) {
            notify("Create a playlist first", "error");
            return;
        }

        const target = prompt(`Add to which playlist?\n${names.join("\n")}`);
        if (!target || !playlists[target]) return;

        const exists = playlists[target].find(v => v.id === video.id);
        if (exists) {
            notify("Already exists", "error");
            return;
        }

        playlists[target].push(video);
        savePlaylistData();
        notify(`Added to ${target}`, "success");
    }

    /* =========================================================
       SEARCH
    ========================================================== */

    const searchInput = document.getElementById("search-input");

    async function executeSearch(query) {
        const panel = document.getElementById("search-view");
        if (!panel) return;

        panel.innerHTML = "<h2 style='margin:20px;'>Searching...</h2>";

        try {
            const res = await fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`);
            const results = await res.json();

            queue = [...results];
            queueIndex = -1;

            panel.innerHTML = "<h2 style='margin:20px;'>Search Results</h2>";
            results.forEach(video => panel.appendChild(buildCard(video)));

        } catch (err) {
            panel.innerHTML = `<h2>Error loading results</h2>`;
        }
    }

    searchInput?.addEventListener("keypress", e => {
        if (e.key === "Enter" && searchInput.value) {
            executeSearch(searchInput.value);
        }
    });

    /* =========================================================
       CARD BUILDER
    ========================================================== */

    function buildCard(video) {
        const card = document.createElement("div");
        card.className = "card-result";
        card.dataset.id = video.id;

        card.innerHTML = `
            <img src="${video.thumbnail}" style="width:100%; border-radius:4px; aspect-ratio:1; object-fit:cover; margin-bottom:16px;">
            <h3 style="font-size:16px; font-weight:700; margin-bottom:8px;">${video.title}</h3>
            <p style="font-size:14px; color:#a7a7a7;">${video.author}</p>
        `;

        card.onclick = () => playVideo(video);

        return card;
    }

    /* =========================================================
       CONTROL BUTTON BINDINGS
    ========================================================== */

    document.querySelector(".controls .play")?.addEventListener("click", togglePlay);
    document.querySelector(".controls img[src*='player_icon2']")?.addEventListener("click", previousTrack);
    document.querySelector(".controls img[src*='player_icon4']")?.addEventListener("click", nextTrack);

    document.getElementById("create-playlist-btn")?.addEventListener("click", createPlaylist);

    renderSidebarPlaylists();
});