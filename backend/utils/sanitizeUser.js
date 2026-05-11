export function sanitizeUser(user) {
    if (!user) {
        return null;
    }

    const plainUser = typeof user.toObject === 'function' ? user.toObject() : user;
    const { password, ...safeUser } = plainUser;
    return safeUser;
}
