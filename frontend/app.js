const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const geoBtn = document.getElementById("geoBtn");
const unitButtons = document.querySelectorAll(".unit-btn");
const pageBody = document.body;

const tempCard = document.getElementById("tempCard");
const feelsCard = document.getElementById("feelsCard");
const windCard = document.getElementById("windCard");
const humidityCard = document.getElementById("humidityCard");
const pressureCard = document.getElementById("pressureCard");
const cloudsCard = document.getElementById("cloudsCard");
const visibilityCard = document.getElementById("visibilityCard");
const sunriseCard = document.getElementById("sunriseCard");
const sunsetCard = document.getElementById("sunsetCard");
const precipCard = document.getElementById("precipCard");
const aqiCard = document.getElementById("aqiCard");
const uvCard = document.getElementById("uvCard");

const posterCity = document.getElementById("posterCity");
const posterTemp = document.getElementById("posterTemp");
const posterDesc = document.getElementById("posterDesc");
const weatherStage = document.getElementById("weatherStage");

const activitySummary = document.getElementById("activitySummary");
const activityList = document.getElementById("activityList");

const forecastStrip = document.getElementById("forecastStrip");
const climateStrip = document.getElementById("climateStrip");
const statusMsg = document.getElementById("statusMsg");
const regionSelect = document.getElementById("regionSelect");
const regionLoadBtn = document.getElementById("regionLoadBtn");
const regionSummary = document.getElementById("regionSummary");
const regionGrid = document.getElementById("regionGrid");
const alertsList = document.getElementById("alertsList");

let map;
let markersLayer;
let currentMarker;
let lastContext = null;

let units = "metric";
const storedUnits = localStorage.getItem("units");
if (storedUnits === "metric" || storedUnits === "imperial") {
  units = storedUnits;
}

unitButtons.forEach(btn => {
  btn.classList.toggle("active", btn.dataset.units === units);
});

function unitLabel() {
  return units === "metric" ? "C" : "F";
}

function windLabel() {
  return units === "metric" ? "m/s" : "mph";
}

function tempUnitLabel() {
  return units === "metric" ? "C" : "F";
}

function buildCard(el, title, value, sub) {
  el.innerHTML = `
    <div class="metric-title">${title}</div>
    <div class="metric-value">${value}</div>
    <div class="metric-sub">${sub}</div>
  `;
}

function setStatus(message, type) {
  statusMsg.textContent = message;
  statusMsg.classList.remove("ok", "error");
  if (type) {
    statusMsg.classList.add(type);
  }
}

function setThemeByTemp(temp, isNight) {
  pageBody.classList.remove("weather-hot", "weather-cold", "weather-mild", "weather-night");
  if (isNight) {
    pageBody.classList.add("weather-night");
    return;
  }
  if (units === "metric") {
    if (temp >= 28) {
      pageBody.classList.add("weather-hot");
    } else if (temp <= 8) {
      pageBody.classList.add("weather-cold");
    } else {
      pageBody.classList.add("weather-mild");
    }
  } else {
    if (temp >= 82) {
      pageBody.classList.add("weather-hot");
    } else if (temp <= 46) {
      pageBody.classList.add("weather-cold");
    } else {
      pageBody.classList.add("weather-mild");
    }
  }
}

function setLoadingState(message) {
  setStatus(message);
  buildCard(tempCard, "Temp", "--", "Loading");
  buildCard(feelsCard, "Feels", "--", "Loading");
  buildCard(windCard, "Wind", "--", "Loading");
  buildCard(humidityCard, "Humidity", "--", "Loading");
  buildCard(pressureCard, "Pressure", "--", "Loading");
  buildCard(cloudsCard, "Clouds", "--", "Loading");
  buildCard(visibilityCard, "Visibility", "--", "Loading");
  buildCard(sunriseCard, "Sunrise", "--", "Loading");
  buildCard(sunsetCard, "Sunset", "--", "Loading");
  buildCard(precipCard, "Precip", "--", "Loading");
  buildCard(aqiCard, "Air", "--", "Loading");
  buildCard(uvCard, "UV", "--", "Loading");

  posterCity.textContent = "--";
  posterTemp.textContent = "--";
  posterDesc.textContent = "Loading";
  activitySummary.textContent = "Loading suggestions...";
  activityList.innerHTML = "";
  forecastStrip.innerHTML = "";
  climateStrip.innerHTML = "";
}

function formatTime(timestamp, timezoneOffset) {
  if (!timestamp) return "n/a";
  const date = new Date((timestamp + timezoneOffset) * 1000);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDistance(meters) {
  if (typeof meters !== "number") return "n/a";
  return `${(meters / 1000).toFixed(1)} km`;
}

function aqiLabel(aqi) {
  const labels = {
    1: "Good",
    2: "Fair",
    3: "Moderate",
    4: "Poor",
    5: "Very Poor"
  };
  return labels[aqi] || "n/a";
}

function initMap() {
  map = L.map("worldMap", { zoomControl: false }).setView([20, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);
}

function setRegionMarkers(cities) {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  cities.forEach(city => {
    L.circleMarker([city.lat, city.lon], {
      radius: 6,
      color: "#111111",
      fillColor: "#e53935",
      fillOpacity: 0.8,
      weight: 2
    })
      .addTo(markersLayer)
      .bindPopup(city.name);
  });
}

function setCurrentMarker(lat, lon, label) {
  if (!map) return;
  if (!currentMarker) {
    currentMarker = L.circleMarker([lat, lon], {
      radius: 8,
      color: "#111111",
      fillColor: "#2e86c1",
      fillOpacity: 0.9,
      weight: 2
    }).addTo(map);
  }
  currentMarker.setLatLng([lat, lon]);
  currentMarker.bindPopup(label || "Current");
  map.setView([lat, lon], 4);
}

const REGION_CITIES = {
  global: [
    { name: "New York", lat: 40.7128, lon: -74.0060 },
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "Delhi", lat: 28.6139, lon: 77.2090 },
    { name: "Sydney", lat: -33.8688, lon: 151.2093 },
    { name: "Cape Town", lat: -33.9249, lon: 18.4241 },
    { name: "Rio", lat: -22.9068, lon: -43.1729 },
    { name: "Toronto", lat: 43.6532, lon: -79.3832 }
  ],
  north_america: [
    { name: "Vancouver", lat: 49.2827, lon: -123.1207 },
    { name: "San Francisco", lat: 37.7749, lon: -122.4194 },
    { name: "Mexico City", lat: 19.4326, lon: -99.1332 },
    { name: "Chicago", lat: 41.8781, lon: -87.6298 },
    { name: "New York", lat: 40.7128, lon: -74.0060 },
    { name: "Miami", lat: 25.7617, lon: -80.1918 }
  ],
  south_america: [
    { name: "Bogota", lat: 4.7110, lon: -74.0721 },
    { name: "Lima", lat: -12.0464, lon: -77.0428 },
    { name: "Santiago", lat: -33.4489, lon: -70.6693 },
    { name: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
    { name: "Rio", lat: -22.9068, lon: -43.1729 },
    { name: "Sao Paulo", lat: -23.5505, lon: -46.6333 }
  ],
  europe: [
    { name: "London", lat: 51.5074, lon: -0.1278 },
    { name: "Paris", lat: 48.8566, lon: 2.3522 },
    { name: "Berlin", lat: 52.5200, lon: 13.4050 },
    { name: "Madrid", lat: 40.4168, lon: -3.7038 },
    { name: "Rome", lat: 41.9028, lon: 12.4964 },
    { name: "Stockholm", lat: 59.3293, lon: 18.0686 }
  ],
  africa: [
    { name: "Cairo", lat: 30.0444, lon: 31.2357 },
    { name: "Lagos", lat: 6.5244, lon: 3.3792 },
    { name: "Nairobi", lat: -1.2921, lon: 36.8219 },
    { name: "Accra", lat: 5.6037, lon: -0.1870 },
    { name: "Cape Town", lat: -33.9249, lon: 18.4241 },
    { name: "Casablanca", lat: 33.5731, lon: -7.5898 }
  ],
  asia: [
    { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
    { name: "Seoul", lat: 37.5665, lon: 126.9780 },
    { name: "Beijing", lat: 39.9042, lon: 116.4074 },
    { name: "Bangkok", lat: 13.7563, lon: 100.5018 },
    { name: "Singapore", lat: 1.3521, lon: 103.8198 },
    { name: "Delhi", lat: 28.6139, lon: 77.2090 }
  ],
  oceania: [
    { name: "Sydney", lat: -33.8688, lon: 151.2093 },
    { name: "Melbourne", lat: -37.8136, lon: 144.9631 },
    { name: "Brisbane", lat: -27.4698, lon: 153.0251 },
    { name: "Auckland", lat: -36.8485, lon: 174.7633 },
    { name: "Perth", lat: -31.9505, lon: 115.8605 },
    { name: "Wellington", lat: -41.2866, lon: 174.7756 }
  ]
};

function setWeatherStage(condition, isNight) {
  weatherStage.classList.remove("sunny", "cloudy", "rainy", "snowy", "night");
  if (isNight) {
    weatherStage.classList.add("night");
  }
  weatherStage.classList.add(condition);
}

function renderActivities(context, uvMax) {
  if (!context) return;
  const { temp, wind, humidity, precipValue, condition, isNight } = context;
  const activities = [];
  const windLimit = units === "metric" ? 10 : 22;
  const hotLimit = units === "metric" ? 28 : 82;
  const coldLimit = units === "metric" ? 10 : 50;

  if (precipValue > 0 || ["Rain", "Drizzle", "Thunderstorm"].includes(condition)) {
    activities.push({
      title: "Indoor",
      note: "Coffee, library, or museum"
    });
  } else if (condition === "Snow") {
    activities.push({
      title: "Snow",
      note: "Snow walk or photography"
    });
  } else {
    activities.push({
      title: "Outdoor",
      note: "Walk, run, or bike"
    });
  }

  if (wind > windLimit) {
    activities.push({
      title: "Windy",
      note: "Skip cycling, consider indoor workout"
    });
  }

  if (temp >= hotLimit) {
    activities.push({
      title: "Hot",
      note: "Hydrate, shade, light clothing"
    });
  } else if (temp <= coldLimit) {
    activities.push({
      title: "Cold",
      note: "Layer up, warm drink"
    });
  }

  if (humidity >= 75) {
    activities.push({
      title: "Humid",
      note: "Slow pace, breathable fabrics"
    });
  }

  if (uvMax !== null && uvMax !== undefined) {
    if (uvMax >= 7) {
      activities.push({
        title: "High UV",
        note: "Sunscreen, hat, sunglasses"
      });
    } else if (uvMax >= 3) {
      activities.push({
        title: "Moderate UV",
        note: "Light sun protection"
      });
    }
  }

  if (isNight) {
    activities.push({
      title: "Night",
      note: "Stargazing or night walk"
    });
  }

  activitySummary.textContent = `${activities.length} suggestions based on current conditions.`;
  activityList.innerHTML = "";
  activities.forEach(item => {
    const el = document.createElement("div");
    el.className = "activity-item";
    el.innerHTML = `<strong>${item.title}</strong><span>${item.note}</span>`;
    activityList.appendChild(el);
  });
}

function renderForecast(list) {
  forecastStrip.innerHTML = "";
  list.slice(0, 6).forEach(item => {
    const date = new Date(item.dt * 1000);
    const hour = date.toLocaleTimeString([], { hour: "2-digit" });
    const temp = Math.round(item.main.temp);
    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <div>${hour}</div>
      <div>${temp}°${unitLabel()}</div>
      <div>${item.weather[0].main}</div>
    `;
    forecastStrip.appendChild(card);
  });
}

function renderClimate(list, timezoneOffset) {
  const daily = {};
  list.forEach(item => {
    const date = new Date((item.dt + timezoneOffset) * 1000);
    const key = date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    if (!daily[key]) {
      daily[key] = {
        min: item.main.temp,
        max: item.main.temp,
        pop: item.pop || 0,
        rain: 0
      };
    }
    daily[key].min = Math.min(daily[key].min, item.main.temp);
    daily[key].max = Math.max(daily[key].max, item.main.temp);
    daily[key].pop = Math.max(daily[key].pop, item.pop || 0);
    if (item.rain && item.rain["3h"]) {
      daily[key].rain += item.rain["3h"];
    }
  });

  climateStrip.innerHTML = "";
  Object.entries(daily)
    .slice(0, 5)
    .forEach(([day, info]) => {
      const card = document.createElement("div");
      card.className = "climate-card";
      card.innerHTML = `
        <div>${day}</div>
        <div>${Math.round(info.min)}°${tempUnitLabel()} / ${Math.round(info.max)}°${tempUnitLabel()}</div>
        <div>Rain ${info.rain.toFixed(1)} mm</div>
        <div>POP ${(info.pop * 100).toFixed(0)}%</div>
      `;
      climateStrip.appendChild(card);
    });
}

async function fetchWeather(params) {
  const url = new URL("http://127.0.0.1:5000/api/weather");
  Object.keys(params).forEach(key => url.searchParams.set(key, params[key]));
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch weather");
  }
  return response.json();
}

async function fetchAir(lat, lon) {
  const url = new URL("http://127.0.0.1:5000/api/air");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch air quality");
  }
  return response.json();
}

async function applyAirQuality(lat, lon) {
  try {
    const data = await fetchAir(lat, lon);
    const aqi = data.list && data.list[0] ? data.list[0].main.aqi : null;
    buildCard(aqiCard, "Air", aqiLabel(aqi), "AQI");
  } catch (error) {
    buildCard(aqiCard, "Air", "n/a", "AQI");
  }
}

async function fetchUvAlerts(lat, lon) {
  const url = new URL("http://127.0.0.1:5000/api/uv-alerts");
  url.searchParams.set("lat", lat);
  url.searchParams.set("lon", lon);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch UV/alerts");
  }
  return response.json();
}

function renderAlerts(alerts) {
  alertsList.innerHTML = "";
  if (!alerts || alerts.length === 0) {
    const item = document.createElement("div");
    item.className = "alert-item";
    item.textContent = "No active alerts.";
    alertsList.appendChild(item);
    return;
  }
  alerts.forEach(alert => {
    const item = document.createElement("div");
    item.className = "alert-item";
    item.textContent = alert;
    alertsList.appendChild(item);
  });
}

function buildRegionCard(cityName, data) {
  const temp = Math.round(data.current.main.temp);
  const main = data.current.weather[0].main;
  const wind = data.current.wind.speed.toFixed(1);
  const humidity = data.current.main.humidity;
  const card = document.createElement("div");
  card.className = "region-card";
  card.innerHTML = `
    <div><strong>${cityName}</strong></div>
    <div>${temp}°${tempUnitLabel()} - ${main}</div>
    <div>Wind ${wind} ${windLabel()}</div>
    <div>Humidity ${humidity}%</div>
  `;
  return card;
}

async function loadRegion(regionKey) {
  const cities = REGION_CITIES[regionKey] || [];
  regionGrid.innerHTML = "";
  regionSummary.textContent = "Loading region...";
  setRegionMarkers(cities);

  let tempTotal = 0;
  let humidityTotal = 0;
  let count = 0;
  let maxWind = 0;

  for (const city of cities) {
    try {
      const data = await fetchWeather({ city: city.name, units });
      regionGrid.appendChild(buildRegionCard(city.name, data));
      tempTotal += data.current.main.temp;
      humidityTotal += data.current.main.humidity;
      maxWind = Math.max(maxWind, data.current.wind.speed);
      count += 1;
    } catch (error) {
      const failCard = document.createElement("div");
      failCard.className = "region-card";
      failCard.innerHTML = `<div><strong>${city.name}</strong></div><div>Unavailable</div>`;
      regionGrid.appendChild(failCard);
    }
  }

  if (count > 0) {
    const avgTemp = Math.round(tempTotal / count);
    const avgHum = Math.round(humidityTotal / count);
    regionSummary.textContent = `Avg ${avgTemp}°${tempUnitLabel()} | Hum ${avgHum}% | Max wind ${maxWind.toFixed(1)} ${windLabel()}`;
  } else {
    regionSummary.textContent = "No data for this region.";
  }
}

function applyWeather(data) {
  const current = data.current;
  const forecast = data.forecast;

  const temp = current.main.temp;
  const feels = current.main.feels_like;
  const wind = current.wind.speed;
  const humidity = current.main.humidity;
  const pressure = current.main.pressure;
  const clouds = current.clouds.all;
  const visibility = current.visibility;
  const timezone = current.timezone || 0;
  const sunrise = formatTime(current.sys.sunrise, timezone);
  const sunset = formatTime(current.sys.sunset, timezone);
  const nowLocal = current.dt + timezone;
  const isNight = nowLocal < current.sys.sunrise + timezone || nowLocal > current.sys.sunset + timezone;
  const condition = current.weather[0].main;
  const precipValue = (current.rain && (current.rain["1h"] || current.rain["3h"]))
    || (current.snow && (current.snow["1h"] || current.snow["3h"]))
    || 0;

  buildCard(tempCard, "Temp", `${Math.round(temp)}°${unitLabel()}`, current.weather[0].main);
  buildCard(feelsCard, "Feels", `${Math.round(feels)}°${unitLabel()}`, "Feels like");
  buildCard(windCard, "Wind", `${wind.toFixed(1)} ${windLabel()}`, "Speed");
  buildCard(humidityCard, "Humidity", `${humidity}%`, "Humidity");
  buildCard(pressureCard, "Pressure", `${pressure} hPa`, "Pressure");
  buildCard(cloudsCard, "Clouds", `${clouds}%`, "Cloud cover");
  buildCard(visibilityCard, "Visibility", formatDistance(visibility), "Range");
  buildCard(sunriseCard, "Sunrise", sunrise, "Local time");
  buildCard(sunsetCard, "Sunset", sunset, "Local time");
  buildCard(precipCard, "Precip", `${precipValue} mm`, "1h/3h");
  buildCard(uvCard, "UV", "Unavailable", "Free tier");

  posterCity.textContent = `${current.name}, ${current.sys.country}`;
  posterTemp.textContent = `${Math.round(temp)}°${unitLabel()}`;
  posterDesc.textContent = current.weather[0].description;

  let stageCondition = "sunny";
  if (condition === "Rain" || condition === "Drizzle" || condition === "Thunderstorm") {
    stageCondition = "rainy";
  } else if (condition === "Snow") {
    stageCondition = "snowy";
  } else if (condition === "Clouds" || condition === "Mist" || condition === "Fog" || condition === "Haze") {
    stageCondition = "cloudy";
  }
  setWeatherStage(stageCondition, isNight);
  setThemeByTemp(temp, isNight);
  renderForecast(forecast.list);
  renderClimate(forecast.list, forecast.city.timezone || 0);

  lastContext = {
    temp,
    wind,
    humidity,
    precipValue,
    condition,
    isNight
  };
  renderActivities(lastContext, null);

  setCurrentMarker(current.coord.lat, current.coord.lon, current.name);
  applyAirQuality(current.coord.lat, current.coord.lon);

  fetchUvAlerts(current.coord.lat, current.coord.lon)
    .then(data => {
      const uvValue = data.uv_max !== null && data.uv_max !== undefined
        ? data.uv_max.toFixed(1)
        : "n/a";
      buildCard(uvCard, "UV", uvValue, "Max today");
      renderAlerts(data.alerts || []);
      if (lastContext) {
        renderActivities(lastContext, data.uv_max);
      }
    })
    .catch(() => {
      buildCard(uvCard, "UV", "n/a", "Max today");
      renderAlerts([]);
      if (lastContext) {
        renderActivities(lastContext, null);
      }
    });
}

searchBtn.addEventListener("click", async () => {
  const city = cityInput.value.trim();
  if (!city) return;
  try {
    setLoadingState(`Fetching ${city}...`);
    const data = await fetchWeather({ city, units });
    applyWeather(data);
    setStatus("Updated.", "ok");
  } catch (error) {
    setStatus("City lookup failed. Try again.", "error");
  }
});

function requestGeo(isAuto) {
  if (!navigator.geolocation) {
    setStatus("Geolocation not supported. Use city search.", "error");
    return;
  }

  setLoadingState(isAuto ? "Fetching your location..." : "Using your location...");
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const data = await fetchWeather({ lat: latitude, lon: longitude, units });
        applyWeather(data);
        setStatus("Location updated.", "ok");
      } catch (error) {
        setStatus("Location fetch failed. Try city search.", "error");
      }
    },
    () => {
      const typedCity = cityInput.value.trim();
      if (typedCity) {
        searchBtn.click();
        return;
      }
      setStatus("Location blocked. Use city search.", "error");
    }
  );
}

geoBtn.addEventListener("click", () => {
  requestGeo(false);
});

unitButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    unitButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    units = btn.dataset.units;
    localStorage.setItem("units", units);
    loadRegion(regionSelect.value);
  });
});

regionLoadBtn.addEventListener("click", () => {
  loadRegion(regionSelect.value);
});

window.addEventListener("load", () => {
  initMap();
  loadRegion(regionSelect.value);
  requestGeo(true);
  setTimeout(() => {
    if (map) {
      map.invalidateSize();
    }
  }, 250);
});