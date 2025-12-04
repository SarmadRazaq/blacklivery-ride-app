export interface IIdempotencyKey {
    key: string;
    userId: string;
    path: string;
    method: string;
    params: any;
    responseCode: number;
    responseBody: any;
    createdAt: Date;
    lockedAt?: Date; // For handling concurrent requests
}
