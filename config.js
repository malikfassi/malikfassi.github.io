export let isDebugMode = false;
export function toggleDebug() {
    isDebugMode = !isDebugMode;
    return isDebugMode;
}

export const color_config = {
    PASTEL_COLORS: [
        '#FF8A8A',  // Darker Soft Red
        '#FF9E9E',  // Darker Soft Pink
        '#FFC4A3',  // Darker Soft Peach
        '#C8E6A3',  // Darker Soft Green
        '#A8D8C0',  // Darker Soft Mint
        '#B0BEEA',  // Darker Soft Lavender
        '#E3D58A',  // Darker Soft Yellow
        '#E5A88A',  // Darker Soft Apricot
        '#C39AFF',  // Darker Soft Violet
        '#8AA9E9',  // Darker Soft Blue
        '#8CCF8A',  // Darker Soft Lime
        '#E08A8F',  // Darker Soft Coral
        '#C8A3D7',  // Darker Soft Purple
        '#9F8DBB',  // Darker Soft Indigo
        '#7FAFE9'   // Darker Soft Sky Blue
    ]
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
    FEAR_RADIUS: 150,
    ESCAPE_SPEED: 6,
    SCARED_DURATION: 1000,
    STATES: {
        FLYING: 'flying',
        HOVERING: 'hovering',
        SCARED: 'scared',
        LEAVING: 'leaving'
    },
    SIZE: 15,
    MAX_COUNT: 5,
    PEACEFUL_SPEED: 2,
    MAX_SPEED: 5,
    MIN_SPEED: 0.5,
    SCROLL_ADJUSTMENT_SPEED: 1.5,
    SAFE_DISTANCE: 200,
    INTERACTION_RADIUS: 50,
    SPAWN_CONFIG: {
        MIN_INTERVAL: 100,
        MAX_INTERVAL: 200
    },
    HOVER_WORDS_BEFORE_LEAVING: 3,
    LEAVING_SPEED: 5,
    DEBUG: true,
    HOVER_OSCILLATION: {
        AMPLITUDE: 8,
        FREQUENCY: 2000
    }
};