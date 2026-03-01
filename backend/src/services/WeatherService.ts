import axios from 'axios';
import { logger } from '../utils/logger';

interface WeatherData {
    condition: string; // 'clear', 'rain', 'storm', 'snow', 'clouds'
    temperature: number;
    description: string;
    isExtreme: boolean;
    surgeMultiplier: number;
}

export class WeatherService {
    private apiKey: string;
    private cache: Map<string, { data: WeatherData; timestamp: number }>;
    private cacheDuration = 10 * 60 * 1000; // 10 minutes

    constructor() {
        this.apiKey = process.env.OPENWEATHER_API_KEY || '';
        this.cache = new Map();

        if (!this.apiKey) {
            logger.warn('OPENWEATHER_API_KEY is not set. Weather-based surge will be disabled.');
        }
    }

    /**
     * Get weather data for a location
     */
    async getWeather(lat: number, lng: number): Promise<WeatherData> {
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
            const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
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

        } catch (error) {
            logger.error({ err: error }, 'Weather API error');
            return this.getDefaultWeather();
        }
    }

    /**
     * Parse OpenWeatherMap response
     */
    private parseWeatherData(data: any): WeatherData {
        const main = data.weather[0]?.main?.toLowerCase() || 'clear';
        const description = data.weather[0]?.description || 'clear sky';
        const temp = data.main?.temp || 25;
        const windSpeed = data.wind?.speed || 0;
        const rain = data.rain?.['1h'] || 0;

        let condition = 'clear';
        let isExtreme = false;
        let surgeMultiplier = 1.0;

        // Determine condition and surge
        if (main.includes('thunder') || main.includes('storm')) {
            condition = 'storm';
            isExtreme = true;
            surgeMultiplier = 1.8; // Heavy storm surge
        } else if (main.includes('rain') || main.includes('drizzle')) {
            condition = 'rain';
            if (rain > 7.5) {
                // Heavy rain (> 7.5mm/hr)
                isExtreme = true;
                surgeMultiplier = 1.6;
            } else if (rain > 2.5) {
                // Moderate rain
                surgeMultiplier = 1.3;
            } else {
                // Light rain
                surgeMultiplier = 1.2;
            }
        } else if (main.includes('snow')) {
            condition = 'snow';
            isExtreme = true;
            surgeMultiplier = 1.7;
        } else if (windSpeed > 15) {
            // Strong winds
            isExtreme = true;
            surgeMultiplier = 1.4;
        } else if (main.includes('cloud')) {
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
    private getDefaultWeather(): WeatherData {
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
    async getWeatherSurge(lat: number, lng: number): Promise<number> {
        const weather = await this.getWeather(lat, lng);
        return weather.surgeMultiplier;
    }

    /**
     * Check if weather is extreme (for driver bonuses)
     */
    async isExtremeWeather(lat: number, lng: number): Promise<boolean> {
        const weather = await this.getWeather(lat, lng);
        return weather.isExtreme;
    }

    /**
     * Clear cache (for testing or manual refresh)
     */
    clearCache(): void {
        this.cache.clear();
    }
}

export const weatherService = new WeatherService();
