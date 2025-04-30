document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing MoodMelody...');
    await Spotify.init();
    await Chatbot.init(); // Should only run once due to welcomeMessageAdded flag
    UI.init();

    const tokens = Storage.getTokens();
    if (tokens && tokens.access_token) {
        const user = await Spotify.getUserProfile(tokens.access_token);
        if (user) {
            Storage.saveUserData(user);
            document.querySelector('.user-name').textContent = user.display_name || user.id;
        }
    }
});