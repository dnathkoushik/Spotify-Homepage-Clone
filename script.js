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

    // 3 - 4. (Existing Search Logic Remains...) 

    /* ... skipped unchanged search code ... */

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

    // Capture initial content for "Home" functionality
    const mainContentDiv = document.querySelector(".content");
    const initialContent = mainContentDiv.innerHTML;

    // --- Sidebar Implementations ---

    // 1. Home Button
    const homeBtn = document.getElementById("home-btn");
    homeBtn.addEventListener("click", () => {
        mainContentDiv.innerHTML = initialContent;
    });

    // 2. Search Button
    const searchBtn = document.getElementById("search-btn");
    searchBtn.addEventListener("click", () => {
        if (searchInput) {
            searchInput.focus();
        }
    });

    // 3. Create Playlist & Plus Icon
    const createPlaylistBtn = document.getElementById("create-playlist-btn");
    const plusIcon = document.getElementById("plus-icon");
    const playlistList = document.getElementById("playlist-list");

    function createPlaylist() {
        const name = prompt("Enter a name for your playlist:");
        if (name) {
            const playlistItem = document.createElement("div");
            playlistItem.style.padding = "10px";
            playlistItem.style.cursor = "pointer";
            playlistItem.style.opacity = "0.8";
            playlistItem.style.color = "white";
            playlistItem.style.fontSize = "0.9rem";
            playlistItem.innerText = name;

            playlistItem.onmouseover = () => playlistItem.style.opacity = "1";
            playlistItem.onmouseout = () => playlistItem.style.opacity = "0.8";

            playlistList.appendChild(playlistItem);

            // Optional: Hide the "Create your first playlist" card if desired, 
            // but usually Spotify keeps the 'create' button around or moves it.
            // For now, we just append to the list.
        }
    }

    if (createPlaylistBtn) createPlaylistBtn.addEventListener("click", createPlaylist);
    if (plusIcon) plusIcon.addEventListener("click", createPlaylist);

});
