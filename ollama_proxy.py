from flask import Flask, request, jsonify
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # permite accesul din browser

OLLAMA_URL = "http://localhost:11434/api/chat"

@app.route('/api/ollama', methods=['POST'])
def proxy_ollama():
    try:
        data = request.json
        response = requests.post(OLLAMA_URL, json=data, timeout=30)

        return jsonify(response.json())

    except Exception as e:
        return jsonify({"error": f"Ollama Proxy Error: {str(e)}"}), 500

if __name__ == '__main__':
    print("🚀 OLLAMA PROXY RUNNING on http://localhost:8000")
    app.run(host="0.0.0.0", port=8000)
