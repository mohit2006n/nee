/**
 * Theme Script
 * ------------
 * Toggle between light and dark themes.
 * Persists preference in localStorage.
 */

export function initTheme() {
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
}

export function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    return isDark;
}

export function setTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
}

export function getTheme() {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

// Auto-init on load
if (typeof window !== 'undefined') {
    initTheme();
}
