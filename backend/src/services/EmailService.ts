import axios from 'axios';
import { logger } from '../utils/logger';

interface EmailResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

/**
 * Email Service — uses SendGrid HTTP API (no SDK dependency).
 *
 * Environment variables required:
 *   SENDGRID_API_KEY — SendGrid API key
 *   SENDGRID_FROM_EMAIL — Verified sender email (e.g. "noreply@blacklivery.com")
 *   SENDGRID_FROM_NAME — Sender display name (default: "BlackLivery")
 */
export class EmailService {
    private apiKey: string;
    private fromEmail: string;
    private fromName: string;

    constructor() {
        this.apiKey = process.env.SENDGRID_API_KEY || '';
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@blacklivery.com';
        this.fromName = process.env.SENDGRID_FROM_NAME || 'BlackLivery';

        if (!this.apiKey) {
            logger.warn('SENDGRID_API_KEY not set — email service disabled');
        }
    }

    /**
     * Send a transactional email
     */
    async send(options: EmailOptions): Promise<EmailResult> {
        if (!this.apiKey) {
            logger.warn({ to: options.to }, 'Email service not configured, skipping send');
            return { success: false, error: 'SENDGRID_API_KEY not configured' };
        }

        try {
            const response = await axios.post(
                'https://api.sendgrid.com/v3/mail/send',
                {
                    personalizations: [{ to: [{ email: options.to }] }],
                    from: { email: this.fromEmail, name: this.fromName },
                    subject: options.subject,
                    content: [
                        ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
                        { type: 'text/html', value: options.html }
                    ]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            const messageId = response.headers['x-message-id'] || undefined;
            logger.info({ to: options.to, messageId }, 'Email sent successfully');
            return { success: true, messageId };
        } catch (error: any) {
            const errMsg = error.response?.data?.errors?.[0]?.message || error.message;
            logger.error({ err: error, to: options.to }, 'Email send failed');
            return { success: false, error: errMsg };
        }
    }

    // ─── Pre-built email templates ───────────────────────────────────────

    /**
     * Send ride receipt to rider
     */
    async sendRideReceipt(email: string, data: {
        riderName: string;
        rideId: string;
        pickup: string;
        dropoff: string;
        fare: number;
        currency: string;
        date: string;
        driverName?: string;
        paymentMethod?: string;
    }): Promise<EmailResult> {
        const currencySymbol = data.currency === 'NGN' ? '₦' : '$';
        return this.send({
            to: email,
            subject: `Your BlackLivery ride receipt — ${data.rideId.substring(0, 8)}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #000;">Your Ride Receipt</h2>
                    <p>Hi ${data.riderName},</p>
                    <p>Thank you for riding with BlackLivery. Here's your trip summary:</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                        <tr><td style="padding: 8px 0; color: #666;">Date</td><td style="padding: 8px 0; text-align: right;">${data.date}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Pickup</td><td style="padding: 8px 0; text-align: right;">${data.pickup}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Drop-off</td><td style="padding: 8px 0; text-align: right;">${data.dropoff}</td></tr>
                        ${data.driverName ? `<tr><td style="padding: 8px 0; color: #666;">Driver</td><td style="padding: 8px 0; text-align: right;">${data.driverName}</td></tr>` : ''}
                        ${data.paymentMethod ? `<tr><td style="padding: 8px 0; color: #666;">Payment</td><td style="padding: 8px 0; text-align: right;">${data.paymentMethod}</td></tr>` : ''}
                        <tr style="border-top: 2px solid #000;"><td style="padding: 12px 0; font-weight: bold;">Total</td><td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 18px;">${currencySymbol}${data.fare.toLocaleString()}</td></tr>
                    </table>
                    <p style="color: #666; font-size: 12px;">Ride ID: ${data.rideId}</p>
                    <hr style="border: 0; border-top: 1px solid #eee;" />
                    <p style="color: #999; font-size: 11px;">BlackLivery — Premium ride-hailing service</p>
                </div>
            `
        });
    }

    /**
     * Send welcome email to new user
     */
    async sendWelcomeEmail(email: string, name: string, role: 'rider' | 'driver'): Promise<EmailResult> {
        const roleText = role === 'driver' ? 'driver partner' : 'rider';
        return this.send({
            to: email,
            subject: `Welcome to BlackLivery, ${name}!`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #000;">Welcome to BlackLivery!</h2>
                    <p>Hi ${name},</p>
                    <p>Thank you for joining BlackLivery as a ${roleText}. We're excited to have you on board!</p>
                    ${role === 'driver' ? '<p>Complete your vehicle registration and document upload to start accepting rides.</p>' : '<p>You can now book premium rides across our service areas.</p>'}
                    <p>If you have any questions, our support team is always here to help.</p>
                    <p>Best regards,<br/>The BlackLivery Team</p>
                </div>
            `
        });
    }

    /**
     * Send payout confirmation to driver
     */
    async sendPayoutConfirmation(email: string, data: {
        driverName: string;
        amount: number;
        currency: string;
        reference: string;
    }): Promise<EmailResult> {
        const currencySymbol = data.currency === 'NGN' ? '₦' : '$';
        return this.send({
            to: email,
            subject: `Payout Processed — ${currencySymbol}${data.amount.toLocaleString()}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #000;">Payout Confirmation</h2>
                    <p>Hi ${data.driverName},</p>
                    <p>Your payout of <strong>${currencySymbol}${data.amount.toLocaleString()}</strong> has been processed successfully.</p>
                    <p style="color: #666;">Reference: ${data.reference}</p>
                    <p>The funds will appear in your bank account within 1-2 business days.</p>
                    <p>Best regards,<br/>BlackLivery Payments</p>
                </div>
            `
        });
    }
}

export const emailService = new EmailService();
