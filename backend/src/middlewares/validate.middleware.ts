import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        }) as { body?: Record<string, any>; query?: Record<string, any>; params?: Record<string, any> };

        // Apply Zod transforms back to request (e.g. region 'nigeria' → 'NG')
        if (parsed.body) req.body = parsed.body;
        if (parsed.query) req.query = parsed.query as any;
        if (parsed.params) req.params = parsed.params as any;

        next();
    } catch (error) {
        if (error instanceof ZodError) {
            const errors = (error as any).errors || (error as any).issues || [];
            return res.status(400).json({
                error: 'Validation Error',
                details: errors.map((e: any) => ({
                    path: e.path ? e.path.join('.') : 'unknown',
                    message: e.message
                }))
            });
        }
        next(error);
    }
};
