// public/theme.js

(function() {
    // 1. Helper to parse cookies
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // 2. Load Preferences
    const theme = getCookie('cr_theme') || 'paper';
    const font = getCookie('cr_font') || 'serif';
    const weight = getCookie('cr_weight') || '400';
    const size = getCookie('cr_size') || '18';

    // 3. Apply to Root (Prevents Flash)
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    
    // Apply CSS Variables for Reader defaults
    const fontStack = font === 'serif' 
        ? '"Charter", "Bitstream Charter", "Sitka Text", Cambria, serif' 
        : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    
    root.style.setProperty('--reader-font-family', fontStack);
    root.style.setProperty('--reader-font-weight', weight);
    root.style.setProperty('--reader-font-size', size + 'px');
})();