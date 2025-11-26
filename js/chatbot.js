// js/chatbot.js
const Chatbot = {
  // Enhanced mood detection using VADER + keyword boosting
  detectMood(text) {
    const analyzer = new vader.SentimentIntensityAnalyzer();
    const scores = analyzer.polarity_scores(text.toLowerCase());

    const compound = scores.compound; // -1 (very negative) to +1 (very positive)
    const positive = scores.pos;
    const negative = scores.neg;
    const neutral = scores.neu;

    // Keyword boosts for better accuracy
    const lower = text.toLowerCase();
    const keywords = {
      happy: ["happy", "joy", "great", "amazing", "love", "excited", "yay", "woohoo", "awesome"],
      sad: ["sad", "depressed", "lonely", "cry", "hurt", "down", "bad day", "miss"],
      calm: ["calm", "peaceful", "relax", "chill", "zen", "serene", "meditate", "breathe"],
      angry: ["angry", "mad", "hate", "annoyed", "frustrated", "pissed", "rage"],
      energetic: ["energy", "pumped", "dance", "party", "workout", "run", "hype", "let's go"],
      romantic: ["love", "crush", "date", "kiss", "heart", "baby", "sweet", "darling"],
      nostalgic: ["remember", "old times", "miss you", "childhood", "back then", "memories"],
      anxious: ["anxious", "worry", "stress", "nervous", "scared", "panic", "afraid"]
    };

    let detectedMood = "neutral";
    let confidence = 60;

    // Check for strong keyword matches first
    for (const [mood, words] of Object.entries(keywords)) {
      if (words.some(word => lower.includes(word))) {
        detectedMood = mood;
        confidence = 90;
        break;
      }
    }

    // Use VADER compound score if no strong keyword
    if (detectedMood === "neutral") {
      if (compound >= 0.5) {
        detectedMood = positive > negative ? "happy" : "excited";
        confidence = Math.min(95, 60 + compound * 40);
      } else if (compound <= -0.5) {
        detectedMood = negative > positive ? "sad" : "angry";
        confidence = Math.min(95, 60 + Math.abs(compound) * 40);
      } else if (compound > -0.2 && compound < 0.2 && neutral > 0.7) {
        detectedMood = "calm";
        confidence = 80;
      } else {
        detectedMood = "neutral";
        confidence = 50;
      }
    }

    return { mood: detectedMood, confidence: Math.round(confidence) };
  },

  async processUserInput(input) {
    UI.addUserMessage(input);
    UI.showLoading(true);

    const result = this.detectMood(input);
    const mood = result.mood;

    // Save to history
    Storage.saveMood({ input, mood, timestamp: Date.now() });

    // Friendly response
    const responses = {
      happy: "Yay! I'm so happy you're feeling great ♡ Let's celebrate with upbeat tunes!",
      sad: "I'm here for you... Let me play something soft and comforting",
      calm: "Ahh, peaceful vibes... Perfect time for chill melodies",
      angry: "Whoa, I feel that energy! Let's channel it with powerful beats",
      energetic: "Let's GOOO! Time for high-energy bangers!",
      romantic: "Aww, feeling the love? Here's something sweet and dreamy",
      nostalgic: "Taking a trip down memory lane? I've got the perfect throwbacks",
      anxious: "Take a deep breath... Let me help you relax with gentle music",
      neutral: "Hmm, mixed feelings? Let me play something uplifting!"
    };

    UI.addBotMessage(responses[mood] || "Got it! Finding music for your vibe...");

    // Search Spotify for mood-based tracks
    const tracks = await Spotify.searchTracks(mood);
    
    if (tracks && tracks.tracks.items.length > 0) {
      UI.showRecommendations(tracks.tracks.items.slice(0, 10), mood);
    } else {
      UI.addBotMessage("Couldn't find songs right now. Try typing how you feel!");
    }

    UI.showLoading(false);
  }
};