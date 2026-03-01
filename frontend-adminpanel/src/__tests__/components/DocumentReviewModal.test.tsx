import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import DocumentReviewModal from '../../components/DocumentReviewModal';

const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    driverName: 'John Doe',
    onApprove: vi.fn(),
    onReject: vi.fn(),
    documents: [
        { name: 'License', url: 'https://example.com/license.jpg', mimeType: 'image/jpeg', status: 'pending' as const },
        { name: 'Insurance', url: 'https://example.com/insurance.pdf', mimeType: 'application/pdf', status: 'approved' as const },
        { name: 'Registration', url: '', status: 'rejected' as const },
    ],
};

describe('DocumentReviewModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns null when not open', () => {
        const { container } = render(<DocumentReviewModal {...baseProps} isOpen={false} />);
        expect(container.innerHTML).toBe('');
    });

    it('renders driver name and documents', () => {
        render(<DocumentReviewModal {...baseProps} />);
        expect(screen.getByText(/Review Documents: John Doe/)).toBeInTheDocument();
        expect(screen.getByText('License')).toBeInTheDocument();
        expect(screen.getByText('Insurance')).toBeInTheDocument();
        expect(screen.getByText('Registration')).toBeInTheDocument();
    });

    it('shows status badges', () => {
        render(<DocumentReviewModal {...baseProps} />);
        expect(screen.getByText('PENDING')).toBeInTheDocument();
        expect(screen.getByText('APPROVED')).toBeInTheDocument();
        expect(screen.getByText('REJECTED')).toBeInTheDocument();
    });

    it('shows "No Preview Available" when URL is empty', () => {
        render(<DocumentReviewModal {...baseProps} />);
        expect(screen.getByText('No Preview Available')).toBeInTheDocument();
    });

    it('calls onApprove when approve button clicked', () => {
        render(<DocumentReviewModal {...baseProps} />);

        const approveButtons = screen.getAllByText(/Approve/);
        fireEvent.click(approveButtons[0]);
        expect(baseProps.onApprove).toHaveBeenCalledWith('License');
    });

    it('calls onReject when reject button clicked', () => {
        render(<DocumentReviewModal {...baseProps} />);

        const rejectButtons = screen.getAllByText(/Reject/);
        fireEvent.click(rejectButtons[0]);
        expect(baseProps.onReject).toHaveBeenCalledWith('License');
    });

    it('calls onClose when X button is clicked', () => {
        render(<DocumentReviewModal {...baseProps} />);
        // Find the close button (first button with X icon)
        const closeButton = screen.getByRole('button', { name: '' }) || document.querySelector('button');
        // The X button doesn't have an explicit aria-label, but we can find it
        const buttons = screen.getAllByRole('button');
        // First button is the close button
        fireEvent.click(buttons[0]);
        expect(baseProps.onClose).toHaveBeenCalled();
    });
});
