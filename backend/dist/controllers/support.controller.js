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
exports.replyToTicket = exports.getMyTickets = exports.createSupportTicket = void 0;
const firebase_1 = require("../config/firebase");
const logger_1 = require("../utils/logger");
const createSupportTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { subject, description, category, priority } = req.body;
        const ticket = {
            userId: req.user.uid,
            userEmail: req.user.email,
            userRole: req.user.role,
            subject,
            description,
            category: category || 'general',
            priority: priority || 'normal',
            status: 'open',
            messages: [
                {
                    senderId: req.user.uid,
                    role: 'user',
                    content: description,
                    createdAt: new Date()
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const ref = yield firebase_1.db.collection('support_tickets').add(ticket);
        res.status(201).json(Object.assign({ id: ref.id }, ticket));
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to create support ticket');
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.createSupportTicket = createSupportTicket;
const getMyTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield firebase_1.db.collection('support_tickets')
            .where('userId', '==', req.user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        const tickets = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.status(200).json(tickets);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to list tickets');
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.getMyTickets = getMyTickets;
const replyToTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const { content } = req.body;
        const ticketRef = firebase_1.db.collection('support_tickets').doc(id);
        const doc = yield ticketRef.get();
        if (!doc.exists) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        if (((_a = doc.data()) === null || _a === void 0 ? void 0 : _a.userId) !== req.user.uid) {
            res.status(403).json({ message: 'Unauthorized' });
            return;
        }
        const message = {
            senderId: req.user.uid,
            role: 'user',
            content,
            createdAt: new Date()
        };
        yield ticketRef.update({
            messages: admin.firestore.FieldValue.arrayUnion(message),
            updatedAt: new Date(),
            status: 'open' // Re-open if it was resolved?
        });
        res.status(200).json(message);
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to reply to ticket');
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.replyToTicket = replyToTicket;
const admin = __importStar(require("firebase-admin"));
//# sourceMappingURL=support.controller.js.map