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
exports.verifyToken = void 0;
const firebase_1 = require("../config/firebase");
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split('Bearer ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    try {
        // Verify token and check if it has been revoked
        const decodedToken = yield firebase_1.auth.verifyIdToken(token, true);
        // Fetch user data from Firestore to get role and other info
        const userDoc = yield firebase_1.db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            req.user = Object.assign(Object.assign({}, decodedToken), { role: userData === null || userData === void 0 ? void 0 : userData.role, region: userData === null || userData === void 0 ? void 0 : userData.region, currency: userData === null || userData === void 0 ? void 0 : userData.currency, driverOnboarding: userData === null || userData === void 0 ? void 0 : userData.driverOnboarding, driverDetails: userData === null || userData === void 0 ? void 0 : userData.driverDetails });
        }
        else {
            // User not registered yet, just use token data
            req.user = decodedToken;
        }
        next();
    }
    catch (error) {
        console.error('Error verifying token:', error);
        return res.status(403).json({ error: 'Unauthorized: Invalid token' });
    }
});
exports.verifyToken = verifyToken;
//# sourceMappingURL=auth.middleware.js.map