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
exports.idempotency = void 0;
const firebase_1 = require("../config/firebase");
const idempotency = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const key = req.headers['idempotency-key'];
    if (!key) {
        // If no key provided, proceed normally (or enforce it depending on strictness)
        // For now, we'll allow requests without it but warn or just skip idempotency
        return next();
    }
    const { uid } = req.user;
    const docRef = firebase_1.db.collection('idempotency_keys').doc(`${uid}_${key}`);
    try {
        const doc = yield docRef.get();
        if (doc.exists) {
            const data = doc.data();
            // Check if locked (request in progress)
            if (data.lockedAt && !data.responseCode) {
                // Simple retry mechanism or conflict error
                const now = new Date().getTime();
                const lockedTime = data.lockedAt.getTime();
                // If locked for more than 30 seconds, assume crash and allow retry
                if (now - lockedTime < 30000) {
                    return res.status(409).json({ error: 'Request currently in progress' });
                }
            }
            if (data.responseCode) {
                console.log(`Idempotency hit: ${key}`);
                return res.status(data.responseCode).json(data.responseBody);
            }
        }
        // Lock the key
        yield docRef.set({
            key,
            userId: uid,
            path: req.path,
            method: req.method,
            params: req.body,
            createdAt: new Date(),
            lockedAt: new Date()
        });
        // Hook into response to save result
        const originalJson = res.json;
        res.json = function (body) {
            // Restore original to prevent infinite loop if called internally
            res.json = originalJson;
            // Save to Firestore asynchronously (fire and forget or await)
            docRef.update({
                responseCode: res.statusCode,
                responseBody: body,
                lockedAt: null // Release lock implicitly by having a response
            }).catch(err => console.error('Failed to save idempotency response:', err));
            return originalJson.call(this, body);
        };
        next();
    }
    catch (error) {
        console.error('Idempotency error:', error);
        next(error);
    }
});
exports.idempotency = idempotency;
//# sourceMappingURL=idempotency.middleware.js.map