//// filepath: c:\Users\sarma\Downloads\RiderApp\backend\src\types\express.ts
import { Request } from 'express';

export interface AuthenticatedUser {
    uid: string;
    email?: string;
    displayName?: string;
    role?: string;
    picture?: string;
    [key: string]: unknown;
}

export interface AuthRequest extends Request {
    user: AuthenticatedUser;
}