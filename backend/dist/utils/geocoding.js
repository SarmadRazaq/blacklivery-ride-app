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
Object.defineProperty(exports, "__esModule", { value: true });
exports.reverseGeocode = reverseGeocode;
function reverseGeocode(lat, lng) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Using OpenStreetMap Nominatim (free, no API key needed)
            const response = yield fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
                headers: {
                    'User-Agent': 'RiderApp/1.0' // Required by Nominatim
                }
            });
            if (!response.ok)
                return null;
            const data = yield response.json();
            return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        }
        catch (error) {
            console.warn('Reverse geocoding failed:', error);
            return `${lat.toFixed(6)}, ${lng.toFixed(6)}`; // Fallback to coordinates
        }
    });
}
//# sourceMappingURL=geocoding.js.map