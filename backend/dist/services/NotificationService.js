"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.notificationService = exports.NotificationService = void 0;
const admin = __importStar(require("firebase-admin"));
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
class NotificationService {
    sendPush(userId, title, body, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userDoc = yield firebase_1.db.collection('users').doc(userId).get();
                const fcmTokens = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmTokens;
                if (fcmTokens && fcmTokens.length > 0) {
                    const message = {
                        tokens: fcmTokens,
                        notification: { title, body },
                        data: data !== null && data !== void 0 ? data : {},
                        android: { priority: 'high' },
                        apns: { payload: { aps: { 'content-available': true } } }
                    };
                    const response = yield admin.messaging().sendEachForMulticast(message);
                    if (response.failureCount > 0) {
                        const invalidTokens = [];
                        response.responses.forEach((resp, idx) => {
                            var _a, _b;
                            if (!resp.success && (((_a = resp.error) === null || _a === void 0 ? void 0 : _a.code) === 'messaging/invalid-registration-token' ||
                                ((_b = resp.error) === null || _b === void 0 ? void 0 : _b.code) === 'messaging/registration-token-not-registered')) {
                                invalidTokens.push(fcmTokens[idx]);
                            }
                        });
                        if (invalidTokens.length > 0) {
                            yield userDoc.ref.update({
                                fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
                            });
                        }
                    }
                }
                yield firebase_1.db.collection('notifications').add({
                    userId,
                    title,
                    body,
                    metadata: data,
                    read: false,
                    createdAt: new Date()
                });
            }
            catch (error) {
                logger_1.logger.error({ err: error, userId }, 'Failed to send push notification');
            }
        });
    }
}
exports.NotificationService = NotificationService;
exports.notificationService = new NotificationService();
//# sourceMappingURL=NotificationService.js.map