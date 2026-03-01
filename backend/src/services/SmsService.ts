import axios from 'axios';
import { logger } from '../utils/logger';

interface SmsResult {
    success: boolean;
    messageId?: string;
    provider: string;
    error?: string;
}

/**
 * SMS Service — dual provider support:
 *   - Termii for Nigeria (+234) numbers
 *   - Twilio for US/international numbers
 *
 * Environment variables required:
 *   TERMII_API_KEY — Termii API key
 *   TERMII_SENDER_ID — Sender ID registered with Termii (e.g. "BlackLivery")
 *   TWILIO_ACCOUNT_SID — Twilio Account SID
 *   TWILIO_AUTH_TOKEN — Twilio Auth Token
 *   TWILIO_PHONE_NUMBER — Twilio phone number (e.g. "+1234567890")
 */
export class SmsService {
    private termiiApiKey: string;
    private termiiSenderId: string;
    private twilioSid: string;
    private twilioToken: string;
    private twilioPhone: string;
    private twilioVerifyServiceSid: string;

    constructor() {
        this.termiiApiKey = process.env.TERMII_API_KEY || '';
        this.termiiSenderId = process.env.TERMII_SENDER_ID || 'BlackLivery';
        this.twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
        this.twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
        this.twilioPhone = process.env.TWILIO_PHONE_NUMBER || '';
        this.twilioVerifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || '';

        if (!this.termiiApiKey) {
            logger.warn('TERMII_API_KEY not set — Nigeria SMS disabled');
        }
        if (!this.twilioSid || !this.twilioToken) {
            logger.warn('TWILIO credentials not set — US/international SMS disabled');
        }
        if (!this.twilioVerifyServiceSid) {
            logger.warn('TWILIO_VERIFY_SERVICE_SID not set — phone OTP verification disabled');
        }
    }

    async startVerification(phoneNumber: string): Promise<SmsResult> {
        if (!this.twilioSid || !this.twilioToken || !this.twilioVerifyServiceSid) {
            return {
                success: false,
                provider: 'twilio-verify',
                error: 'Twilio Verify credentials not configured'
            };
        }

        try {
            const url = `https://verify.twilio.com/v2/Services/${this.twilioVerifyServiceSid}/Verifications`;
            const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');

            const response = await axios.post(
                url,
                new URLSearchParams({
                    To: phoneNumber,
                    Channel: 'sms'
                }).toString(),
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                }
            );

            return {
                success: true,
                messageId: response.data?.sid,
                provider: 'twilio-verify'
            };
        } catch (error: any) {
            const errMsg = error.response?.data?.message || error.message;
            logger.error({ err: error, phoneNumber }, 'Twilio Verify start failed');
            return { success: false, provider: 'twilio-verify', error: errMsg };
        }
    }

    async checkVerification(phoneNumber: string, code: string): Promise<SmsResult> {
        if (!this.twilioSid || !this.twilioToken || !this.twilioVerifyServiceSid) {
            return {
                success: false,
                provider: 'twilio-verify',
                error: 'Twilio Verify credentials not configured'
            };
        }

        try {
            const url = `https://verify.twilio.com/v2/Services/${this.twilioVerifyServiceSid}/VerificationCheck`;
            const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');

            const response = await axios.post(
                url,
                new URLSearchParams({
                    To: phoneNumber,
                    Code: code
                }).toString(),
                {
                    headers: {
                        Authorization: `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                }
            );

            const approved = response.data?.status === 'approved' || response.data?.valid === true;
            return {
                success: approved,
                messageId: response.data?.sid,
                provider: 'twilio-verify',
                ...(approved ? {} : { error: 'Invalid or expired verification code' })
            };
        } catch (error: any) {
            const errMsg = error.response?.data?.message || error.message;
            logger.error({ err: error, phoneNumber }, 'Twilio Verify check failed');
            return { success: false, provider: 'twilio-verify', error: errMsg };
        }
    }

    /**
     * Send an SMS to a phone number (auto-routes to correct provider)
     */
    async sendSms(phoneNumber: string, message: string): Promise<SmsResult> {
        const normalized = phoneNumber.replace(/\s/g, '');

        if (this.isNigerianNumber(normalized)) {
            // Only use Termii if configured, otherwise fall back to Twilio
            if (this.termiiApiKey) {
                return this.sendViaTermii(normalized, message);
            }
            logger.info({ phoneNumber }, 'Termii not configured for Nigeria, falling back to Twilio');
        }
        return this.sendViaTwilio(normalized, message);
    }

    /**
     * Send OTP via SMS
     */
    async sendOtp(phoneNumber: string, otp: string): Promise<SmsResult> {
        const message = `Your BlackLivery verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;
        return this.sendSms(phoneNumber, message);
    }

    /**
     * Send via Termii (for Nigerian numbers)
     */
    private async sendViaTermii(phoneNumber: string, message: string): Promise<SmsResult> {
        if (!this.termiiApiKey) {
            logger.warn({ phoneNumber }, 'Termii not configured, SMS not sent');
            return { success: false, provider: 'termii', error: 'TERMII_API_KEY not configured' };
        }

        try {
            const response = await axios.post(
                'https://api.ng.termii.com/api/sms/send',
                {
                    to: phoneNumber,
                    from: this.termiiSenderId,
                    sms: message,
                    type: 'plain',
                    channel: 'generic',
                    api_key: this.termiiApiKey
                },
                { timeout: 10000 }
            );

            const messageId = response.data?.message_id || response.data?.message_id_str;
            logger.info({ phoneNumber, messageId }, 'SMS sent via Termii');

            return {
                success: true,
                messageId,
                provider: 'termii'
            };
        } catch (error: any) {
            const errMsg = error.response?.data?.message || error.message;
            logger.error({ err: error, phoneNumber }, 'Termii SMS send failed');
            return { success: false, provider: 'termii', error: errMsg };
        }
    }

    /**
     * Send via Twilio (for US/international numbers)
     */
    private async sendViaTwilio(phoneNumber: string, message: string): Promise<SmsResult> {
        if (!this.twilioSid || !this.twilioToken || !this.twilioPhone) {
            logger.warn({ phoneNumber }, 'Twilio not configured, SMS not sent');
            return { success: false, provider: 'twilio', error: 'Twilio credentials not configured' };
        }

        try {
            const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`;
            const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');

            const response = await axios.post(
                url,
                new URLSearchParams({
                    To: phoneNumber,
                    From: this.twilioPhone,
                    Body: message
                }).toString(),
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    timeout: 10000
                }
            );

            const messageId = response.data?.sid;
            logger.info({ phoneNumber, messageId }, 'SMS sent via Twilio');

            return {
                success: true,
                messageId,
                provider: 'twilio'
            };
        } catch (error: any) {
            const errMsg = error.response?.data?.message || error.message;
            logger.error({ err: error, phoneNumber }, 'Twilio SMS send failed');
            return { success: false, provider: 'twilio', error: errMsg };
        }
    }

    /**
     * Detect Nigerian phone numbers
     */
    private isNigerianNumber(phone: string): boolean {
        // +234, 0234, or starts with 0 followed by Nigerian patterns (7x, 8x, 9x)
        return phone.startsWith('+234') ||
            phone.startsWith('234') ||
            /^0[789]\d{9}$/.test(phone);
    }
}

export const smsService = new SmsService();
