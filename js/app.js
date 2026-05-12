document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing MoodMelody...');
    UI.init();
    await Spotify.init();

    const tokens = Storage.getTokens();
    if (tokens && tokens.access_token) {
        const user = await Spotify.getUserProfile(tokens.access_token);
        if (user && !user.error) {
            Storage.saveUserData(user);
            document.querySelector('.user-name').textContent = user.display_name || user.id;
            document.getElementById('spotify-connect').style.display = 'none';
            document.getElementById('spotify-disconnect').style.display = '';
        }
        UI.updateTrackInfo(null);
    }
});
