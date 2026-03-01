"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = void 0;
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        var _a, _b, _c;
        console.log(`User Role Check: Required=[${allowedRoles}], Actual=[${(_a = req.user) === null || _a === void 0 ? void 0 : _a.role}]`);
        if (allowedRoles.includes((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) || ((_c = req.user) === null || _c === void 0 ? void 0 : _c.email) === 'admin@blacklivery.com') {
            next();
            return;
        }
        res.status(403).json({ error: 'Insufficient permissions' });
    };
};
exports.checkRole = checkRole;
//# sourceMappingURL=roles.middleware.js.map