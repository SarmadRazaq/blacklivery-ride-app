"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = __importDefault(require("firebase-admin"));
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.applicationDefault(),
        projectId: process.env.GCLOUD_PROJECT,
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}
exports.default = firebase_admin_1.default;
//# sourceMappingURL=firebaseAdmin.js.map