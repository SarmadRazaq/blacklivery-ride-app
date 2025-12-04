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
const firebase_admin_1 = __importDefault(require("firebase-admin"));
function link(driverId, connectAccountId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!firebase_admin_1.default.apps.length) {
            firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.applicationDefault(),
                projectId: process.env.GCLOUD_PROJECT
            });
        }
        const db = firebase_admin_1.default.firestore();
        yield db.collection('stripe_accounts').doc(driverId).set({
            userId: driverId,
            connectAccountId,
            linkedAt: firebase_admin_1.default.firestore.FieldValue.serverTimestamp()
        });
        yield db.collection('users').doc(driverId).set({
            stripeConnectAccountId: connectAccountId,
            payouts: { stripeConnectAccountId: connectAccountId }
        }, { merge: true });
        console.log('Stripe Connect linked');
    });
}
// Example: link('driverUid', 'acct_123XYZ');
link(process.argv[2], process.argv[3]).catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=linkStripeAccount.js.map