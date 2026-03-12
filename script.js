/**
 * NIMBUS WEATHER DASHBOARD — script.js
 * =============================================================
 * Architecture:
 *   1. Config & Constants
 *   2. State Management
 *   3. API Layer
 *   4. DOM Selectors
 *   5. Utility Functions
 *   6. UI Rendering
 *   7. Event Listeners
 *   8. Initialization
 * =============================================================
 *
 * SETUP: Replace YOUR_API_KEY_HERE with a free key from
 *        https://openweathermap.org/api
 */

/* ============================================================
   1. CONFIG & CONSTANTS
   ============================================================ */
const CONFIG = {
  API_KEY:  '1456db5c61e3a0786f8ae69b937bf520', // ← Paste your OpenWeatherMap key here
  BASE_URL: 'https://api.openweathermap.org/data/2.5',
  GEO_URL:  'https://api.openweathermap.org/geo/1.0',
  MAX_HISTORY: 8,
};

/** Map OWM condition codes → emoji icons */
const WEATHER_ICONS = {
  // Thunderstorm
  2: '⛈',
  // Drizzle
  3: '🌦',
  // Rain
  5: '🌧',
  // Snow
  6: '❄',
  // Atmosphere (mist, smoke, haze…)
  7: '🌫',
  // Clear
  800: '☀',
  // Clouds
  801: '🌤',
  802: '⛅',
  803: '🌥',
  804: '☁',
};

/* ============================================================
   2. STATE MANAGEMENT
   ============================================================ */
const state = {
  unit: 'metric',       // 'metric' | 'imperial'
  theme: 'dark',        // 'dark' | 'light'
  history: [],          // array of city strings
  currentData: null,    // last fetched current-weather object
  forecastData: null,   // last fetched forecast object
};

function loadState() {
  state.unit    = localStorage.getItem('nimbusUnit')    || 'metric';
  state.theme   = localStorage.getItem('nimbusTheme')   || 'dark';
  state.history = JSON.parse(localStorage.getItem('nimbusHistory') || '[]');
}

function saveState() {
  localStorage.setItem('nimbusUnit',    state.unit);
  localStorage.setItem('nimbusTheme',   state.theme);
  localStorage.setItem('nimbusHistory', JSON.stringify(state.history));
}

/* ============================================================
   3. API LAYER
   ============================================================ */

/**
 * Fetches current weather by city name.
 * @param {string} city
 * @returns {Promise<object>}
 */
async function fetchCurrentWeather(city) {
  const url = `${CONFIG.BASE_URL}/weather?q=${encodeURIComponent(city)}&units=${state.unit}&appid=${CONFIG.API_KEY}`;
  return apiFetch(url);
}

/**
 * Fetches current weather by coordinates.
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<object>}
 */
async function fetchCurrentWeatherByCoords(lat, lon) {
  const url = `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${CONFIG.API_KEY}`;
  return apiFetch(url);
}

/**
 * Fetches 5-day / 3-hour forecast by city name.
 * @param {string} city
 * @returns {Promise<object>}
 */
async function fetchForecast(city) {
  const url = `${CONFIG.BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=${state.unit}&appid=${CONFIG.API_KEY}`;
  return apiFetch(url);
}

/**
 * Fetches 5-day forecast by coordinates.
 */
async function fetchForecastByCoords(lat, lon) {
  const url = `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${CONFIG.API_KEY}`;
  return apiFetch(url);
}

/**
 * Core fetch wrapper with error normalisation.
 * @param {string} url
 * @returns {Promise<object>}
 */
async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg  = body.message || `HTTP error ${res.status}`;
    throw new WeatherError(msg, res.status);
  }
  return res.json();
}

/** Custom error class for weather API failures */
class WeatherError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'WeatherError';
    this.code = code;
  }
}

/* ============================================================
   4. DOM SELECTORS
   ============================================================ */
const $ = id => document.getElementById(id);
const dom = {
  // Header
  unitToggle:   $('unitToggle'),
  unitC:        $('unitC'),
  unitF:        $('unitF'),
  themeToggle:  $('themeToggle'),
  themeIcon:    $('themeIcon'),

  // Search
  searchBar:        $('searchBar'),
  searchInput:      $('searchInput'),
  searchBtn:        $('searchBtn'),
  geoBtn:           $('geoBtn'),
  historyDropdown:  $('historyDropdown'),
  historyList:      $('historyList'),
  clearHistory:     $('clearHistory'),

  // Main
  mainContent:    $('mainContent'),
  loadingOverlay: $('loadingOverlay'),
  errorBanner:    $('errorBanner'),
  errorMsg:       $('errorMsg'),
  errorClose:     $('errorClose'),

  // Current weather
  cwCity:       $('cwCity'),
  cwCountry:    $('cwCountry'),
  cwDatetime:   $('cwDatetime'),
  cwTemp:       $('cwTemp'),
  cwIcon:       $('cwIcon'),
  cwDesc:       $('cwDesc'),
  cwFeels:      $('cwFeels'),
  cwHumidity:   $('cwHumidity'),
  cwWind:       $('cwWind'),
  cwPressure:   $('cwPressure'),
  cwVisibility: $('cwVisibility'),

  // Forecast & history
  forecastGrid:  $('forecastGrid'),
  historySection: $('historySection'),
  historyChips:  $('historyChips'),
};

/* ============================================================
   5. UTILITY FUNCTIONS
   ============================================================ */

/**
 * Converts a Unix timestamp + timezone offset to a formatted string.
 * @param {number} unix - Unix timestamp (seconds)
 * @param {number} tzOffset - API timezone offset in seconds
 * @returns {string}
 */
function formatDatetime(unix, tzOffset) {
  const localMs = (unix + tzOffset) * 1000;
  const d = new Date(localMs);
  // We use UTC methods so we don't double-apply local TZ
  const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day   = days[d.getUTCDay()];
  const date  = d.getUTCDate();
  const month = months[d.getUTCMonth()];
  const year  = d.getUTCFullYear();
  const h     = String(d.getUTCHours()).padStart(2,'0');
  const m     = String(d.getUTCMinutes()).padStart(2,'0');
  return `${day}, ${date} ${month} ${year} · ${h}:${m}`;
}

/**
 * Returns the appropriate emoji for an OWM weather code.
 * @param {number} code - OWM weather condition id
 * @returns {string}
 */
function getWeatherIcon(code) {
  if (WEATHER_ICONS[code]) return WEATHER_ICONS[code];
  const group = Math.floor(code / 100);
  return WEATHER_ICONS[group] || '🌡';
}

/**
 * Formats temperature with the current unit symbol.
 * @param {number} temp
 * @returns {string}
 */
function formatTemp(temp) {
  const rounded = Math.round(temp);
  return `${rounded}°${state.unit === 'metric' ? 'C' : 'F'}`;
}

/**
 * Formats wind speed with appropriate unit.
 * @param {number} speed - m/s (metric) or mph (imperial)
 * @returns {string}
 */
function formatWind(speed) {
  return state.unit === 'metric'
    ? `${Math.round(speed * 3.6)} km/h`
    : `${Math.round(speed)} mph`;
}

/**
 * Adds a city to the search history (deduplicates, trims to max).
 * @param {string} city
 */
function addToHistory(city) {
  const name = city.trim();
  if (!name) return;
  // Remove duplicate (case-insensitive)
  state.history = state.history.filter(h => h.toLowerCase() !== name.toLowerCase());
  state.history.unshift(name);
  if (state.history.length > CONFIG.MAX_HISTORY) {
    state.history = state.history.slice(0, CONFIG.MAX_HISTORY);
  }
  saveState();
}

/**
 * Reduces a forecast list (3-hourly) to one entry per day (noon-closest).
 * @param {Array} list - OWM forecast list
 * @returns {Array} - Up to 5 entries
 */
function reduceForecastToDays(list) {
  const seen = {};
  const result = [];
  for (const item of list) {
    const date = item.dt_txt.split(' ')[0];
    if (!seen[date]) {
      seen[date] = true;
      result.push(item);
      if (result.length === 5) break;
    }
  }
  return result;
}

/* ============================================================
   6. UI RENDERING
   ============================================================ */

/** Shows the loading overlay and hides errors. */
function showLoading() {
  dom.loadingOverlay.hidden = false;
  dom.errorBanner.hidden    = true;
}

/** Hides the loading overlay. */
function hideLoading() {
  dom.loadingOverlay.hidden = true;
}

/**
 * Displays a user-friendly error.
 * @param {string} msg
 */
function showError(msg) {
  dom.errorMsg.textContent = msg;
  dom.errorBanner.hidden   = false;
  hideLoading();
}

function hideError() {
  dom.errorBanner.hidden = true;
}

/**
 * Renders current weather data into the DOM.
 * @param {object} data - OWM current weather response
 */
function renderCurrentWeather(data) {
  const { name, sys, dt, timezone, main, weather, wind, visibility } = data;
  const w = weather[0];

  dom.cwCity.textContent      = name;
  dom.cwCountry.textContent   = sys.country;
  dom.cwDatetime.textContent  = formatDatetime(dt, timezone);
  dom.cwTemp.textContent      = formatTemp(main.temp);
  dom.cwIcon.textContent      = getWeatherIcon(w.id);
  dom.cwDesc.textContent      = w.description;
  dom.cwFeels.textContent     = `Feels like ${formatTemp(main.feels_like)}`;
  dom.cwHumidity.textContent  = `${main.humidity}%`;
  dom.cwWind.textContent      = formatWind(wind.speed);
  dom.cwPressure.textContent  = `${main.pressure} hPa`;
  dom.cwVisibility.textContent = visibility
    ? `${(visibility / 1000).toFixed(1)} km`
    : '—';
}

/**
 * Renders the 5-day forecast strip.
 * @param {object} data - OWM forecast response
 */
function renderForecast(data) {
  const days = reduceForecastToDays(data.list);
  dom.forecastGrid.innerHTML = '';

  days.forEach((item, i) => {
    const w = item.weather[0];
    const d = new Date(item.dt * 1000);
    const dayName = i === 0
      ? 'Today'
      : d.toLocaleDateString('en-US', { weekday: 'short' });

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.style.animationDelay = `${i * 0.07}s`;
    card.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <div class="forecast-icon">${getWeatherIcon(w.id)}</div>
      <div class="forecast-desc">${w.description}</div>
      <div class="forecast-temps">
        <span class="forecast-hi">${formatTemp(item.main.temp_max)}</span>
        <span class="forecast-lo">${formatTemp(item.main.temp_min)}</span>
      </div>
    `;
    dom.forecastGrid.appendChild(card);
  });
}

/**
 * Renders the history chips and dropdown list.
 */
function renderHistory() {
  // Chips in main content
  if (state.history.length === 0) {
    dom.historySection.hidden = true;
    dom.historyDropdown.hidden = true;
    return;
  }

  dom.historySection.hidden = false;
  dom.historyChips.innerHTML = '';
  state.history.forEach(city => {
    const chip = document.createElement('button');
    chip.className = 'history-chip';
    chip.innerHTML = `<span class="history-chip-icon">↩</span>${city}`;
    chip.addEventListener('click', () => doSearch(city));
    dom.historyChips.appendChild(chip);
  });

  // Dropdown list
  dom.historyList.innerHTML = '';
  state.history.slice(0, 5).forEach(city => {
    const li = document.createElement('li');
    li.textContent = city;
    li.addEventListener('click', () => {
      dom.historyDropdown.hidden = true;
      doSearch(city);
    });
    dom.historyList.appendChild(li);
  });
}

/**
 * Applies current theme to document.
 */
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  dom.themeIcon.textContent = state.theme === 'dark' ? '☀' : '☾';
}

/**
 * Applies current unit selection to header.
 */
function applyUnit() {
  if (state.unit === 'metric') {
    dom.unitC.classList.add('active');
    dom.unitF.classList.remove('active');
  } else {
    dom.unitF.classList.add('active');
    dom.unitC.classList.remove('active');
  }
}

/* ============================================================
   7. CORE SEARCH FLOW
   ============================================================ */

/**
 * Main search orchestrator: fetches + renders weather for a city.
 * @param {string} city
 */
async function doSearch(city) {
  const trimmed = city.trim();
  if (!trimmed) return;

  dom.searchInput.value   = trimmed;
  dom.historyDropdown.hidden = true;
  dom.mainContent.hidden  = false;
  hideError();
  showLoading();

  try {
    const [current, forecast] = await Promise.all([
      fetchCurrentWeather(trimmed),
      fetchForecast(trimmed),
    ]);

    state.currentData  = current;
    state.forecastData = forecast;

    hideLoading();
    renderCurrentWeather(current);
    renderForecast(forecast);
    addToHistory(current.name); // use canonical name from API
    renderHistory();

  } catch (err) {
    state.currentData  = null;
    state.forecastData = null;
    hideLoading();

    if (err instanceof WeatherError && err.code === 404) {
      showError(`City "${trimmed}" not found. Please check the spelling and try again.`);
    } else if (err.name === 'TypeError') {
      // Typically a network failure
      showError('Network error — check your internet connection and try again.');
    } else {
      showError(`Weather data unavailable: ${err.message}`);
    }
  }
}

/**
 * Fetches weather for the user's geo position.
 */
async function doGeoSearch() {
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }

  dom.geoBtn.textContent   = '⏳';
  dom.geoBtn.disabled      = true;
  dom.mainContent.hidden   = false;
  hideError();
  showLoading();

  navigator.geolocation.getCurrentPosition(
    async ({ coords: { latitude: lat, longitude: lon } }) => {
      try {
        const [current, forecast] = await Promise.all([
          fetchCurrentWeatherByCoords(lat, lon),
          fetchForecastByCoords(lat, lon),
        ]);

        state.currentData  = current;
        state.forecastData = forecast;

        dom.searchInput.value = current.name;
        hideLoading();
        renderCurrentWeather(current);
        renderForecast(forecast);
        addToHistory(current.name);
        renderHistory();

      } catch (err) {
        showError(`Could not load weather for your location: ${err.message}`);
      } finally {
        dom.geoBtn.textContent = '◎';
        dom.geoBtn.disabled    = false;
      }
    },
    (err) => {
      dom.geoBtn.textContent = '◎';
      dom.geoBtn.disabled    = false;
      hideLoading();
      const messages = {
        1: 'Location permission denied. Please allow access and try again.',
        2: 'Location unavailable. Try searching manually.',
        3: 'Location request timed out. Try searching manually.',
      };
      showError(messages[err.code] || 'Geolocation failed.');
    },
    { timeout: 10000 }
  );
}

/**
 * Re-renders weather data in the new unit without a new API call.
 */
async function refreshWithNewUnit() {
  if (!state.currentData) return;
  const city = state.currentData.name;
  // Re-fetch with the new unit (temperature conversion via API is simplest)
  await doSearch(city);
}

/* ============================================================
   8. EVENT LISTENERS
   ============================================================ */

// Search button click
dom.searchBtn.addEventListener('click', () => doSearch(dom.searchInput.value));

// Enter key in search input
dom.searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch(dom.searchInput.value);
});

// Show history dropdown when input is focused and history exists
dom.searchInput.addEventListener('focus', () => {
  if (state.history.length > 0) {
    renderHistory();
    dom.historyDropdown.hidden = false;
  }
});

// Hide dropdown when clicking outside
document.addEventListener('click', e => {
  if (!dom.searchBar.contains(e.target) && !dom.historyDropdown.contains(e.target)) {
    dom.historyDropdown.hidden = true;
  }
});

// Filter dropdown on type
dom.searchInput.addEventListener('input', () => {
  const val = dom.searchInput.value.toLowerCase();
  if (!val) {
    renderHistory();
    dom.historyDropdown.hidden = state.history.length === 0;
    return;
  }
  const filtered = state.history.filter(h => h.toLowerCase().startsWith(val));
  dom.historyList.innerHTML = '';
  filtered.slice(0, 5).forEach(city => {
    const li = document.createElement('li');
    li.textContent = city;
    li.addEventListener('click', () => {
      dom.historyDropdown.hidden = true;
      doSearch(city);
    });
    dom.historyList.appendChild(li);
  });
  dom.historyDropdown.hidden = filtered.length === 0;
});

// Geolocation button
dom.geoBtn.addEventListener('click', doGeoSearch);

// Unit toggle
dom.unitToggle.addEventListener('click', async () => {
  state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
  applyUnit();
  saveState();
  await refreshWithNewUnit();
});

// Theme toggle
dom.themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
});

// Clear history
dom.clearHistory.addEventListener('click', () => {
  state.history = [];
  saveState();
  dom.historyDropdown.hidden = true;
  renderHistory();
});

// Error close
dom.errorClose.addEventListener('click', hideError);

/* ============================================================
   9. INITIALIZATION
   ============================================================ */
function init() {
  loadState();
  applyTheme();
  applyUnit();
  renderHistory();

  // If there's a recent search, load it automatically
  if (state.history.length > 0) {
    doSearch(state.history[0]);
  }
}

init();
