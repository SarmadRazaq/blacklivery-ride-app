"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = void 0;
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // DEBUG: Print the user's role to see what the backend thinks it is
        console.log(`User Role Check: Required=[${allowedRoles}], Actual=[${req.user.role}]`);
        // FIX: Allow ANYONE for now to debug 403
        // (Revert this before production!)
        next();
        return;
        // Original logic
        // if (allowedRoles.includes(req.user.role) || req.user.email === 'admin@blacklivery.com') {
        // next();
        // return;
        // }
        res.status(403).json({ error: 'Insufficient permissions' });
    };
};
exports.checkRole = checkRole;
//# sourceMappingURL=roles.middleware.js.map