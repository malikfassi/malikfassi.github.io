export let isDebugMode = false;
export function toggleDebug() {
    isDebugMode = !isDebugMode;
    return isDebugMode;
}

export const color_config = {
    BUTTERFLY_COLORS: [
        // Deeper Pastels with good contrast
        '#7C4DFF',  // Deep Lavender
        '#6200EA',  // Deep Purple
        '#2962FF',  // Deep Blue
        '#00838F',  // Deep Cyan
        '#00695C',  // Deep Teal
        '#2E7D32',  // Deep Green
        '#827717',  // Deep Lime
        '#FF6D00',  // Deep Orange
        '#D84315',  // Deep Orange-Red
        '#C62828',  // Deep Red
        '#AD1457',  // Deep Pink
        '#6A1B9A',  // Deep Purple-Pink
        '#4527A0',  // Deep Indigo
        '#283593',  // Deep Royal Blue
        '#1565C0',  // Deep Sky Blue
        '#00695C',  // Deep Ocean Green
        '#2E7D32',  // Deep Forest Green
        '#BF360C',  // Deep Burnt Orange
        '#8E24AA',  // Deep Magenta
        '#5E35B1'   // Deep Violet
    ],
    DEBUG: {
        TEXT: 'rgba(0, 0, 0, 0.8)',
        BOX_BG: 'rgba(255, 255, 255, 0.9)',
        BOX_BORDER: 'rgba(0, 0, 0, 0.2)',
        TARGET_LINE: 'rgba(255, 0, 0, 0.6)',
        MOUSE_COORDS: '#FF1493'
    }
};

export const garden_config = {
    BACKGROUND_COLOR: '#f0f4f8',
    ANIMATION_TIME_DIVISOR: 1000
};

export const flower_config = {
    MIN_SIZE: 15,
    MAX_SIZE: 25,
    GROWTH_SPEED: 0.03,
    SWAY_AMOUNT: 0.8,
    WIND_INFLUENCE: 1.2,
    SWAY_SPEED: 0.001
};

export const wind_config = {
    PARTICLE_COUNT: 150,
    PARTICLE_SIZE: 3,
    PARTICLE_TRAIL_LENGTH: 10,
    PARTICLE_FADE_RATE: 0.995,
    FORCE: 5.0,
    CHANGE_SPEED: 0.0003,
    SWAY_AMOUNT: 0.25,
    SWAY_SPEED: 0.002
};

export const butterfly_config = {
    FEAR_RADIUS: 150, //Smaller radius for more precise fear trigger
    ESCAPE_SPEED: 8,
    SCARED_DURATION: 1000,
    STATES: {
        FLYING: 'flying',
        HOVERING: 'hovering',
        SCARED: 'scared',
        LEAVING: 'leaving'
    },
    SIZE: 15,
    MAX_COUNT: 15,
    PEACEFUL_SPEED: 3,
    MAX_SPEED: 5,
    MIN_SPEED: 0.5,
    SCROLL_ADJUSTMENT_SPEED: 1.5,
    SAFE_DISTANCE: 200,
    INTERACTION_RADIUS: 50,
    SPAWN_CONFIG: {
        MIN_INTERVAL: 100,
        MAX_INTERVAL: 200
    },
    HOVER_WORDS_BEFORE_LEAVING: 1,
    LEAVING_SPEED: 3,
    DEBUG: true,
    HOVER_OSCILLATION: {
        AMPLITUDE: 8,
        FREQUENCY: 2000
    },
    EDGE_BUFFER: 100,
    HOVER_THRESHOLD: 15,
    WANDER: {
        AMPLITUDE: 0.7,         // Overall wandering strength
        TARGET_WEIGHT: 0.6,     // Balance between wandering and target-seeking
        DISTANCE_FACTOR: 250,   // How distance affects wandering
        MIN_SPEED_MULT: 0.8,
        MAX_SPEED_MULT: 1.1
    },
    PANIC: {
        FREQUENCY: 15,        // Higher frequency for more erratic movement
        AMPLITUDE: 1.0        // Larger amplitude for more noticeable panic
    },
    HOVER: {
        MIN_DURATION: 5000,  // 5 seconds minimum
        MAX_DURATION: 8000,  // 8 seconds maximum
        TRANSITION_SPEED: 0.1
    }
};