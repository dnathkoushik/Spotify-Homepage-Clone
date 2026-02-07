document.addEventListener("DOMContentLoaded", () => {
    // 1. Inject YouTube Iframe API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // 2. Setup Player State
    let player;
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
    }

    function onPlayerStateChange(event) {
        // Update play/pause button based on state
        const playBtn = document.querySelector(".play");
        if (event.data == YT.PlayerState.PLAYING) {
            playBtn.src = "./assets/player_icon3.png"; // Pause icon needed? Currently assume toggle
            // Actually Spotify pause icon looks like '||'. The current icon is a play button.
            // We might need to change the image source or use FontAwesome.
            // For now, let's just log it.
        }
    }

    // 3. Add Search Bar to the Top Nav
    const nav2div = document.querySelector(".nav2div");
    const searchContainer = document.createElement("div");
    searchContainer.className = "search-container";
    searchContainer.style.flexGrow = "0.5";
    searchContainer.style.margin = "0 20px";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
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

    // 4. Handle Search
    searchInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
            const query = searchInput.value;
            if (!query) return;

            // Show loading or clear content
            const mainContent = document.querySelector(".content");
            mainContent.innerHTML = "<h2 style='margin: 20px;'>Searching...</h2>";

            try {
                const res = await fetch(`http://localhost:3000/search?q=${encodeURIComponent(query)}`);
                const videos = await res.json();
                renderResults(videos);
            } catch (err) {
                console.error(err);
                mainContent.innerHTML = "<h2>Error fetching results</h2>";
            }
        }
    });

    function renderResults(videos) {
        const mainContent = document.querySelector(".content");
        mainContent.innerHTML = "<h2 style='margin: 20px;'>Search Results</h2>";

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

        mainContent.appendChild(cardsContainer);
    }

    // 5. Play Video
    function playVideo(video) {
        // Update Player Bar UI
        const coverImg = document.querySelector(".playingsongimg img");
        const titleElem = document.querySelector(".playingsonginfo .p1"); // Currently is an 'a' tag inside 'p'
        const artistElem = document.querySelector(".playingsonginfo .p2");

        if (coverImg) coverImg.src = video.thumbnail;

        // Fix the structure if it's strictly following original HTML
        titleElem.innerHTML = `<a href="#">${video.title}</a>`;
        artistElem.innerHTML = `<a href="#" class="opacity">${video.author}</a>`;

        // Load into YouTube Player
        if (player && typeof player.loadVideoById === 'function') {
            player.loadVideoById(video.id);
            // player.playVideo() is auto-called by loadVideoById usually
        } else {
            console.error("Player not ready");
        }
    }

    // 6. Play/Pause Controls
    const playBtn = document.querySelector(".controls .play"); // This is an img
    if (playBtn) {
        playBtn.addEventListener("click", () => {
            if (!player) return;
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                player.pauseVideo();
                // Change icon if needed (needs assets)
            } else {
                player.playVideo();
            }
        });
    }

    // Create the player container (hidden)
    const playerDiv = document.createElement("div");
    playerDiv.id = "youtube-player";
    playerDiv.style.position = "absolute";
    playerDiv.style.top = "-9999px"; // Hide it
    document.body.appendChild(playerDiv);
});
