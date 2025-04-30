const Spotify = {
    clientId: '0afa567359f44cee82d94427445e909c',
    redirectUri: 'http://127.0.0.1:3000/api/auth/spotify/callback',
    player: null,
    deviceId: null,
    currentTrack: null,
    playerInitialized: false,
    tokenExpirationTime: null,
    isPlaying: false,
    trackDuration: 0,
    trackPosition: 0,

    async init() {
        const tokens = Storage.getTokens();
        const urlParams = new URLSearchParams(window.location.search);
        const access_token = urlParams.get('access_token');
        const refresh_token = urlParams.get('refresh_token');
        const expires_in = urlParams.get('expires_in');

        if (access_token) {
            Storage.saveTokens({ access_token, refresh_token, expires_in });
            this.tokenExpirationTime = Date.now() + (expires_in * 1000);
            window.history.replaceState({}, document.title, '/');
            await this.setupPlayer(access_token);
        } else if (tokens && tokens.access_token) {
            this.tokenExpirationTime = Date.now() + (tokens.expires_in * 1000);
            await this.setupPlayer(tokens.access_token);
        }
    },

    async setupPlayer(access_token) {
        if (this.playerInitialized) {
            console.log('Player already initialized, skipping...');
            return;
        }

        window.onSpotifyWebPlaybackSDKReady = () => {
            console.log('Spotify SDK loaded, initializing player...');
            this.player = new window.Spotify.Player({
                name: 'MoodMelody Player',
                getOAuthToken: cb => cb(access_token),
                volume: 0.5,
            });

            this.player.addListener('ready', ({ device_id }) => {
                this.deviceId = device_id;
                UI.updatePlayerState('ready');
                console.log('Spotify player ready, device ID:', device_id);
            });

            this.player.addListener('player_state_changed', state => {
                if (state) {
                    this.currentTrack = state.track_window.current_track;
                    this.isPlaying = !state.paused;
                    this.trackDuration = state.duration / 1000; // Convert to seconds
                    this.trackPosition = state.position / 1000; // Convert to seconds
                    UI.updateTrackInfo(this.currentTrack);
                    UI.updatePlayerState(this.isPlaying ? 'playing' : 'paused');
                    this.updateProgressBar(this.trackPosition, this.trackDuration);
                    if (this.isPlaying) {
                        this.startProgressUpdate();
                    } else {
                        this.stopProgressUpdate();
                    }
                } else {
                    this.isPlaying = false;
                    this.stopProgressUpdate();
                }
            });

            this.player.connect().then(success => {
                if (success) {
                    console.log('Player connected successfully');
                } else {
                    console.error('Player connection failed');
                }
            }).catch(err => {
                console.error('Error connecting player:', err);
            });

            this.playerInitialized = true;
        };

        setTimeout(() => {
            if (!window.Spotify) {
                console.error('Spotify SDK failed to load. Please ensure the script is included in index.html.');
            }
        }, 1000);
    },

    startProgressUpdate() {
        if (!this.progressInterval) {
            this.progressInterval = setInterval(() => {
                if (this.isPlaying) {
                    this.trackPosition += 1; // Increment by 1 second
                    if (this.trackPosition > this.trackDuration) {
                        this.trackPosition = this.trackDuration;
                        this.stopProgressUpdate();
                    }
                    this.updateProgressBar(this.trackPosition, this.trackDuration);
                }
            }, 1000);
        }
    },

    stopProgressUpdate() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    },

    updateProgressBar(position, duration) {
        const currentTimeElement = document.getElementById('current-time');
        const totalTimeElement = document.getElementById('total-time');
        const progressBar = document.getElementById('song-progress');

        currentTimeElement.textContent = this.formatTime(position);
        totalTimeElement.textContent = this.formatTime(duration);
        const progressPercentage = (position / duration) * 100;
        progressBar.style.width = `${progressPercentage}%`;
    },

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    },

    async refreshAccessToken() {
        const tokens = Storage.getTokens();
        if (!tokens.refresh_token) {
            console.error('No refresh token available');
            return null;
        }

        try {
            const response = await fetch(`http://127.0.0.1:3000/api/auth/refresh_token?refresh_token=${tokens.refresh_token}`);
            const data = await response.json();
            if (data.access_token) {
                Storage.saveTokens({
                    access_token: data.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_in: data.expires_in,
                });
                this.tokenExpirationTime = Date.now() + (data.expires_in * 1000);
                return data.access_token;
            } else {
                console.error('Failed to refresh token:', data);
                return null;
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            return null;
        }
    },

    async getValidAccessToken() {
        const tokens = Storage.getTokens();
        if (Date.now() > this.tokenExpirationTime) {
            console.log('Access token expired, refreshing...');
            const newAccessToken = await this.refreshAccessToken();
            return newAccessToken || tokens.access_token;
        }
        return tokens.access_token;
    },

    async getUserProfile(access_token) {
        try {
            const response = await fetch('https://api.spotify.com/v1/me', {
                headers: { 'Authorization': `Bearer ${access_token}` },
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    },

    async getPlaylists(access_token) {
        try {
            const response = await fetch('https://api.spotify.com/v1/me/playlists', {
                headers: { 'Authorization': `Bearer ${access_token}` },
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching playlists:', error);
            return null;
        }
    },

    async getPlaylistTracks(access_token, playlistId) {
        try {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
                headers: { 'Authorization': `Bearer ${access_token}` },
            });
            return await response.json();
        } catch (error) {
            console.error('Error fetching playlist tracks:', error);
            return null;
        }
    },

    async createPlaylist(access_token, user_id, name, tracks) {
        try {
            const playlist = await fetch(`https://api.spotify.com/v1/users/${user_id}/playlists`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    public: false,
                    description: 'Created by MoodMelody',
                }),
            }).then(res => res.json());

            await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uris: tracks.map(track => track.uri),
                }),
            });
            return playlist;
        } catch (error) {
            console.error('Error creating playlist:', error);
            return null;
        }
    },

    async searchTracks(access_token, query, mood) {
        const moodGenres = {
            happy: ['pop', 'dance', 'upbeat'],
            sad: ['acoustic', 'indie', 'ballad'],
            relaxed: ['chill', 'ambient', 'classical'],
            angry: ['rock', 'metal', 'punk'],
            anxious: ['lo-fi', 'ambient', 'instrumental'],
            amazed: ['epic', 'cinematic', 'uplifting'],
            surprised: ['pop', 'dance', 'energetic'],
            energetic: ['dance', 'edm', 'upbeat'],
            nostalgic: ['retro', '80s', 'classic'],
            romantic: ['romantic', 'love songs', 'ballad']
        };
        const genres = moodGenres[mood] || ['pop'];
        const searchQuery = genres[0];
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`;
        console.log('Spotify search URL:', url);

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${access_token}` },
            });
            if (!response.ok) {
                console.error('Spotify search failed:', response.status, await response.text());
                return null;
            }
            const data = await response.json();
            console.log('Spotify search response:', JSON.stringify(data, null, 2));
            return data;
        } catch (error) {
            console.error('Error searching tracks:', error);
            return null;
        }
    },

    async playTrack(trackUri) {
        if (!this.deviceId) {
            console.error('Device ID not available. Player not ready.');
            return Promise.reject('Device ID not available');
        }
        const access_token = await this.getValidAccessToken();
        console.log('Playing track with device ID:', this.deviceId, 'URI:', trackUri);
        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uris: [trackUri],
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Play track failed:', response.status, errorText);
                return Promise.reject(new Error(`Play track failed: ${errorText}`));
            }
            console.log('Playback started successfully');
            this.isPlaying = true;
            this.updatePlayerState('playing');
            return Promise.resolve();
        } catch (error) {
            console.error('Error playing track:', error.message);
            return Promise.reject(error);
        }
    },

    async togglePlayPause() {
        if (this.player) {
            this.player.togglePlay().then(() => {
                this.player.getCurrentState().then(state => {
                    if (state) {
                        this.isPlaying = !state.paused;
                        this.updatePlayerState(this.isPlaying ? 'playing' : 'paused');
                        if (this.isPlaying) {
                            this.startProgressUpdate();
                        } else {
                            this.stopProgressUpdate();
                        }
                    } else {
                        this.isPlaying = false;
                        this.updatePlayerState('paused');
                        this.stopProgressUpdate();
                    }
                });
            }).catch(err => {
                console.error('Error toggling play/pause:', err);
            });
        } else {
            console.error('Player not initialized');
        }
    },

    async nextTrack() {
        if (this.player) {
            this.player.nextTrack().then(() => {
                setTimeout(() => {
                    this.player.getCurrentState().then(state => {
                        if (state) {
                            this.currentTrack = state.track_window.current_track;
                            this.isPlaying = !state.paused;
                            this.trackDuration = state.duration / 1000;
                            this.trackPosition = state.position / 1000;
                            UI.updateTrackInfo(this.currentTrack);
                            UI.updatePlayerState(this.isPlaying ? 'playing' : 'paused');
                            this.updateProgressBar(this.trackPosition, this.trackDuration);
                            if (this.isPlaying) {
                                this.startProgressUpdate();
                            } else {
                                this.stopProgressUpdate();
                            }
                        }
                    });
                }, 500);
            });
        } else {
            console.error('Player not initialized');
        }
    },

    async previousTrack() {
        if (this.player) {
            this.player.previousTrack().then(() => {
                setTimeout(() => {
                    this.player.getCurrentState().then(state => {
                        if (state) {
                            this.currentTrack = state.track_window.current_track;
                            this.isPlaying = !state.paused;
                            this.trackDuration = state.duration / 1000;
                            this.trackPosition = state.position / 1000;
                            UI.updateTrackInfo(this.currentTrack);
                            UI.updatePlayerState(this.isPlaying ? 'playing' : 'paused');
                            this.updateProgressBar(this.trackPosition, this.trackDuration);
                            if (this.isPlaying) {
                                this.startProgressUpdate();
                            } else {
                                this.stopProgressUpdate();
                            }
                        }
                    });
                }, 500);
            });
        } else {
            console.error('Player not initialized');
        }
    },

    updatePlayerState(state) {
        UI.updatePlayerState(state);
    },
};