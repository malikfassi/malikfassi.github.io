export let isDebugMode = false;
export function toggleDebug() {
    isDebugMode = !isDebugMode;
    document.body.classList.toggle('debug-mode', isDebugMode);
    return isDebugMode;
}

export const color_config = {
    BUTTERFLY_COLORS: [
        '#FF99B4', '#94D8E5', '#D5A6E6', '#FFB182', '#82C7FF',
        '#B8E6B8', '#FFB5A6', '#C5B3FF', '#FFA6D1', '#A6E6A6',
        '#A6D9D9', '#FFB2CC', '#A6E6D9', '#D1B3FF', '#FFB999',
        '#B8E6A6', '#E6B3E6', '#FFB2B2', '#CCE6A6', '#E6B3FF'
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
    FEAR_RADIUS: 100,
    ESCAPE_SPEED: 8,
    SCARED_DURATION: 500,
    STATES: {
        FLYING: 'FLYING',
        HOVERING: 'HOVERING',
        SCARED: 'SCARED',
        LEAVING: 'LEAVING'
    },
    SIZE: 15,
    MAX_COUNT: 40,
    PEACEFUL_SPEED: 3,
    MAX_SPEED: 5,
    MIN_SPEED: 0.5,
    SCROLL_ADJUSTMENT_SPEED: 1.5,
    SAFE_DISTANCE: 150,
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
        AMPLITUDE: 0.7,
        TARGET_WEIGHT: 0.6,
        DISTANCE_FACTOR: 250,
        MIN_SPEED_MULT: 0.8,
        MAX_SPEED_MULT: 1.1
    },
    PANIC: {
        FREQUENCY: 4,
        AMPLITUDE: 2
    },
    HOVER: {
        MIN_DURATION: 5000,
        MAX_DURATION: 8000,
        TRANSITION_SPEED: 0.1
    },
    LOG_THRESHOLD: 50,
    WANDER_RADIUS: 15,
    FLASH_SPEED: 0.02,
    ANGER_TINT: 0.8
};

export const heatmap_config = {
    CELL_SIZE: 2,
    INFLUENCE_RADIUS: 10,
    FADE_RATE: 0.98,
    INTENSITY_MULTIPLIER: 20
};