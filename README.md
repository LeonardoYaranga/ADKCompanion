# WakuWaku - AI Companion with Google ADK

This project is built using **Google ADK (Agent Development Kit)** with a Flask backend. It uses **Function Calling / Tools** so the AI can change facial expressions intelligently and contextually based on the conversation.

### How does the animation work?
To simulate real-time speech, the system uses a pair of images for each emotion:
1. An image with the **mouth closed** (`_closed.png`).
2. An image with the **mouth open** (`_open.png`).

During responses, the frontend alternates between the two images in sync with the voice (synthesized via **Edge TTS** or the browser) to create a classic, smooth lip-sync animation.

---

## 🚀 Installation and Setup

### 1. Prepare Environment Variables
Before starting the project, create a `.env` file at the root of the `ADKCompanion` folder to configure your Gemini API key and voice options:

1. Duplicate or rename `.env.template` to `.env`.
2. Edit your `.env` file and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   TTS_TYPE=EDGE
   EDGE_VOICE=zh-CN-XiaoxiaoNeural
   ```

### 2. Quick Start (Windows / PowerShell)
To activate the virtual environment, install dependencies and start the server in one step, run from the `ADKCompanion` folder:
```powershell
.\run_windows.ps1
```

### 3. Alternative (Linux / macOS)
If you use Linux or macOS, run:
```bash
source .venv/bin/activate
source ./set_env.sh
python app.py
```

---

## 🤖 Recommended Google Models

You can change the model used by editing the `model` variable in `character.py`.

* `gemini-3.1-flash-lite` **(Recommended)**: Extremely fast and efficient; includes a generous free daily quota on Google AI Studio (500 requests/day).
* `gemini-2.5-flash`: Strong reasoning and native tools compatibility.
* `gemma-4-26b`: An open model, useful if you want to experiment with local or external alternatives.

---

## 🔊 Available Voices (Edge TTS)

If you set `TTS_TYPE=EDGE` in your `.env`, list all available voices with:
```powershell
.\.venv\Scripts\python.exe -m edge_tts --list-voices
```

### Suggested Voices:
* **Japanese**: `ja-JP-NanamiNeural`
* **English**: `en-GB-LibbyNeural`
* **Spanish (Mexico)**: `es-MX-DaliaNeural`
* **Chinese**: `zh-CN-XiaoxiaoNeural`
* **Spanish**: `es-PY-TaniaNeural`

---

## 🎨 Extension and Customization

Customizing your AI companion is straightforward and doesn't require advanced programming skills:

### 1. Change Personality or Language
Open `character.py` and edit the text inside `instruction=""" ... """`. You can rewrite the description in Spanish to make the companion respond in Spanish, ask it to act differently, or change the character entirely.

### 2. Add New Expressions and Emotions
If you want to add a completely new emotion (for example: `sorprendida`):

1. **Create the Images**: Add a new folder under `static/images/expressions/` named after your emotion (e.g. `sorprendida`). Inside it, place the two images using this exact format:
   * `/static/images/expressions/sorprendida/sorprendida_closed.png`
   * `/static/images/expressions/sorprendida/sorprendida_open.png`

2. **Register it in the Backend**: Open `character.py` and add your new emotion to the `VALID_EMOTIONS` list:
   ```python
   VALID_EMOTIONS = ["default", "happy", "angry", "blushed", "curious", "laugh", "love", "sorprendida"]
   ```
   You can also add a short description of the new emotion in the `set_emotion` function docstring so the virtual companion knows when to use it.

3. **Register it in the Frontend**: Open `app.js` and add it to the `VALID_EMOTIONS` list (line 10):
   ```javascript
   const VALID_EMOTIONS = ['default', 'happy', 'angry', 'blushed', 'curious', 'laugh', 'love', 'sorprendida'];
   ```

That's it! The system will load the images automatically on the web UI and the character will start using them when it feels `sorprendida` based on conversation context.
