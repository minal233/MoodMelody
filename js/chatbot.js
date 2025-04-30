const Chatbot = {
    GEMINI_API_KEY: 'AIzaSyBRckKXzvKlcwTktPB26CXWsrmUTPkck6o',
    moodKeywords: {
        happy: ['happy', 'good', 'excited', 'joyful', 'cheerful', 'glad', 'thrilled', 'delighted', 'content'],
        sad: ['sad', 'depressed', 'down', 'melancholy', 'blue', 'gloomy', 'miserable', 'heartbroken'],
        relaxed: ['relaxed', 'calm', 'peaceful', 'chill', 'serene', 'tranquil', 'rested'],
        angry: ['angry', 'frustrated', 'upset', 'irritated', 'mad', 'annoyed', 'furious', 'enraged'],
        anxious: ['anxious', 'nervous', 'worried', 'stressed', 'tense', 'uneasy', 'overwhelmed'],
        amazed: ['amazed', 'astonished', 'stunned', 'shocked', 'awe', 'wonder', 'incredible'],
        surprised: ['surprised', 'shocked', 'startled', 'taken aback', 'unexpected'],
        energetic: ['energetic', 'dancing', 'lively', 'vibrant', 'active', 'upbeat', 'pumped'],
        nostalgic: ['nostalgic', 'memories', 'old times', 'sentimental', 'throwback', 'reminiscing'],
        romantic: ['romantic', 'love', 'in love', 'affectionate', 'passionate', 'sweet']
    },
    welcomeMessageAdded: false,
    currentMood: null,
    awaitingConfirmation: false,

    async init() {
        if (!this.welcomeMessageAdded) {
            const messages = document.getElementById('chat-messages');
            messages.innerHTML = '';
            UI.addBotMessage('Hi there! I\'m your MoodMelody assistant. How are you feeling today? I can recommend music based on your mood!');
            this.welcomeMessageAdded = true;
        }
    },

    async processUserInput(input) {
        UI.showLoading(true);
        const lowerInput = input.toLowerCase();

        if (this.awaitingConfirmation && ['ok', 'yes', 'sure', 'great'].includes(lowerInput)) {
            if (this.currentMood) {
                const tokens = Storage.getTokens();
                if (tokens && tokens.access_token) {
                    const tracks = await Spotify.searchTracks(tokens.access_token, this.currentMood, this.currentMood);
                    console.log('Tracks received:', tracks); // Debug log
                    if (tracks && tracks.tracks && tracks.tracks.items && tracks.tracks.items.length > 0) {
                        console.log('Showing recommendations:', tracks.tracks.items); // Debug log
                        UI.showRecommendations(tracks.tracks.items, this.currentMood);
                        Storage.saveMoodHistory({
                            mood: this.currentMood,
                            input,
                            tracks: tracks.tracks.items,
                            timestamp: new Date().toISOString(),
                        });
                    } else {
                        console.log('No tracks found in response:', tracks);
                        UI.addBotMessage("I couldn't find any tracks for that mood. Let's try something else! How are you feeling now?");
                    }
                } else {
                    UI.addBotMessage("Please connect to Spotify to get music recommendations!");
                }
                this.awaitingConfirmation = false;
            }
        } else {
            const mood = this.detectMood(lowerInput);
            if (mood) {
                this.currentMood = mood;
                const botResponse = await this.getGeminiResponse(lowerInput, mood);
                UI.addBotMessage(botResponse);
                UI.addBotMessage("Would you like me to find some music for that mood? Just say 'yes' or 'ok'!");
                this.awaitingConfirmation = true;
            } else {
                UI.addBotMessage("I couldn't quite catch your mood. Could you tell me more about how you're feeling?");
                this.awaitingConfirmation = false;
            }
        }
        UI.showLoading(false);
    },

    detectMood(input) {
        let bestMatch = null;
        let bestMatchScore = 0;

        for (const [mood, keywords] of Object.entries(this.moodKeywords)) {
            // Check for exact matches first
            const exactMatch = keywords.find(keyword => input.includes(keyword));
            if (exactMatch) {
                return mood; // Return immediately on exact match
            }

            // If no exact match, calculate a score based on partial matches
            let score = 0;
            keywords.forEach(keyword => {
                if (input.includes(keyword)) {
                    score += 1;
                }
            });

            if (score > bestMatchScore) {
                bestMatchScore = score;
                bestMatch = mood;
            }
        }

        return bestMatch; // Return the mood with the highest score, or null if no match
    },

    async getGeminiResponse(input, detectedMood) {
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a music recommendation assistant. The user said: "${input}". Detected mood: ${detectedMood || 'unknown'}. Respond empathetically and suggest music vibes that match or uplift their mood. Keep it concise and friendly.`
                        }]
                    }]
                }),
            });
            const data = await response.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Error with Gemini API:', error);
            return 'I understand you! Let me suggest some music to match your vibe.';
        }
    },
};