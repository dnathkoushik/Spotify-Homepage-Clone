document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject YouTube Iframe API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // 2. Setup Player State
    let player;
    let updateInterval;

    window.onYouTubeIframeAPIReady = function () {
        player = new YT.Player('youtube-player', {
            height: '0',
            width: '0',
            videoId: '', // Start empty
            playerVars: {
                'playsinline': 1,
                'controls': 0, // customized controls
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    };

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
                const videos = await res.json();
                renderResults(videos);
            } catch (err) {
                console.error(err);
                if (searchView) searchView.innerHTML = "<h2>Error fetching results</h2>";
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
            player.loadVideoById(video.id);
        }
    }

    // 6. Play/Pause & Seek Controls
    const playBtn = document.querySelector(".controls .play");
    if (playBtn) {
        playBtn.addEventListener("click", () => {
            if (!player) return;
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                player.pauseVideo();
                playBtn.style.opacity = "0.7"; // Visual feedback for pause
            } else {
                player.playVideo();
                playBtn.style.opacity = "1";
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

    // Create the player container (hidden)
    const playerDiv = document.createElement("div");
    playerDiv.id = "youtube-player";
    playerDiv.style.position = "absolute";
    playerDiv.style.top = "-9999px";
    document.body.appendChild(playerDiv);

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

    // 5. Add Song to Playlist Function
    function addToPlaylist(video) {
        const playlistNames = Object.keys(playlists);
        if (playlistNames.length === 0) {
            alert("No playlists found. Create one first!");
            return;
        }

        // Simple prompt for now - could be a modal
        let promptText = "Type the name of the playlist to add to:\n";
        playlistNames.forEach(name => promptText += `- ${name}\n`);

        const selectedName = prompt(promptText);
        if (selectedName && playlists[selectedName]) {
            // Check duplicates
            const exists = playlists[selectedName].find(s => s.id === video.id);
            if (exists) {
                alert("Song already in playlist!");
            } else {
                playlists[selectedName].push(video);
                savePlaylists();
                alert(`Added to ${selectedName}`);
            }
        } else if (selectedName) {
            alert("Playlist not found.");
        }
    }

    // 6. Show Playlist View
    function showPlaylist(name) {
        showSearch(); // Reuse search view container for now as "Custom View"
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

        songs.forEach((video, index) => {
            const card = document.createElement("div");
            card.className = "card-result";
            card.style.backgroundColor = "#181818";
            card.style.padding = "16px";
            card.style.borderRadius = "8px";
            card.style.width = "180px";
            card.style.cursor = "pointer";
            card.style.transition = "background-color 0.3s";
            card.style.position = "relative"; // For delete button

            card.onmouseover = () => card.style.backgroundColor = "#282828";
            card.onmouseout = () => card.style.backgroundColor = "#181818";

            // Click entire card to play
            card.innerHTML = `
                <img src="${video.thumbnail}" style="width: 100%; border-radius: 4px; aspect-ratio: 1; object-fit: cover; margin-bottom: 16px;">
                <h3 style="font-size: 16px; font-weight: 700; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${video.title}</h3>
                <p style="font-size: 14px; color: #a7a7a7;">${video.author}</p>
            `;

            // Play click
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
