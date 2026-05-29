from dotenv import load_dotenv

load_dotenv()

from flask import Flask, render_template, request, jsonify, send_file
from google.adk.runners import InMemoryRunner
from google.genai import types
import asyncio
import os
import edge_tts
import io

app = Flask(__name__)

# Config
TTS_TYPE = os.getenv("TTS_TYPE", "EDGE").upper()  # "EDGE" or "BROWSER"
EDGE_VOICE = os.getenv("EDGE_VOICE", "es-MX-DaliaNeural")

runner = None
character_exists = os.path.exists("character.py")

if character_exists:
    import character

    runner = InMemoryRunner(
        agent=character.root_agent,
        app_name="demo_app",
    )


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/tts-config", methods=["GET"])
def tts_config():
    return jsonify({"tts_type": TTS_TYPE, "edge_voice": EDGE_VOICE})


@app.route("/speak", methods=["POST"])
async def speak_audio():
    text = request.json.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        # Generate speech in memory using edge-tts
        communicate = edge_tts.Communicate(text, EDGE_VOICE)
        audio_stream = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk.get("data") is not None:
                audio_stream.write(chunk["data"])
        
        audio_stream.seek(0)
        return send_file(
            audio_stream,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="speech.mp3"
        )
    except Exception as e:
        print(f"Edge TTS error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/chat", methods=["POST"])
async def chat():
    user_message = request.json.get("message")
    session_id = request.json.get("session_id", "default_session")

    if not character_exists:
        return jsonify({"response": user_message, "emotion": "default"})

    # Reset emotion before each interaction
    character.current_emotion = "default"

    # Retrieve or create session dynamically
    adk_session = await runner.session_service.get_session(
        app_name=runner.app_name, user_id="inapp_user", session_id=session_id
    )
    if adk_session is None:
        adk_session = await runner.session_service.create_session(
            app_name=runner.app_name, user_id="inapp_user", session_id=session_id
        )

    content = types.Content(role="user", parts=[types.Part(text=user_message)])
    response_text = ""
    async for event in runner.run_async(
        user_id=adk_session.user_id,
        session_id=adk_session.id,
        new_message=content,
    ):
        if event.content and event.content.parts and event.content.parts[0].text:
            response_text += event.content.parts[0].text

    # Capture the emotion that was set by the set_emotion tool during this interaction
    detected_emotion = character.current_emotion
    print(f"[Emotion] Detected: {detected_emotion}")

    return jsonify({"response": response_text, "emotion": detected_emotion})


if __name__ == "__main__":
    app.run(debug=True)
