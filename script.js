document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject YouTube Iframe API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // 2. Setup Player State
    // Make player globally accessible
    window.player = null;
    let updateInterval;

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
        const volumeSlider = document.querySelector(".songoptions input");
        if (volumeSlider) {
            volumeSlider.addEventListener("input", (e) => {
                if (player && player.setVolume) {
                    // Map 0-15 slider to 0-100 volume
                    const vol = (e.target.value / 15) * 100;
                    player.setVolume(vol);
                }
            });
        }
    }

    function onPlayerStateChange(event) {
        const playBtn = document.querySelector(".controls .play");

        if (event.data == YT.PlayerState.PLAYING) {
            playBtn.src = "./assets/player_icon3.png"; // Replace with Pause Icon if available, or toggle logic
            // For now, let's keep it simple or swap if you have a pause icon.
            // A common trick is to change the src to a pause icon. 
            // Since we don't have a verified pause icon asset, we'll stick to logic updates.

            startProgressLoop();
        } else {
            // Paused or Ended
            stopProgressLoop();
        }
    }

    function startProgressLoop() {
        stopProgressLoop();
        updateInterval = setInterval(() => {
            if (!player || !player.getCurrentTime) return;
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();

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
            card.style.backgroundColor = "#181818";
            card.style.padding = "16px";
            card.style.borderRadius = "8px";
            card.style.width = "180px";
            card.style.cursor = "pointer";
            card.style.transition = "background-color 0.3s";

            card.onmouseover = () => card.style.backgroundColor = "#282828";
            card.onmouseout = () => card.style.backgroundColor = "#181818";

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
        const coverImg = document.querySelector(".playingsongimg img");
        const titleElem = document.querySelector(".playingsonginfo .p1");
        const artistElem = document.querySelector(".playingsonginfo .p2");

        if (coverImg) coverImg.src = video.thumbnail;
        titleElem.innerHTML = `<a href="#">${video.title}</a>`;
        artistElem.innerHTML = `<a href="#" class="opacity">${video.author}</a>`;

        if (player && typeof player.loadVideoById === 'function') {
            try {
                player.loadVideoById(video.id);
                player.playVideo(); // Ensure it plays
            } catch (error) {
                console.error("Player error:", error);
                alert("Error playing video. See console for details.");
            }
        } else {
            console.error("Player not initialized yet");
            alert("Player is loading... please wait a moment and try again.");
        }
    }

    // 6. Play/Pause & Seek Controls
    const playBtn = document.querySelector(".controls .play");
    if (playBtn) {
        playBtn.addEventListener("click", () => {
            if (!player) return;
            const state = player.getPlayerState();
            /* 
               state can be:
               -1 (unstarted)
               0 (ended)
               1 (playing)
               2 (paused)
               3 (buffering)
               5 (video cued)
            */
            if (state === YT.PlayerState.PLAYING) {
                player.pauseVideo();
            } else {
                player.playVideo();
            }
        });
    }

    const progressBar = document.querySelector(".musictrack .track");
    if (progressBar) {
        progressBar.addEventListener("input", (e) => {
            if (!player) return;
            const duration = player.getDuration();
            const seekTo = (e.target.value / 100) * duration;
            player.seekTo(seekTo, true);
        });
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
            playlistItem.style.padding = "10px";
            playlistItem.style.cursor = "pointer";
            playlistItem.style.opacity = "0.8";
            playlistItem.style.color = "white";
            playlistItem.style.fontSize = "0.9rem";
            playlistItem.innerText = name;

            playlistItem.onmouseover = () => playlistItem.style.opacity = "1";
            playlistItem.onmouseout = () => playlistItem.style.opacity = "0.8";
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
            alert("No playlists created yet. Create one in the sidebar!");
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
                // Check duplicates
                const exists = playlists[name].find(s => s.id === video.id);
                if (exists) {
                    alert("Song already in this playlist!");
                } else {
                    playlists[name].push(video);
                    savePlaylists();
                    // alert(`Added to ${name}`); // Optional feedback
                    modal.style.display = "none"; // Close modal
                }
            };
            modalList.appendChild(btn);
        });

        modal.style.display = "block";

        closeBtn.onclick = function () {
            modal.style.display = "none";
        }

        window.onclick = function (event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        }
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
        videos.forEach(video => {
            const card = document.createElement("div");
            card.className = "card-result";
            card.style.backgroundColor = "#181818";
            // card.style.padding = "16px"; // Already in class, but ensuring
            card.style.minWidth = "160px"; // Needed for horizontal scroll
            card.style.maxWidth = "160px";
            card.style.borderRadius = "8px";
            card.style.padding = "16px";
            card.style.cursor = "pointer";
            card.style.transition = "background-color 0.3s";
            card.style.position = "relative";
            card.style.flexShrink = "0"; // Don't shrink in flex container

            card.onmouseover = () => card.style.backgroundColor = "#282828";
            card.onmouseout = () => card.style.backgroundColor = "#181818";

            card.innerHTML = `
                <img src="${video.thumbnail}" style="width: 100%; border-radius: 4px; aspect-ratio: 1; object-fit: cover; margin-bottom: 16px;">
                <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: white;">${video.title}</h3>
                <p style="font-size: 12px; color: #a7a7a7;">${video.author}</p>
                 <button class="add-btn" style="position: absolute; top: 10px; right: 10px; background: #1bd760; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; display: none; font-weight:bold;">+</button>
            `;

            // Hover effects for button
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
            card.style.backgroundColor = "#181818";
            card.style.padding = "16px";
            card.style.borderRadius = "8px";
            card.style.width = "180px";
            card.style.cursor = "pointer";
            card.style.transition = "background-color 0.3s";
            card.style.position = "relative";

            card.onmouseover = () => card.style.backgroundColor = "#282828";
            card.onmouseout = () => card.style.backgroundColor = "#181818";

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
    const oldRenderResults = renderResults;
    renderResults = function (videos) {
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
            card.style.backgroundColor = "#181818";
            card.style.padding = "16px";
            card.style.borderRadius = "8px";
            card.style.width = "180px";
            card.style.cursor = "pointer";
            card.style.transition = "background-color 0.3s";
            card.style.position = "relative";

            card.onmouseover = () => card.style.backgroundColor = "#282828";
            card.onmouseout = () => card.style.backgroundColor = "#181818";

            card.innerHTML = `
                 <img src="${video.thumbnail}" style="width: 100%; border-radius: 4px; aspect-ratio: 1; object-fit: cover; margin-bottom: 16px;">
                 <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${video.title}</h3>
                 <p style="font-size: 14px; color: #a7a7a7;">${video.author}</p>
                 <button class="add-btn" style="position: absolute; top: 10px; right: 10px; background: #1bd760; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer; display: none;">+</button>
             `;

            // Show add button on hover
            const addBtn = card.querySelector(".add-btn");
            card.addEventListener("mouseenter", () => addBtn.style.display = "block");
            card.addEventListener("mouseleave", () => addBtn.style.display = "none");

            addBtn.addEventListener("click", (e) => {
                e.stopPropagation(); // Prevent playing
                addToPlaylist(video);
            });

            card.addEventListener("click", () => playVideo(video));
            cardsContainer.appendChild(card);
        });

        searchView.appendChild(cardsContainer);
    };

});
