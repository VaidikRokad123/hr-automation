import jwt from 'jsonwebtoken';

function getTokenFromHeader(headerValue = '') {
    const [scheme, token] = headerValue.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token;
}

export function authenticateToken(req, res, next) {
    const token = getTokenFromHeader(req.headers.authorization || '');

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication token required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hr-management-dev-secret');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}

export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'You do not have permission to access this resource' });
        }

        next();
    };
}
