document.addEventListener("DOMContentLoaded", () => {
  const sessionId = Math.random().toString(36).substring(2, 15);
  const textInput = document.getElementById("text-input");
  const sendButton = document.getElementById("send-button");
  const characterImage = document.getElementById("character-image");
  const voiceSelect = document.getElementById("voice-select");
  const status = document.getElementById("status");

  // --- Emotion-based image system ---
  const VALID_EMOTIONS = [
    "default",
    "happy",
    "blushed",
    "laugh",
    "love",
    "sad",
    "angry",
    "intrigue",
    "smug",
  ];
  let currentEmotion = "default";

  // Preload all expression images to avoid flicker when switching
  const emotionImages = {};
  VALID_EMOTIONS.forEach((emotion) => {
    const closed = new Image();
    const opened = new Image();

    closed.onerror = () => {
      closed.onerror = null;
      closed.src = `/static/images/expressions/default/default_closed.png?v=${sessionId}`;
    };

    opened.onerror = () => {
      opened.onerror = null;
      opened.src = `/static/images/expressions/default/default_open.png?v=${sessionId}`;
    };

    closed.src = `/static/images/expressions/${emotion}/${emotion}_closed.png?v=${sessionId}`;
    opened.src = `/static/images/expressions/${emotion}/${emotion}_open.png?v=${sessionId}`;
    emotionImages[emotion] = { closed, opened };
  });

  // Helper: get the correct image src for an emotion
  function getEmotionSrc(emotion, mouth) {
    const key = VALID_EMOTIONS.includes(emotion) ? emotion : "default";
    return emotionImages[key][mouth].src;
  }

  // Set initial image
  characterImage.src = getEmotionSrc("default", "closed");

  let voices = [];
  let lipSyncInterval;
  let ttsConfig = { tts_type: "BROWSER", edge_voice: "" };
  let currentAudio = null;

  // Load TTS Config from backend
  async function loadTtsConfig() {
    try {
      const res = await fetch("/tts-config");
      if (res.ok) {
        ttsConfig = await res.json();
        if (ttsConfig.tts_type === "EDGE") {
          // Hide the voice selector if using server Edge TTS
          voiceSelect.style.display = "none";
        }
      }
    } catch (e) {
      console.error("Failed to load TTS config:", e);
    }
  }
  loadTtsConfig();

  function populateVoiceList() {
    if (ttsConfig.tts_type === "EDGE") return; // Not needed for Edge TTS

    const allVoices = speechSynthesis.getVoices();
    voices = allVoices.filter((voice) => voice.name.includes("Google"));
    if (voices.length === 0) {
      voices = allVoices; // Fallback to all available system voices
    }
    voiceSelect.innerHTML = "";

    let usVoiceIndex = -1;

    voices.forEach((voice, i) => {
      const option = document.createElement("option");
      option.textContent = `${voice.name} (${voice.lang})`;
      option.setAttribute("data-lang", voice.lang);
      option.setAttribute("data-name", voice.name);
      voiceSelect.appendChild(option);

      if (voice.lang === "en-US") {
        if (usVoiceIndex === -1) {
          // Find the first US voice
          usVoiceIndex = i;
        }
      }
    });

    if (usVoiceIndex !== -1) {
      voiceSelect.selectedIndex = usVoiceIndex;
    }
  }

  populateVoiceList();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
  }

  const typewriter = (text, element, speed = 50) => {
    // Use Intl.Segmenter to handle grapheme clusters correctly
    if (window.Intl && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(undefined, {
        granularity: "grapheme",
      });
      const segments = Array.from(segmenter.segment(text)).map(
        (s) => s.segment,
      );

      let i = 0;
      element.innerHTML = "";

      function type() {
        if (i < segments.length) {
          element.innerHTML += segments[i];
          i++;
          setTimeout(type, speed);
        }
      }
      type();
    } else {
      // Fallback for older browsers
      let i = 0;
      element.innerHTML = "";
      function type() {
        if (i < text.length) {
          element.innerHTML += text.charAt(i);
          i++;
          setTimeout(type, speed);
        }
      }
      type();
    }
  };

  // Helper to start mouth lip sync (uses currentEmotion)
  function startLipSync() {
    clearInterval(lipSyncInterval);
    let mouthOpen = true;
    lipSyncInterval = setInterval(() => {
      characterImage.src = getEmotionSrc(
        currentEmotion,
        mouthOpen ? "opened" : "closed",
      );
      mouthOpen = !mouthOpen;
    }, 150);
  }

  // Helper to stop mouth lip sync
  function stopLipSync() {
    clearInterval(lipSyncInterval);
    characterImage.src = getEmotionSrc(currentEmotion, "closed");
  }

  const speak = async (text) => {
    // Cancel any active Web Speech synthesis
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    // Stop any active HTML5 audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    stopLipSync();

    // 1. Server-side Edge TTS implementation
    if (ttsConfig.tts_type === "EDGE") {
      try {
        const res = await fetch("/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: text }),
        });

        if (!res.ok) throw new Error("TTS generation failed");

        const audioBlob = await res.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        currentAudio = new Audio(audioUrl);

        currentAudio.onplay = () => {
          startLipSync();
        };

        currentAudio.onended = () => {
          stopLipSync();
          URL.revokeObjectURL(audioUrl);
        };

        currentAudio.onerror = () => {
          stopLipSync();
          URL.revokeObjectURL(audioUrl);
        };

        await currentAudio.play();
      } catch (err) {
        console.error("Edge TTS Error, falling back to Browser TTS:", err);
        fallbackSpeak(text);
      }
    } else {
      // 2. Default Browser TTS
      fallbackSpeak(text);
    }
  };

  const fallbackSpeak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedOption = voiceSelect.selectedOptions[0]
      ? voiceSelect.selectedOptions[0].getAttribute("data-name")
      : null;
    const selectedVoice = selectedOption
      ? voices.find((voice) => voice.name === selectedOption)
      : null;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => {
      startLipSync();
    };

    utterance.onend = () => {
      stopLipSync();
    };

    utterance.onerror = () => {
      stopLipSync();
    };

    speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async () => {
    const message = textInput.value.trim();
    if (!message) return;

    textInput.value = "";
    textInput.style.height = "50px";
    status.textContent = "Thinking...";

    try {
      const response = await fetch("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: message, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      // Update emotion from backend response
      if (data.emotion && VALID_EMOTIONS.includes(data.emotion)) {
        currentEmotion = data.emotion;
      } else {
        currentEmotion = "default";
      }
      // Immediately show the new expression (closed mouth)
      characterImage.src = getEmotionSrc(currentEmotion, "closed");
      console.log(`[Emotion] Set to: ${currentEmotion}`);

      typewriter(data.response, status);
      speak(data.response);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = "Sorry, something went wrong. Please try again.";
      typewriter(errorMessage, status);
      speak(errorMessage);
    }
  };

  sendButton.addEventListener("click", handleSendMessage);

  textInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  textInput.addEventListener("input", () => {
    textInput.style.height = "auto";
    textInput.style.height = `${textInput.scrollHeight}px`;
  });
});
