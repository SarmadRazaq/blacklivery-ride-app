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
        // Note: In Express 5, req.query and req.params are read-only getters,
        // so we mutate the existing objects in-place rather than reassigning.
        if (parsed.body) req.body = parsed.body;
        if (parsed.query) {
            const q = req.query as Record<string, any>;
            for (const key of Object.keys(q)) delete q[key];
            Object.assign(q, parsed.query);
        }
        if (parsed.params) {
            for (const key of Object.keys(req.params)) delete req.params[key];
            Object.assign(req.params, parsed.params);
        }

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
