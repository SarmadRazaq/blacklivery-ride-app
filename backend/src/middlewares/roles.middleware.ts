import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

export const checkRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user?.role) {
            res.status(403).json({ error: 'Insufficient permissions' });
            return;
        }

        // Admin role is checked the same as any other role — no email bypass
        if (allowedRoles.includes(req.user.role)) {
            next();
            return;
        }

        res.status(403).json({ error: 'Insufficient permissions' });
    };
};

/**
 * Blocks driver-role requests unless the driver's KYC application is approved.
 * Apply this to operational endpoints (availability, heartbeat, earnings, etc.)
 * but NOT to onboarding endpoints (document upload, application status, bank info).
 *
 * Non-driver roles (admin, rider) pass through unaffected.
 */
export const requireApprovedDriver = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user?.role !== 'driver') {
        next();
        return;
    }

    const status = req.user.driverOnboarding?.status ?? '';
    if (status !== 'approved') {
        res.status(403).json({
            error: 'Driver account not yet approved',
            code: 'DRIVER_NOT_APPROVED',
            onboardingStatus: status || 'pending_documents'
        });
        return;
    }

    next();
};
