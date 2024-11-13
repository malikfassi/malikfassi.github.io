import { GARDEN_CONFIG } from './config.js';

/**
 * Butterfly state and animations
 */
let butterflies = [];

export function handleButterflies(ctx) {
    const mousePos = { x: 0, y: 0 };
    butterflies.forEach(butterfly => {
        updateButterfly(butterfly, mousePos);
        drawButterfly(ctx, butterfly);
    });
}

// ... (previous butterfly functions with comments)