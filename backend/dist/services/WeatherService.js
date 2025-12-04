"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.weatherService = exports.WeatherService = void 0;
const axios_1 = __importDefault(require("axios"));
class WeatherService {
    constructor() {
        this.cacheDuration = 10 * 60 * 1000; // 10 minutes
        this.apiKey = process.env.OPENWEATHER_API_KEY || '';
        this.cache = new Map();
        if (!this.apiKey) {
            console.warn('OPENWEATHER_API_KEY is not set. Weather-based surge will be disabled.');
        }
    }
    /**
     * Get weather data for a location
     */
    getWeather(lat, lng) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.apiKey) {
                return this.getDefaultWeather();
            }
            // Check cache
            const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
                return cached.data;
            }
            try {
                const response = yield axios_1.default.get('https://api.openweathermap.org/data/2.5/weather', {
                    params: {
                        lat,
                        lon: lng,
                        appid: this.apiKey,
                        units: 'metric'
                    },
                    timeout: 5000
                });
                const weatherData = this.parseWeatherData(response.data);
                // Cache the result
                this.cache.set(cacheKey, {
                    data: weatherData,
                    timestamp: Date.now()
                });
                return weatherData;
            }
            catch (error) {
                console.error('Weather API error:', error);
                return this.getDefaultWeather();
            }
        });
    }
    /**
     * Parse OpenWeatherMap response
     */
    parseWeatherData(data) {
        var _a, _b, _c, _d, _e, _f;
        const main = ((_b = (_a = data.weather[0]) === null || _a === void 0 ? void 0 : _a.main) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || 'clear';
        const description = ((_c = data.weather[0]) === null || _c === void 0 ? void 0 : _c.description) || 'clear sky';
        const temp = ((_d = data.main) === null || _d === void 0 ? void 0 : _d.temp) || 25;
        const windSpeed = ((_e = data.wind) === null || _e === void 0 ? void 0 : _e.speed) || 0;
        const rain = ((_f = data.rain) === null || _f === void 0 ? void 0 : _f['1h']) || 0;
        let condition = 'clear';
        let isExtreme = false;
        let surgeMultiplier = 1.0;
        // Determine condition and surge
        if (main.includes('thunder') || main.includes('storm')) {
            condition = 'storm';
            isExtreme = true;
            surgeMultiplier = 1.8; // Heavy storm surge
        }
        else if (main.includes('rain') || main.includes('drizzle')) {
            condition = 'rain';
            if (rain > 7.5) {
                // Heavy rain (> 7.5mm/hr)
                isExtreme = true;
                surgeMultiplier = 1.6;
            }
            else if (rain > 2.5) {
                // Moderate rain
                surgeMultiplier = 1.3;
            }
            else {
                // Light rain
                surgeMultiplier = 1.2;
            }
        }
        else if (main.includes('snow')) {
            condition = 'snow';
            isExtreme = true;
            surgeMultiplier = 1.7;
        }
        else if (windSpeed > 15) {
            // Strong winds
            isExtreme = true;
            surgeMultiplier = 1.4;
        }
        else if (main.includes('cloud')) {
            condition = 'clouds';
            surgeMultiplier = 1.0;
        }
        return {
            condition,
            temperature: temp,
            description,
            isExtreme,
            surgeMultiplier
        };
    }
    /**
     * Get default weather (when API unavailable)
     */
    getDefaultWeather() {
        return {
            condition: 'clear',
            temperature: 25,
            description: 'Weather data unavailable',
            isExtreme: false,
            surgeMultiplier: 1.0
        };
    }
    /**
     * Get weather surge multiplier for a location
     */
    getWeatherSurge(lat, lng) {
        return __awaiter(this, void 0, void 0, function* () {
            const weather = yield this.getWeather(lat, lng);
            return weather.surgeMultiplier;
        });
    }
    /**
     * Check if weather is extreme (for driver bonuses)
     */
    isExtremeWeather(lat, lng) {
        return __awaiter(this, void 0, void 0, function* () {
            const weather = yield this.getWeather(lat, lng);
            return weather.isExtreme;
        });
    }
    /**
     * Clear cache (for testing or manual refresh)
     */
    clearCache() {
        this.cache.clear();
    }
}
exports.WeatherService = WeatherService;
exports.weatherService = new WeatherService();
//# sourceMappingURL=WeatherService.js.map