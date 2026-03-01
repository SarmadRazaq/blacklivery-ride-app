// ─── Theme Constants ─────────────────────────────────────────────────────────
// Centralized color tokens used outside of Tailwind classes (e.g. in charts,
// map markers, inline SVGs). Tailwind classes should reference the Tailwind
// config instead.

// ─── Map Marker Colors ───────────────────────────────────────────────────────
export const MAP_MARKER_COLORS = {
    ONLINE: '#10B981',   // Emerald 500
    BUSY: '#EF4444',     // Red 500
    STROKE: 'white',
} as const;

// ─── Chart Colors ────────────────────────────────────────────────────────────
export const CHART_COLORS = {
    GRID_STROKE: '#f0f0f0',
    AXIS_TICK: '#9ca3af',        // Gray 400
    REVENUE_LINE: '#3b82f6',     // Blue 500
    RIDES_BAR: '#10b981',        // Emerald 500
} as const;

// ─── CSS Root Colors (referenced in index.css) ──────────────────────────────
// These correspond to the CSS custom properties. If you need to change root
// colors, update index.css CSS variables instead.
export const ROOT_COLORS = {
    TEXT: '#0f172a',          // Slate 900
    BACKGROUND: '#f8fafc',   // Slate 50
} as const;
