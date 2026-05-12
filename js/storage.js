const Storage = {
    saveUserData(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },
    getUserData() {
        return JSON.parse(localStorage.getItem('user')) || null;
    },
    clearUserData() {
        localStorage.removeItem('user');
    },
    saveMoodHistory(moodEntry) {
        if (!this.getSettings().saveHistory) return;
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
    clearTokens() {
        localStorage.removeItem('spotifyTokens');
    },
    getSettings() {
        const defaults = { moodSensitivity: 'medium', discoveryLevel: 'medium', saveHistory: true };
        const stored = JSON.parse(localStorage.getItem('settings')) || {};
        return { ...defaults, ...stored };
    },
    saveSettings(partial) {
        const merged = { ...this.getSettings(), ...partial };
        localStorage.setItem('settings', JSON.stringify(merged));
    },
};
