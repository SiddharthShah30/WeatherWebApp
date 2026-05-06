import os
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

BASE_URL = "https://api.openweathermap.org/data/2.5"
API_KEY = os.getenv("OPENWEATHER_API_KEY")


def call_openweather(endpoint, params):
    params = params.copy()
    params["appid"] = API_KEY
    response = requests.get(f"{BASE_URL}/{endpoint}", params=params, timeout=10)
    response.raise_for_status()
    return response.json()


@app.get("/api/weather")
def weather():
    if not API_KEY:
        return jsonify({"error": "Missing OPENWEATHER_API_KEY"}), 500

    city = request.args.get("city")
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    units = request.args.get("units", "metric")

    if not city and not (lat and lon):
        return jsonify({"error": "Provide city or lat/lon"}), 400

    if city:
        params = {"q": city, "units": units}
    else:
        params = {"lat": lat, "lon": lon, "units": units}

    current = call_openweather("weather", params)
    forecast = call_openweather("forecast", params)

    return jsonify({
        "current": current,
        "forecast": forecast
    })


@app.get("/api/air")
def air_quality():
    if not API_KEY:
        return jsonify({"error": "Missing OPENWEATHER_API_KEY"}), 500

    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not (lat and lon):
        return jsonify({"error": "Provide lat/lon"}), 400

    data = call_openweather("air_pollution", {"lat": lat, "lon": lon})
    return jsonify(data)


@app.get("/api/uv-alerts")
def uv_alerts():
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not (lat and lon):
        return jsonify({"error": "Provide lat/lon"}), 400

    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "uv_index_max,weather_code",
        "timezone": "auto",
        "forecast_days": 1
    }
    response = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    uv_max = None
    weather_code = None
    if data.get("daily"):
        uv_values = data["daily"].get("uv_index_max") or []
        codes = data["daily"].get("weather_code") or []
        uv_max = uv_values[0] if uv_values else None
        weather_code = codes[0] if codes else None

    alerts = []
    if weather_code is not None:
        if weather_code in (95, 96, 99):
            alerts.append("Thunderstorm risk")
        elif weather_code in (80, 81, 82):
            alerts.append("Rain showers likely")
        elif weather_code in (61, 63, 65, 66, 67):
            alerts.append("Rain likely")
        elif weather_code in (71, 73, 75, 77, 85, 86):
            alerts.append("Snow likely")
        elif weather_code in (45, 48):
            alerts.append("Fog possible")

    return jsonify({
        "uv_max": uv_max,
        "weather_code": weather_code,
        "alerts": alerts
    })


if __name__ == "__main__":
    app.run(debug=True)