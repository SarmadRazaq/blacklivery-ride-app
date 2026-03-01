import { validateRideStatusTransition } from '../../src/middlewares/rideStatusTransition.middleware';

describe('validateRideStatusTransition middleware', () => {
    const mockReqResNext = (body: any) => {
        const req = { body } as any;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        } as any;
        const next = jest.fn();
        return { req, res, next };
    };

    it('allows supported status', () => {
        const { req, res, next } = mockReqResNext({ status: 'arrived' });
        validateRideStatusTransition(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects unsupported status', () => {
        const { req, res, next } = mockReqResNext({ status: 'finding_driver' });
        validateRideStatusTransition(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects cancelled status without reason', () => {
        const { req, res, next } = mockReqResNext({ status: 'cancelled' });
        validateRideStatusTransition(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });

    it('allows cancelled status with reason', () => {
        const { req, res, next } = mockReqResNext({ status: 'cancelled', reason: 'Rider no-show' });
        validateRideStatusTransition(req, res, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});
