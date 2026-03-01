import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../src/middlewares/auth.middleware';
import { checkRole, requireApprovedDriver } from '../../src/middlewares/roles.middleware';

describe('Roles Middleware', () => {
    let req: Partial<AuthRequest>;
    let res: Partial<Response>;
    let next: NextFunction;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        res = { status: statusMock, json: jsonMock };
        next = jest.fn();
        req = { user: {} };
    });

    // ── checkRole ─────────────────────────────────────────────────────────

    describe('checkRole', () => {
        it('calls next() when user role is in allowedRoles', () => {
            req.user = { role: 'admin' };
            checkRole(['admin'])(req as AuthRequest, res as Response, next);
            expect(next).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });

        it('allows any of several roles', () => {
            req.user = { role: 'rider' };
            checkRole(['rider', 'driver', 'admin'])(req as AuthRequest, res as Response, next);
            expect(next).toHaveBeenCalled();
        });

        it('returns 403 when user role is NOT in allowedRoles', () => {
            req.user = { role: 'rider' };
            checkRole(['admin'])(req as AuthRequest, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
            expect(next).not.toHaveBeenCalled();
        });

        it('returns 403 when user has no role', () => {
            req.user = {};
            checkRole(['admin'])(req as AuthRequest, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('returns 403 when req.user is undefined', () => {
            req.user = undefined;
            checkRole(['rider'])(req as AuthRequest, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
        });

        it('driver role cannot access admin-only routes', () => {
            req.user = { role: 'driver' };
            checkRole(['admin'])(req as AuthRequest, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });

    // ── requireApprovedDriver ─────────────────────────────────────────────

    describe('requireApprovedDriver', () => {
        it('lets non-driver roles pass through', () => {
            req.user = { role: 'rider' };
            requireApprovedDriver(req as AuthRequest, res as Response, next);
            expect(next).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });

        it('lets admin pass through', () => {
            req.user = { role: 'admin' };
            requireApprovedDriver(req as AuthRequest, res as Response, next);
            expect(next).toHaveBeenCalled();
        });

        it('lets approved driver pass through', () => {
            req.user = { role: 'driver', driverOnboarding: { status: 'approved' } };
            requireApprovedDriver(req as AuthRequest, res as Response, next);
            expect(next).toHaveBeenCalled();
            expect(statusMock).not.toHaveBeenCalled();
        });

        it('blocks driver with pending status', () => {
            req.user = { role: 'driver', driverOnboarding: { status: 'pending' } };
            requireApprovedDriver(req as AuthRequest, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Driver account not yet approved',
                code: 'DRIVER_NOT_APPROVED',
                onboardingStatus: 'pending'
            }));
            expect(next).not.toHaveBeenCalled();
        });

        it('blocks driver with rejected status', () => {
            req.user = { role: 'driver', driverOnboarding: { status: 'rejected' } };
            requireApprovedDriver(req as AuthRequest, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                code: 'DRIVER_NOT_APPROVED',
                onboardingStatus: 'rejected'
            }));
        });

        it('blocks driver with no driverOnboarding field', () => {
            req.user = { role: 'driver' };
            requireApprovedDriver(req as AuthRequest, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                code: 'DRIVER_NOT_APPROVED',
                onboardingStatus: 'pending_documents'
            }));
        });

        it('blocks driver with empty onboarding status', () => {
            req.user = { role: 'driver', driverOnboarding: { status: '' } };
            requireApprovedDriver(req as AuthRequest, res as Response, next);
            expect(statusMock).toHaveBeenCalledWith(403);
        });
    });
});
