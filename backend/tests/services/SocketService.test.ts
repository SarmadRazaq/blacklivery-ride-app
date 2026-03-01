jest.mock('../../src/utils/logger', () => ({
    logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));
jest.mock('../../src/services/NotificationService', () => ({
    notificationService: { sendPush: jest.fn().mockResolvedValue(undefined) }
}));

import { SocketService } from '../../src/services/SocketService';
import { notificationService } from '../../src/services/NotificationService';

describe('SocketService', () => {
    let service: SocketService;
    let mockIo: any;
    let mockToEmit: jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockToEmit = jest.fn();
        mockIo = {
            to: jest.fn().mockReturnValue({ emit: mockToEmit })
        };
        service = new SocketService();
        service.register(mockIo);
    });

    afterEach(() => {
        // Clean up the sync cleanup timer
        (service as any).syncCleanupTimer && clearInterval((service as any).syncCleanupTimer);
    });

    // ── notifyDriver ──────────────────────────────────────────────────────

    describe('notifyDriver', () => {
        it('emits event to driver room', () => {
            service.notifyDriver('driver1', 'ride:offer', { rideId: 'ride-1', distanceKm: 2 });
            expect(mockIo.to).toHaveBeenCalledWith('driver:driver1');
            expect(mockToEmit).toHaveBeenCalledWith('ride:offer', { rideId: 'ride-1', distanceKm: 2 });
        });

        it('sends push notification for ride:offer events', () => {
            service.notifyDriver('driver1', 'ride:offer', { distanceKm: 3 });
            expect(notificationService.sendPush).toHaveBeenCalledWith(
                'driver1', 'New Ride Request',
                expect.stringContaining('3km'),
                expect.objectContaining({ type: 'ride:offer' })
            );
        });

        it('does not send push for non-push events', () => {
            service.notifyDriver('driver1', 'custom:event', {});
            expect(notificationService.sendPush).not.toHaveBeenCalled();
        });

        it('does nothing when io is not registered', () => {
            const unregistered = new SocketService();
            unregistered.notifyDriver('driver1', 'ride:offer', {});
            // No error, just silently returns
            expect(mockIo.to).not.toHaveBeenCalled();
        });
    });

    // ── notifyRider ───────────────────────────────────────────────────────

    describe('notifyRider', () => {
        it('emits event to rider room', () => {
            service.notifyRider('rider1', 'ride:accepted', {});
            expect(mockIo.to).toHaveBeenCalledWith('rider:rider1');
            expect(mockToEmit).toHaveBeenCalledWith('ride:accepted', {});
        });

        it('sends push notification for ride:accepted', () => {
            service.notifyRider('rider1', 'ride:accepted', {});
            expect(notificationService.sendPush).toHaveBeenCalledWith(
                'rider1', 'Driver Found',
                'Your driver is on the way!',
                expect.objectContaining({ type: 'ride:accepted' })
            );
        });
    });

    // ── notifyAdmin ───────────────────────────────────────────────────────

    describe('notifyAdmin', () => {
        it('emits event to admin room', () => {
            service.notifyAdmin('admin:alert', { message: 'test' });
            expect(mockIo.to).toHaveBeenCalledWith('admin');
            expect(mockToEmit).toHaveBeenCalledWith('admin:alert', { message: 'test' });
        });
    });

    // ── Ride rooms ────────────────────────────────────────────────────────

    describe('ride rooms', () => {
        it('joins and emits to ride room', () => {
            service.joinRideRoom('ride-1', 'rider1', 'driver1');
            service.emitRideUpdate('ride-1', { status: 'in_progress' });

            expect(mockIo.to).toHaveBeenCalledWith('ride:ride-1');
            expect(mockToEmit).toHaveBeenCalledWith('ride:update', { status: 'in_progress' });
        });

        it('leaves ride room', () => {
            service.joinRideRoom('ride-2', 'rider2', 'driver2');
            service.leaveRideRoom('ride-2');
            // Room map should be cleared
            expect((service as any).activeRideRooms.has('ride-2')).toBe(false);
        });
    });

    // ── Chat ──────────────────────────────────────────────────────────────

    describe('chat', () => {
        it('emits chat message to ride room and recipient', () => {
            const message = { id: 'msg-1', message: 'Hello driver' };
            service.emitChatMessage('ride-1', message, 'driver1', 'driver');

            expect(mockIo.to).toHaveBeenCalledWith('ride:ride-1');
            expect(mockToEmit).toHaveBeenCalledWith('chat:message', message);
            expect(mockIo.to).toHaveBeenCalledWith('driver:driver1');
        });

        it('emits typing indicator', () => {
            service.emitTypingIndicator('ride-1', 'rider1', 'rider', true);
            expect(mockIo.to).toHaveBeenCalledWith('ride:ride-1');
            expect(mockToEmit).toHaveBeenCalledWith('chat:typing', {
                userId: 'rider1', userRole: 'rider', isTyping: true
            });
        });
    });

    // ── Driver sync throttle ──────────────────────────────────────────────

    describe('shouldSyncDriver', () => {
        it('returns true on first sync', () => {
            expect(service.shouldSyncDriver('driver1')).toBe(true);
        });

        it('returns false within interval', () => {
            service.shouldSyncDriver('driver1');
            expect(service.shouldSyncDriver('driver1')).toBe(false);
        });

        it('returns true after interval elapses', () => {
            service.shouldSyncDriver('driver2', 0); // 0ms interval
            expect(service.shouldSyncDriver('driver2', 0)).toBe(true);
        });
    });
});
