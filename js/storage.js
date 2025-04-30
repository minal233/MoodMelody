const Storage = {
    saveUserData(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },
    getUserData() {
        return JSON.parse(localStorage.getItem('user')) || null;
    },
    saveMoodHistory(moodEntry) {
        const history = JSON.parse(localStorage.getItem('moodHistory')) || [];
        history.push(moodEntry);
        localStorage.setItem('moodHistory', JSON.stringify(history));
    },
    getMoodHistory() {
        return JSON.parse(localStorage.getItem('moodHistory')) || [];
    },
    clearMoodHistory() {
        localStorage.removeItem('moodHistory');
    },
    saveTokens({ access_token, refresh_token, expires_in }) {
        localStorage.setItem('spotifyTokens', JSON.stringify({
            access_token,
            refresh_token,
            expires_in,
            timestamp: Date.now(),
        }));
    },
    getTokens() {
        return JSON.parse(localStorage.getItem('spotifyTokens')) || null;
    },
};