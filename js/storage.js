/**
 * Handles all synchronous local and session storage operations.
 */
export const Storage = {
    // Auth State
    setAuth: (username) => sessionStorage.setItem('auth_user', username),
    getAuth: () => sessionStorage.getItem('auth_user'),
    clearAuth: () => sessionStorage.removeItem('auth_user'),

    // Theme Preferences
    setTheme: (theme) => localStorage.setItem('app_theme', theme),
    getTheme: () => localStorage.getItem('app_theme') || 'dark'
};