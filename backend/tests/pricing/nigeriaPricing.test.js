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
const NigeriaPricingStrategy_1 = require("../../src/services/pricing/NigeriaPricingStrategy");
describe('NigeriaPricingStrategy', () => {
    it('enforces minimum fare per vehicle', () => __awaiter(void 0, void 0, void 0, function* () {
        const fare = yield NigeriaPricingStrategy_1.nigeriaPricingStrategy.calculatePrice({
            distanceKm: 1,
            durationMinutes: 2,
            vehicleCategory: 'sedan',
            bookingType: 'on_demand',
            region: 'nigeria',
            city: 'lagos'
        });
        expect(fare).toBeGreaterThanOrEqual(5000);
    }));
});
//# sourceMappingURL=nigeriaPricing.test.js.map