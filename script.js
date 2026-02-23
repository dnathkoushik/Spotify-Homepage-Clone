document.addEventListener("DOMContentLoaded", () => {

    // ─── Toast Notification System ────────────────────────────────────────
    const toastContainer = document.getElementById("toast-container");
    function showToast(message, type = "default", duration = 2500) {
        if (!toastContainer) return;
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => toast.classList.add("show"));
        });
        // Animate out and remove
        setTimeout(() => {
            toast.classList.remove("show");
            toast.addEventListener("transitionend", () => toast.remove(), { once: true });
        }, duration);
    }

    // Check if running on file:// protocol
    if (window.location.protocol === 'file:') {
        const banner = document.createElement("div");
        banner.style.position = "fixed";
        banner.style.top = "0";
        banner.style.left = "0";
        banner.style.width = "100%";
        banner.style.backgroundColor = "red";
        banner.style.color = "white";
        banner.style.textAlign = "center";
        banner.style.padding = "10px";
        banner.style.zIndex = "10000";
        banner.innerText = "⚠️ APP ERROR: Please open http://localhost:3000 to play music.";
        document.body.prepend(banner);
    }
    // 1. Inject YouTube Iframe API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // 2. Setup Player State
    // Make player globally accessible
    window.player = null;
    let updateInterval;

    // --- Song Queue ---
    let songQueue = [];        // Array of video objects currently loaded
    let currentQueueIndex = -1; // Index of the currently playing song

    // --- Playback Modes ---
    let isShuffled = false;
    let repeatMode = 'none'; // 'none' | 'all' | 'one'
    let originalQueue = []; // backup of queue before shuffle

    window.onYouTubeIframeAPIReady = function () {
        console.log("Initializing YT Player...");
        window.player = new YT.Player('youtube-player', {
            height: '1',
            width: '1',
            videoId: '', // Start empty
            playerVars: {
                'playsinline': 1,
                'controls': 0,
                'autoplay': 1 // Attempt autoplay
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    };

    function onPlayerError(event) {
        console.error("YouTube Player Error:", event.data);
    }

    function onPlayerReady(event) {
        console.log("Player Ready");
        const volumeSlider = document.getElementById("volume-slider");
        if (volumeSlider) {
            volumeSlider.addEventListener("input", (e) => {
                if (window.player && window.player.setVolume) {
                    const vol = (e.target.value / 15) * 100;
                    window.player.setVolume(vol);
                    isMuted = false;
                    muteBtn && muteBtn.classList.remove("muted");
                }
            });
        }
    }

    // Play/pause icon: player_icon3.png = play, play_musicbar.png = pause
    const PLAY_ICON = "./assets/player_icon3.png";
    const PAUSE_ICON = "./assets/play_musicbar.png";

    function onPlayerStateChange(event) {
        const playBtn = document.querySelector(".controls .play");

        if (event.data == YT.PlayerState.PLAYING) {
            if (playBtn) playBtn.src = PAUSE_ICON; // Show pause icon when playing
            startProgressLoop();
        } else if (event.data == YT.PlayerState.ENDED) {
            if (playBtn) playBtn.src = PLAY_ICON;
            stopProgressLoop();
            if (repeatMode === 'one') {
                window.player.seekTo(0, true);
                window.player.playVideo();
            } else {
                playNextTrack();
            }
        } else {
            // Paused or buffering
            if (playBtn) playBtn.src = PLAY_ICON;
            stopProgressLoop();
        }
    }

    function startProgressLoop() {
        stopProgressLoop();
        updateInterval = setInterval(() => {
            if (!window.player || !window.player.getCurrentTime) return;
            const currentTime = window.player.getCurrentTime();
            const duration = window.player.getDuration();

            updateProgressBar(currentTime, duration);
            updateTimeText(currentTime, duration);
        }, 1000);
    }

    function stopProgressLoop() {
        if (updateInterval) clearInterval(updateInterval);
    }

    function updateProgressBar(current, total) {
        const progressBar = document.querySelector(".musictrack .track");
        if (progressBar && total > 0) {
            progressBar.value = (current / total) * 100;
        }
    }

    function updateTimeText(current, total) {
        const timeSpans = document.querySelectorAll(".musictrack span");
        if (timeSpans.length >= 2) {
            timeSpans[0].innerText = formatTime(current);
            timeSpans[1].innerText = formatTime(total);
        }
    }

    function formatTime(seconds) {
        if (!seconds) return "0:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    // 3. Add Search Bar to the Top Nav (and 4. Handle Search)
    const nav2div = document.querySelector(".nav2div");
    const searchContainer = document.createElement("div");
    searchContainer.className = "search-container";
    searchContainer.style.flexGrow = "0.5";
    searchContainer.style.margin = "0 20px";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.id = "search-input"; // Add ID for easier selection if needed, though we have var reference
    searchInput.placeholder = "What do you want to play?";
    searchInput.style.width = "100%";
    searchInput.style.padding = "10px 20px";
    searchInput.style.borderRadius = "20px";
    searchInput.style.border = "none";
    searchInput.style.outline = "none";
    searchInput.style.backgroundColor = "#242424";
    searchInput.style.color = "white";
    searchInput.style.fontSize = "1rem";

    searchContainer.appendChild(searchInput);

    // Insert after arrows
    const arrowsDiv = document.querySelector(".arrowsdiv");
    nav2div.insertBefore(searchContainer, nav2div.querySelector(".profilediv"));

    // --- Sidebar & Navigation Implementations ---

    const homeView = document.getElementById("home-view");
    const searchView = document.getElementById("search-view");

    function showHome() {
        if (homeView) homeView.style.display = "block";
        if (searchView) searchView.style.display = "none";
    }

    function showSearch() {
        if (homeView) homeView.style.display = "none";
        if (searchView) searchView.style.display = "block";
    }

    // 1. Home Button
    const homeBtn = document.getElementById("home-btn");
    if (homeBtn) {
        homeBtn.addEventListener("click", showHome);
    }

    // 1b. Back Arrow
    const backArrow = document.querySelector(".backarrow");
    if (backArrow) {
        backArrow.style.cursor = "pointer";
        backArrow.addEventListener("click", showHome);
    }

    // 2. Search Button
    const searchBtn = document.getElementById("search-btn");
    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
            if (searchInput) {
                searchInput.focus();
            }
        });
    }

    // 4. Handle Search Logic
    searchInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
            const query = searchInput.value;
            if (!query) return;

            showSearch(); // Switch to search view
            if (searchView) searchView.innerHTML = "<h2 style='margin: 20px;'>Searching...</h2>";

            try {
                const res = await fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`);
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Server returned an error");
                }
                const videos = await res.json();
                renderResults(videos);
            } catch (err) {
                console.error(err);
                if (searchView) searchView.innerHTML = `<h2>Error fetching results: ${err.message}</h2>`;
            }
        }
    });

    function renderResults(videos) {
        // Ensure we are in search view
        showSearch();

        if (!searchView) return;
        searchView.innerHTML = "<h2 style='margin: 20px;'>Search Results</h2>";

        const cardsContainer = document.createElement("div");
        cardsContainer.className = "cards";
        cardsContainer.style.display = "flex";
        cardsContainer.style.flexWrap = "wrap";
        cardsContainer.style.gap = "20px";
        cardsContainer.style.padding = "0 20px";

        videos.forEach(video => {
            const card = document.createElement("div");
            card.className = "card-result";
            // Inline styles removed to use CSS class .card-result


            // Hover effects handled by CSS


            card.innerHTML = `
                <img src="${video.thumbnail}" style="width: 100%; border-radius: 4px; aspect-ratio: 1; object-fit: cover; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${video.title}</h3>
                <p style="font-size: 14px; color: #a7a7a7;">${video.author}</p>
            `;

            card.addEventListener("click", () => playVideo(video));
            cardsContainer.appendChild(card);
        });

        searchView.appendChild(cardsContainer);
    }

    // 5. Play Video & Player Controls
    function playVideo(video) {
        currentlyPlayingVideo = video;
        const coverImg = document.querySelector(".playingsongimg img");
        const titleElem = document.querySelector(".playingsonginfo .p1");
        const artistElem = document.querySelector(".playingsonginfo .p2");

        if (coverImg) coverImg.src = video.thumbnail;
        titleElem.innerHTML = `<a href="#">${video.title}</a>`;
        artistElem.innerHTML = `<a href="#" class="opacity">${video.author}</a>`;

        // Update queue index if this video is in the queue
        const idx = songQueue.findIndex(v => v.id === video.id);
        if (idx !== -1) currentQueueIndex = idx;

        // Highlight the active card
        highlightActiveCard(video.id);

        // Update heart button state for this song
        updateHeartButton(video.id);

        // Refresh Queue panel if open
        renderQueuePanel();

        // Check window.player
        if (window.player && typeof window.player.loadVideoById === 'function') {
            try {
                window.player.loadVideoById(video.id);
            } catch (error) {
                console.error("Player error:", error);
                showToast("Error playing video.", "error");
            }
        } else {
            console.error("Player not initialized yet");
            showToast("Player is loading... please try again.", "error");
        }
    }

    // Highlight the currently playing card
    function highlightActiveCard(videoId) {
        document.querySelectorAll(".card-result").forEach(c => c.classList.remove("card-active"));
        const activeCard = document.querySelector(`.card-result[data-id="${videoId}"]`);
        if (activeCard) activeCard.classList.add("card-active");
    }

    // Play the next track in the queue
    function playNextTrack() {
        if (songQueue.length === 0) return;
        if (repeatMode === 'all') {
            currentQueueIndex = (currentQueueIndex + 1) % songQueue.length;
        } else {
            // Don't loop if not repeating all; stop at end
            if (currentQueueIndex + 1 >= songQueue.length) return;
            currentQueueIndex = currentQueueIndex + 1;
        }
        playVideo(songQueue[currentQueueIndex]);
    }

    // Play the previous track in the queue
    function playPrevTrack() {
        if (songQueue.length === 0) return;
        // If more than 3 seconds in, restart current track; otherwise go previous
        if (window.player && window.player.getCurrentTime && window.player.getCurrentTime() > 3) {
            window.player.seekTo(0, true);
            return;
        }
        currentQueueIndex = (currentQueueIndex - 1 + songQueue.length) % songQueue.length;
        playVideo(songQueue[currentQueueIndex]);
    }

    // --- Shuffle ---
    const shuffleBtn = document.querySelector(".controls img[src*='player_icon1']");
    if (shuffleBtn) {
        shuffleBtn.style.cursor = "pointer";
        shuffleBtn.addEventListener("click", () => {
            isShuffled = !isShuffled;
            if (isShuffled) {
                // Save original order and shuffle
                originalQueue = [...songQueue];
                const playing = currentQueueIndex >= 0 ? songQueue[currentQueueIndex] : null;
                const rest = songQueue.filter((_, i) => i !== currentQueueIndex);
                // Fisher-Yates shuffle
                for (let i = rest.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [rest[i], rest[j]] = [rest[j], rest[i]];
                }
                songQueue = playing ? [playing, ...rest] : rest;
                currentQueueIndex = playing ? 0 : -1;
                shuffleBtn.style.filter = 'invert(1) sepia(1) saturate(5) hue-rotate(90deg)';
                shuffleBtn.title = 'Shuffle: ON';
            } else {
                // Restore original order
                const playing = currentQueueIndex >= 0 ? songQueue[currentQueueIndex] : null;
                songQueue = [...originalQueue];
                currentQueueIndex = playing ? songQueue.findIndex(v => v.id === playing.id) : -1;
                shuffleBtn.style.filter = '';
                shuffleBtn.title = 'Shuffle: OFF';
            }
        });
    }

    // --- Repeat ---
    const repeatBtn = document.querySelector(".controls .fa-rotate-right");
    if (repeatBtn) {
        repeatBtn.style.cursor = "pointer";
        repeatBtn.title = 'Repeat: Off';
        repeatBtn.addEventListener("click", () => {
            if (repeatMode === 'none') {
                repeatMode = 'all';
                repeatBtn.style.color = '#1ed760';
                repeatBtn.title = 'Repeat: All';
            } else if (repeatMode === 'all') {
                repeatMode = 'one';
                repeatBtn.style.color = '#1ed760';
                repeatBtn.title = 'Repeat: One';
                // Show a small "1" badge visually
                repeatBtn.dataset.repeat = '1';
            } else {
                repeatMode = 'none';
                repeatBtn.style.color = '';
                repeatBtn.title = 'Repeat: Off';
                delete repeatBtn.dataset.repeat;
            }
        });
    }

    // 6. Play/Pause, Seek & Prev/Next Controls
    const playBtn = document.querySelector(".controls .play");
    if (playBtn) {
        playBtn.addEventListener("click", togglePlayPause);
    }

    function togglePlayPause() {
        if (!window.player) return;
        const state = window.player.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            window.player.pauseVideo();
        } else {
            window.player.playVideo();
        }
    }

    // Previous track (player_icon2)
    const prevBtn = document.querySelector(".controls img[src*='player_icon2']");
    if (prevBtn) {
        prevBtn.style.cursor = "pointer";
        prevBtn.addEventListener("click", playPrevTrack);
    }

    // Next track (player_icon4)
    const nextBtn = document.querySelector(".controls img[src*='player_icon4']");
    if (nextBtn) {
        nextBtn.style.cursor = "pointer";
        nextBtn.addEventListener("click", playNextTrack);
    }

    const progressBar = document.querySelector(".musictrack .track");
    if (progressBar) {
        progressBar.addEventListener("input", (e) => {
            if (!window.player) return;
            const duration = window.player.getDuration();
            const seekTo = (e.target.value / 100) * duration;
            window.player.seekTo(seekTo, true);
        });
    }

    // ─── Mute Toggle ────────────────────────────────────────────────────────
    const muteBtn = document.getElementById("mute-btn");
    let isMuted = false;
    let volumeBeforeMute = 100;
    if (muteBtn) {
        muteBtn.addEventListener("click", () => {
            if (!window.player) return;
            isMuted = !isMuted;
            if (isMuted) {
                volumeBeforeMute = window.player.getVolume();
                window.player.setVolume(0);
                muteBtn.classList.add("muted");
                // swap icon
                muteBtn.className = muteBtn.className.replace('fa-volume-low', 'fa-volume-xmark');
                showToast("Muted");
            } else {
                window.player.setVolume(volumeBeforeMute);
                muteBtn.classList.remove("muted");
                muteBtn.className = muteBtn.className.replace('fa-volume-xmark', 'fa-volume-low');
                showToast("Unmuted");
            }
        });
    }

    // ─── Heart / Like Button ────────────────────────────────────────────────
    let likedSongs = JSON.parse(localStorage.getItem("spotify_liked_songs")) || {};
    let currentlyPlayingVideo = null; // track what's currently loaded

    function savelikedSongs() {
        localStorage.setItem("spotify_liked_songs", JSON.stringify(likedSongs));
    }

    function updateHeartButton(videoId) {
        const heartIcon = document.getElementById("heart-btn");
        if (!heartIcon) return;
        if (likedSongs[videoId]) {
            heartIcon.classList.remove("fa-regular");
            heartIcon.classList.add("fa-solid", "liked");
        } else {
            heartIcon.classList.remove("fa-solid", "liked");
            heartIcon.classList.add("fa-regular");
        }
    }

    const heartBtn = document.getElementById("heart-btn");
    if (heartBtn) {
        heartBtn.addEventListener("click", () => {
            if (!currentlyPlayingVideo) {
                showToast("Nothing is playing.");
                return;
            }
            const id = currentlyPlayingVideo.id;
            if (likedSongs[id]) {
                delete likedSongs[id];
                savelikedSongs();
                updateHeartButton(id);
                showToast("Removed from liked songs");
            } else {
                likedSongs[id] = currentlyPlayingVideo;
                savelikedSongs();
                updateHeartButton(id);
                showToast("Added to liked songs ♪", "success");
            }
        });
    }

    // Plus-to-playlist button (in player bar)
    const plusToPlaylistBtn = document.getElementById("plus-to-playlist-btn");
    if (plusToPlaylistBtn) {
        plusToPlaylistBtn.addEventListener("click", () => {
            if (!currentlyPlayingVideo) {
                showToast("Nothing is playing.");
                return;
            }
            addToPlaylist(currentlyPlayingVideo);
        });
    }

    // ─── Now Playing Queue Panel ─────────────────────────────────────────────
    const queuePanel = document.getElementById("queue-panel");
    const queueList = document.getElementById("queue-list");
    const queueToggleBtn = document.getElementById("queue-toggle-btn");
    const closeQueueBtn = document.getElementById("close-queue-btn");
    const queueOverlay = document.getElementById("queue-overlay");
    let queueOpen = false;

    function openQueuePanel() {
        queueOpen = true;
        if (queuePanel) queuePanel.classList.add("open");
        if (queueOverlay) queueOverlay.style.display = "block";
        if (queueToggleBtn) queueToggleBtn.classList.add("queue-btn-active");
        renderQueuePanel();
    }
    function closeQueuePanel() {
        queueOpen = false;
        if (queuePanel) queuePanel.classList.remove("open");
        if (queueOverlay) queueOverlay.style.display = "none";
        if (queueToggleBtn) queueToggleBtn.classList.remove("queue-btn-active");
    }
    function renderQueuePanel() {
        if (!queueList || !queueOpen) return;
        queueList.innerHTML = "";

        if (songQueue.length === 0) {
            queueList.innerHTML = `<p style="padding:20px; color:#a7a7a7; text-align:center; font-size:13px;">No songs in queue.<br>Search and play music to build your queue.</p>`;
            return;
        }

        // Section: Now Playing
        if (currentQueueIndex >= 0 && currentQueueIndex < songQueue.length) {
            const header = document.createElement("p");
            header.style.cssText = "padding:8px 24px; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#a7a7a7; font-weight:700;";
            header.textContent = "Now playing";
            queueList.appendChild(header);
            queueList.appendChild(buildQueueItem(songQueue[currentQueueIndex], currentQueueIndex, true));

            // Section: Next up
            const nextItems = songQueue.slice(currentQueueIndex + 1);
            if (nextItems.length > 0) {
                const nextHeader = document.createElement("p");
                nextHeader.style.cssText = "padding:16px 24px 8px; font-size:11px; text-transform:uppercase; letter-spacing:1px; color:#a7a7a7; font-weight:700;";
                nextHeader.textContent = "Next in queue";
                queueList.appendChild(nextHeader);
                nextItems.forEach((v, i) => {
                    queueList.appendChild(buildQueueItem(v, currentQueueIndex + 1 + i, false));
                });
            }
        } else {
            // No current track known — show all
            songQueue.forEach((v, i) => {
                queueList.appendChild(buildQueueItem(v, i, false));
            });
        }
    }
    function buildQueueItem(video, idx, isActive) {
        const item = document.createElement("div");
        item.className = "queue-item" + (isActive ? " queue-active" : "");

        item.innerHTML = `
            <span class="queue-item-index">${isActive ? '<i class="fa-solid fa-volume-up" style="font-size:10px; color:#1ed760;"></i>' : idx + 1}</span>
            <img src="${video.thumbnail}" alt="">
            <div class="queue-item-info">
                <div class="queue-item-title">${video.title}</div>
                <div class="queue-item-artist">${video.author}</div>
            </div>
        `;
        item.addEventListener("click", () => {
            currentQueueIndex = idx;
            playVideo(video);
        });
        return item;
    }

    if (queueToggleBtn) queueToggleBtn.addEventListener("click", () => queueOpen ? closeQueuePanel() : openQueuePanel());
    if (closeQueueBtn) closeQueueBtn.addEventListener("click", closeQueuePanel);
    if (queueOverlay) queueOverlay.addEventListener("click", closeQueuePanel);

    // ─── Keyboard Shortcuts ──────────────────────────────────────────────────
    document.addEventListener("keydown", (e) => {
        // Don't fire shortcuts if user is typing in a text input / textarea
        const tag = document.activeElement.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;

        switch (e.code) {
            case "Space":
                e.preventDefault();
                togglePlayPause();
                showShortcutHint("Space — Play / Pause");
                break;
            case "ArrowRight":
                e.preventDefault();
                playNextTrack();
                showShortcutHint("→ Next track");
                break;
            case "ArrowLeft":
                e.preventDefault();
                playPrevTrack();
                showShortcutHint("← Previous track");
                break;
            case "KeyM":
                if (muteBtn) muteBtn.click();
                showShortcutHint("M — Mute / Unmute");
                break;
            case "KeyQ":
                queueOpen ? closeQueuePanel() : openQueuePanel();
                showShortcutHint("Q — Queue panel");
                break;
        }
    });

    // Keyboard shortcut hint (transient label)
    let shortcutHintEl = null;
    let shortcutTimeout = null;
    function showShortcutHint(text) {
        if (!shortcutHintEl) {
            shortcutHintEl = document.createElement("div");
            shortcutHintEl.className = "shortcut-hint";
            document.body.appendChild(shortcutHintEl);
        }
        shortcutHintEl.textContent = text;
        shortcutHintEl.classList.add("visible");
        clearTimeout(shortcutTimeout);
        shortcutTimeout = setTimeout(() => shortcutHintEl.classList.remove("visible"), 1200);
    }

    // (Dynamic player creation removed - using static HTML)

    // --- Playlist & LocalStorage Logic ---

    // 1. Initialize Playlists
    let playlists = JSON.parse(localStorage.getItem("spotify_playlists")) || {};

    // 2. Function to Save Playlists
    function savePlaylists() {
        localStorage.setItem("spotify_playlists", JSON.stringify(playlists));
    }

    // 3. Render Sidebar Playlists on Load
    function renderSidebarPlaylists() {
        if (!playlistList) return;
        playlistList.innerHTML = ""; // Clear existing
        Object.keys(playlists).forEach(name => {
            const playlistItem = document.createElement("div");
            playlistItem.className = "sidebar-playlist-item";

            const nameSpan = document.createElement("span");
            nameSpan.innerText = name;
            nameSpan.className = "sidebar-playlist-name";

            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "&times;";
            deleteBtn.className = "sidebar-playlist-delete";
            deleteBtn.title = `Delete playlist "${name}"`;

            deleteBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (confirm(`Delete playlist "${name}"?`)) {
                    delete playlists[name];
                    savePlaylists();
                    renderSidebarPlaylists();
                    // If the playlist was being shown, go back to home
                    showHome();
                }
            });

            playlistItem.appendChild(nameSpan);
            playlistItem.appendChild(deleteBtn);
            playlistItem.onclick = () => showPlaylist(name);

            playlistList.appendChild(playlistItem);
        });
    }

    // 4. Create Playlist Logic
    const createPlaylistBtn = document.getElementById("create-playlist-btn");
    const plusIcon = document.getElementById("plus-icon");
    const playlistList = document.getElementById("playlist-list");

    function createPlaylist() {
        const name = prompt("Enter a name for your playlist:");
        if (name) {
            if (playlists[name]) {
                alert("Playlist already exists!");
                return;
            }
            playlists[name] = []; // Initialize empty array for songs
            savePlaylists();
            renderSidebarPlaylists();
        }
    }

    if (createPlaylistBtn) createPlaylistBtn.addEventListener("click", createPlaylist);
    if (plusIcon) plusIcon.addEventListener("click", createPlaylist);

    // Initial Render
    renderSidebarPlaylists();

    // 5. Add Song to Playlist Function (with Modal)
    function addToPlaylist(video) {
        const modal = document.getElementById("playlist-modal");
        const modalList = document.getElementById("modal-playlist-list");
        const closeBtn = document.querySelector(".close-modal");

        if (!modal || !modalList) return;

        const playlistNames = Object.keys(playlists);
        if (playlistNames.length === 0) {
            showToast("No playlists yet — create one in the sidebar!", "error");
            return;
        }

        modalList.innerHTML = ""; // Clear previous options

        playlistNames.forEach(name => {
            const btn = document.createElement("button");
            btn.innerText = name;
            btn.style.padding = "10px";
            btn.style.backgroundColor = "#1db954";
            btn.style.border = "none";
            btn.style.borderRadius = "20px";
            btn.style.color = "white";
            btn.style.cursor = "pointer";
            btn.style.fontWeight = "bold";

            btn.onclick = () => {
                const exists = playlists[name].find(s => s.id === video.id);
                if (exists) {
                    showToast(`Already in "${name}"`, "error");
                } else {
                    playlists[name].push(video);
                    savePlaylists();
                    modal.style.display = "none";
                    showToast(`Added to "${name}" ✓`, "success");
                }
            };
            modalList.appendChild(btn);
        });

        modal.style.display = "block";

        closeBtn.onclick = function () {
            modal.style.display = "none";
        };

        window.onclick = function (event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        };
    }

    // --- Dynamic Home Content ---
    async function loadHomeContent() {
        const trendingContainer = document.querySelector("#section-trending .cards");
        const topMixesContainer = document.querySelector("#section-top-mixes .cards");

        if (!trendingContainer || !topMixesContainer) return;

        // Fetch Trending
        try {
            const res1 = await fetch(`http://localhost:3000/search?q=Top+Songs+2024`);
            const trendingVideos = await res1.json();
            renderCardsToContainer(trendingVideos.slice(0, 10), trendingContainer);
        } catch (e) {
            console.error("Failed to load trending", e);
        }

        // Fetch Top Mixes
        try {
            const res2 = await fetch(`http://localhost:3000/search?q=Top+Music+Mixes`);
            const mixVideos = await res2.json();
            renderCardsToContainer(mixVideos.slice(0, 10), topMixesContainer);
        } catch (e) {
            console.error("Failed to load mixes", e);
        }
    }

    function renderCardsToContainer(videos, container) {
        container.innerHTML = "";

        // Merge these videos into the global queue (avoid duplicates)
        videos.forEach(v => {
            if (!songQueue.find(q => q.id === v.id)) songQueue.push(v);
        });

        videos.forEach(video => {
            const card = document.createElement("div");
            card.className = "card-result";
            card.dataset.id = video.id; // for queue highlight

            card.innerHTML = `
                <img src="${video.thumbnail}" style="width: 100%; border-radius: 4px; aspect-ratio: 1; object-fit: cover; margin-bottom: 16px;">
                <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: white;">${video.title}</h3>
                <p style="font-size: 12px; color: #a7a7a7;">${video.author}</p>
                <button class="add-btn" style="position: absolute; top: 10px; right: 10px; background: #1bd760; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; display: none; font-weight:bold; font-size:18px; line-height:1;">+</button>
            `;

            const addBtn = card.querySelector(".add-btn");
            card.addEventListener("mouseenter", () => addBtn.style.display = "block");
            card.addEventListener("mouseleave", () => addBtn.style.display = "none");

            addBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                addToPlaylist(video);
            });

            card.addEventListener("click", () => playVideo(video));
            container.appendChild(card);
        });
    }

    // Run on startup
    loadHomeContent();

    // 6. Show Playlist View (Updated to use new render helper if desired, but kept separate for now)
    function showPlaylist(name) {
        showSearch();
        if (!searchView) return;

        searchView.innerHTML = `<h2 style='margin: 20px;'>Playlist: ${name}</h2>`;

        const songs = playlists[name] || [];
        if (songs.length === 0) {
            searchView.innerHTML += `<p style='margin: 20px; color: #a7a7a7;'>This playlist is empty.</p>`;
            return;
        }

        const cardsContainer = document.createElement("div");
        cardsContainer.className = "cards";
        cardsContainer.style.display = "flex";
        cardsContainer.style.flexWrap = "wrap";
        cardsContainer.style.gap = "20px";
        cardsContainer.style.padding = "0 20px";

        // Reusing similar logic but vertical flow is fine here
        songs.forEach((video, index) => {
            const card = document.createElement("div");
            // ... (Same card style as before) ...
            card.className = "card-result";
            // Inline styles removed to use CSS class .card-result


            // Hover effects handled by CSS


            card.innerHTML = `
                <img src="${video.thumbnail}" style="width: 100%; border-radius: 4px; aspect-ratio: 1; object-fit: cover; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${video.title}</h3>
                <p style="font-size: 14px; color: #a7a7a7;">${video.author}</p>
            `;

            card.addEventListener("click", (e) => {
                playVideo(video);
            });

            cardsContainer.appendChild(card);
        });

        searchView.appendChild(cardsContainer);
    }

    // Update renderResults to include "Add to Playlist" button
    renderResults = function (videos) {
        showSearch();
        if (!searchView) return;
        searchView.innerHTML = "<h2 style='margin: 20px;'>Search Results</h2>";

        const cardsContainer = document.createElement("div");
        cardsContainer.className = "cards";
        cardsContainer.style.display = "flex";
        cardsContainer.style.flexWrap = "wrap";
        cardsContainer.style.gap = "20px";
        cardsContainer.style.padding = "0 20px";

        // Replace queue with search results
        songQueue = [...videos];
        currentQueueIndex = -1;

        videos.forEach(video => {
            const card = document.createElement("div");
            card.className = "card-result";
            card.dataset.id = video.id;

            card.innerHTML = `
                <img src="${video.thumbnail}" style="width: 100%; border-radius: 4px; aspect-ratio: 1; object-fit: cover; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${video.title}</h3>
                <p style="font-size: 14px; color: #a7a7a7;">${video.author}</p>
                <button class="add-btn" style="position: absolute; top: 10px; right: 10px; background: #1bd760; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; display: none; font-size:18px; line-height:1; font-weight:bold;">+</button>
            `;

            const addBtn = card.querySelector(".add-btn");
            card.addEventListener("mouseenter", () => addBtn.style.display = "block");
            card.addEventListener("mouseleave", () => addBtn.style.display = "none");

            addBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                addToPlaylist(video);
            });

            card.addEventListener("click", () => playVideo(video));
            cardsContainer.appendChild(card);
        });

        searchView.appendChild(cardsContainer);
    };

});
