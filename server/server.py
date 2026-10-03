import os
import re
import sys
import time
import random
import hashlib
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import imageio_ffmpeg

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Base directories
BASE_DIR = Path(__file__).resolve().parent
CACHE_DIR = BASE_DIR / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Find FFmpeg binary
try:
    FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_PATH = "ffmpeg"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
]

def get_random_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.youtube.com/"
    }

def extract_video_id(url: str):
    if not url:
        return None
    url = url.strip()
    match = re.search(r"(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]{11})", url)
    return match.group(1) if match else None

def sanitize_filename(name: str):
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def format_duration(seconds: int):
    if not seconds:
        return "0:00"
    mins = seconds // 60
    secs = seconds % 60
    return f"{mins}:{secs:02d}"

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "Saver For TUBE Engine",
        "version": "1.0.0",
        "ffmpeg": bool(FFMPEG_PATH),
        "cache_files": len(list(CACHE_DIR.glob("*.mp3")))
    })

@app.route("/api/info", methods=["GET", "POST"])
def get_video_info():
    url = request.args.get("url") or (request.json and request.json.get("url"))
    if not url:
        return jsonify({"error": "Missing video URL"}), 400

    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({"error": "Invalid YouTube URL format"}), 400

    canonical_url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["web_safari", "web_embedded", "mweb", "android", "ios"]
            }
        },
        "http_headers": get_random_headers()
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(canonical_url, download=False)
            duration_secs = info.get("duration") or 0
            title = info.get("title") or "YouTube Track"
            author = info.get("uploader") or info.get("channel") or "YouTube Creator"
            thumbnail = info.get("thumbnail") or f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
            view_count = info.get("view_count") or 0

            return jsonify({
                "success": True,
                "video_id": video_id,
                "title": title,
                "author": author,
                "duration": duration_secs,
                "duration_formatted": format_duration(duration_secs),
                "thumbnail": thumbnail,
                "view_count": view_count
            })
    except Exception as e:
        return jsonify({
            "success": True,
            "video_id": video_id,
            "title": f"YouTube Audio ({video_id})",
            "author": "YouTube Creator",
            "duration": 0,
            "duration_formatted": "0:00",
            "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        })

@app.route("/api/download", methods=["GET"])
def download_mp3():
    url = request.args.get("url")
    quality = request.args.get("quality", "320")
    if quality not in ["320", "256", "192", "128", "64"]:
        quality = "320"

    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({"error": "Invalid YouTube URL"}), 400

    canonical_url = f"https://www.youtube.com/watch?v={video_id}"
    cache_key = f"{video_id}_{quality}kbps"
    cached_file = CACHE_DIR / f"{cache_key}.mp3"

    if cached_file.exists() and cached_file.stat().st_size > 50000:
        meta_file = CACHE_DIR / f"{video_id}.title"
        title = meta_file.read_text("utf-8") if meta_file.exists() else f"track_{video_id}"
        download_name = f"{sanitize_filename(title)} ({quality}kbps).mp3"
        return send_file(
            cached_file,
            mimetype="audio/mpeg",
            as_attachment=True,
            download_name=download_name
        )

    temp_target = CACHE_DIR / f"{cache_key}"
    ydl_opts = {
        "format": "ba/b",
        "outtmpl": str(temp_target) + ".%(ext)s",
        "ffmpeg_location": FFMPEG_PATH,
        "extractor_args": {
            "youtube": {
                "player_client": ["web_safari", "web_embedded", "mweb", "android", "ios"]
            }
        },
        "http_headers": get_random_headers(),
        "postprocessors": [{
            "key": "FFmpegExtractAudio",
            "preferredcodec": "mp3",
            "preferredquality": quality,
        }],
        "quiet": True,
        "no_warnings": True
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(canonical_url, download=True)
            title = info.get("title") or f"audio_{video_id}"
            
            (CACHE_DIR / f"{video_id}.title").write_text(title, "utf-8")

            final_mp3 = CACHE_DIR / f"{cache_key}.mp3"
            if final_mp3.exists() and final_mp3.stat().st_size > 50000:
                download_name = f"{sanitize_filename(title)} ({quality}kbps).mp3"
                return send_file(
                    final_mp3,
                    mimetype="audio/mpeg",
                    as_attachment=True,
                    download_name=download_name
                )
            else:
                return jsonify({"error": "Audio conversion failed"}), 500
    except Exception as e:
        return jsonify({"error": f"Conversion error: {str(e)}"}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
