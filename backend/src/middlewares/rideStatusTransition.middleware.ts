import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

const ALLOWED_STATUS_TRANSITIONS = new Set([
    'accepted',
    'arrived',
    'in_progress',
    'completed',
    'cancelled',
    'delivery_en_route_pickup',
    'delivery_picked_up',
    'delivery_en_route_dropoff',
    'delivery_delivered'
]);

export const validateRideStatusTransition = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const { status, reason } = req.body ?? {};

    if (!status || typeof status !== 'string' || !ALLOWED_STATUS_TRANSITIONS.has(status)) {
        res.status(400).json({
            error: 'Invalid ride status transition',
            details: [
                {
                    path: 'body.status',
                    message: 'Unsupported status transition'
                }
            ]
        });
        return;
    }

    if (status === 'cancelled' && (!reason || typeof reason !== 'string' || reason.trim().length < 3)) {
        res.status(400).json({
            error: 'Invalid ride status transition',
            details: [
                {
                    path: 'body.reason',
                    message: 'Cancellation reason is required when cancelling a ride'
                }
            ]
        });
        return;
    }

    next();
};
