const UI = {
    init() {
        this.setupEventListeners();
        this.updateMoodHistory();
    },

    setupEventListeners() {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', () => this.switchSection(item.dataset.section));
        });

        document.getElementById('send-button').addEventListener('click', () => {
            const input = document.getElementById('user-input').value.trim();
            if (input) {
                UI.addUserMessage(input);
                Chatbot.processUserInput(input);
                document.getElementById('user-input').value = '';
            }
        });

        document.getElementById('spotify-connect').addEventListener('click', () => {
            window.location.href = 'http://127.0.0.1:3000/api/auth/spotify';
        });

        document.getElementById('play-button').addEventListener('click', () => Spotify.togglePlayPause());
        document.getElementById('next-button').addEventListener('click', () => Spotify.nextTrack());
        document.getElementById('prev-button').addEventListener('click', () => Spotify.previousTrack());
        document.getElementById('expanded-play-button').addEventListener('click', () => Spotify.togglePlayPause());
        document.getElementById('expanded-prev-button').addEventListener('click', () => Spotify.previousTrack());
        document.getElementById('expanded-next-button').addEventListener('click', () => Spotify.nextTrack());

        document.getElementById('expand-button').addEventListener('click', () => {
            document.querySelector('.player-collapsed').style.display = 'none';
            document.querySelector('.player-expanded').style.display = 'block';
        });

        document.getElementById('collapse-button').addEventListener('click', () => {
            document.querySelector('.player-expanded').style.display = 'none';
            document.querySelector('.player-collapsed').style.display = 'flex';
        });

        document.getElementById('clear-history').addEventListener('click', () => {
            Storage.clearMoodHistory();
            this.updateMoodHistory();
        });

        document.getElementById('play-all-recommendations').addEventListener('click', () => {
            const firstTrack = document.querySelector('.play-track')?.dataset.uri;
            if (firstTrack) Spotify.playTrack(firstTrack);
        });
    },

    switchSection(sectionId) {
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
        document.querySelector(`.menu-item[data-section="${sectionId}"]`).classList.add('active');

        if (sectionId === 'library') {
            this.updateLibrary();
        } else if (sectionId === 'mood-history') {
            this.updateMoodHistory();
        }
    },

    addBotMessage(text) {
        const messages = document.getElementById('chat-messages');
        const message = document.createElement('div');
        message.className = 'message bot-message';
        message.innerHTML = `<div class="message-content"><p>${text}</p></div>`;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
    },

    addUserMessage(text) {
        const messages = document.getElementById('chat-messages');
        const message = document.createElement('div');
        message.className = 'message user-message';
        message.innerHTML = `<div class="message-content"><p>${text}</p></div>`;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
    },

    showLoading(show) {
        document.getElementById('loading-overlay').classList.toggle('active', show);
    },

    updateTrackInfo(track) {
        const titleElement = document.getElementById('track-title');
        const artistElement = document.getElementById('track-artist');
        const imageElement = document.getElementById('track-image');
        const expandedTitleElement = document.getElementById('expanded-track-title');
        const expandedArtistElement = document.getElementById('expanded-track-artist');
        const expandedAlbumElement = document.getElementById('expanded-track-album');
        const expandedImageElement = document.getElementById('expanded-track-image');

        if (track) {
            titleElement.textContent = track.name || 'Not Playing';
            artistElement.textContent = track.artists.map(a => a.name).join(', ') || 'No artist';
            imageElement.src = track.album.images[0]?.url || 'assets/images/placeholder.png';

            expandedTitleElement.textContent = track.name || 'Not Playing';
            expandedArtistElement.textContent = track.artists.map(a => a.name).join(', ') || 'No artist';
            expandedAlbumElement.textContent = track.album.name || 'No album information';
            expandedImageElement.src = track.album.images[0]?.url || 'assets/images/placeholder.png';
            document.getElementById('current-mood-tag').textContent = `Mood: ${Chatbot.currentMood || 'Not detected'}`;
            document.getElementById('recommendation-reason').textContent = 'Playing based on your mood';
        } else {
            titleElement.textContent = 'Not Playing';
            artistElement.textContent = 'Connect Spotify to play music';
            imageElement.src = 'assets/images/placeholder.png';

            expandedTitleElement.textContent = 'Not Playing';
            expandedArtistElement.textContent = 'Connect Spotify to play music';
            expandedAlbumElement.textContent = 'No album information';
            expandedImageElement.src = 'assets/images/placeholder.png';
            document.getElementById('current-mood-tag').textContent = 'No mood detected yet';
            document.getElementById('recommendation-reason').textContent = 'Connect Spotify to get personalized recommendations';
        }
    },

    updatePlayerState(state) {
        const playButton = document.getElementById('play-button');
        const expandedPlayButton = document.getElementById('expanded-play-button');
        if (state === 'playing') {
            playButton.innerHTML = '<i class="fas fa-pause"></i>';
            expandedPlayButton.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            playButton.innerHTML = '<i class="fas fa-play"></i>';
            expandedPlayButton.innerHTML = '<i class="fas fa-play"></i>';
        }
    },

    async updateLibrary() {
        const tokens = Storage.getTokens();
        if (tokens && tokens.access_token) {
            const playlists = await Spotify.getPlaylists(tokens.access_token);
            const playlistGrid = document.getElementById('user-playlists');
            playlistGrid.innerHTML = '';
            if (playlists && playlists.items) {
                playlists.items.forEach(playlist => {
                    const div = document.createElement('div');
                    div.className = 'playlist-item';
                    div.innerHTML = `
                        <h4>${playlist.name}</h4>
                        <img src="${playlist.images[0]?.url || 'assets/images/placeholder.png'}" alt="${playlist.name}">
                        <button class="btn btn-sm btn-primary play-playlist" data-playlist-id="${playlist.id}">Play</button>
                    `;
                    playlistGrid.appendChild(div);

                    div.querySelector('.play-playlist').addEventListener('click', async () => {
                        const tracks = await Spotify.getPlaylistTracks(tokens.access_token, playlist.id);
                        if (tracks && tracks.items && tracks.items.length > 0) {
                            const firstTrackUri = tracks.items[0].track.uri;
                            Spotify.playTrack(firstTrackUri).then(() => {
                                UI.updateTrackInfo(tracks.items[0].track);
                            }).catch(err => {
                                console.error('Error playing playlist:', err);
                                UI.addBotMessage('Failed to play the playlist. Please try again.');
                            });
                        } else {
                            UI.addBotMessage('No tracks found in this playlist.');
                        }
                    });
                });
            } else {
                playlistGrid.innerHTML = '<div class="playlist-placeholder">No playlists found</div>';
            }
        } else {
            playlistGrid.innerHTML = '<div class="playlist-placeholder">Connect with Spotify to see your playlists</div>';
        }
    },

    updateMoodHistory() {
        const history = Storage.getMoodHistory();
        const historyList = document.getElementById('mood-history-entries');
        historyList.innerHTML = '';
        if (history.length > 0) {
            history.forEach(entry => {
                const div = document.createElement('div');
                div.className = 'history-entry';
                div.innerHTML = `<p><strong>${new Date(entry.timestamp).toLocaleString()}</strong>: ${entry.mood}<br>${entry.input}</p>`;
                historyList.appendChild(div);
            });
        } else {
            historyList.innerHTML = '<div class="history-placeholder">Your mood history will appear here as you use the app</div>';
        }
    },

    showRecommendations(tracks, mood) {
        console.log('Displaying recommendations:', tracks);
        const modal = new bootstrap.Modal(document.getElementById('recommendationsModal'));
        const tracksContainer = document.getElementById('recommended-tracks');
        document.getElementById('modal-mood').textContent = `Your Current Mood: ${mood.charAt(0).toUpperCase() + mood.slice(1)}`;
        tracksContainer.innerHTML = '';

        if (!tracks || tracks.length === 0) {
            tracksContainer.innerHTML = '<p>No tracks available for this mood.</p>';
        } else {
            tracks.forEach((track, index) => {
                const div = document.createElement('div');
                div.className = 'track-item';
                div.innerHTML = `
                    <img src="${track.album.images[0]?.url || 'assets/images/placeholder.png'}" alt="${track.name}">
                    <div class="track-details">
                        <h5>${track.name}</h5>
                        <p>${track.artists.map(a => a.name).join(', ')}</p>
                    </div>
                    <button class="btn btn-sm btn-primary play-track" data-uri="${track.uri}" data-index="${index}">Play</button>
                `;
                tracksContainer.appendChild(div);
            });

            document.querySelectorAll('.play-track').forEach(button => {
                button.addEventListener('click', () => {
                    const index = button.dataset.index;
                    const selectedTrack = tracks[index];
                    Spotify.playTrack(button.dataset.uri).then(() => {
                        UI.updateTrackInfo(selectedTrack);
                    }).catch(err => {
                        console.error('Playback error:', err);
                        UI.addBotMessage('Failed to play the track. Please try another one.');
                    });
                });
            });
        }

        document.getElementById('save-as-playlist').onclick = async () => {
            const tokens = Storage.getTokens();
            const user = await Spotify.getUserProfile(tokens.access_token);
            if (user) {
                await Spotify.createPlaylist(tokens.access_token, user.id, `MoodMelody: ${mood} Playlist`, tracks);
                this.updateLibrary();
                UI.addBotMessage('Playlist saved successfully!');
            } else {
                UI.addBotMessage('Failed to save playlist. Please try again.');
            }
        };

        document.getElementById('play-all-recommendations').onclick = () => {
            const firstTrack = tracks[0];
            if (firstTrack) {
                Spotify.playTrack(firstTrack.uri).then(() => {
                    UI.updateTrackInfo(firstTrack);
                }).catch(err => {
                    console.error('Playback error:', err);
                    UI.addBotMessage('Failed to play the tracks. Please try another one.');
                });
            }
        };

        modal.show();
    },
};