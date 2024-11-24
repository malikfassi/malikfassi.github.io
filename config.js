export const settings = {
    isShowStats: false,
    isShowLineToTarget: true,
    isShowState: true,
    isShowWordsHovered: false,
    isShowTargetWord: false,
    isShowTargetPos: false,
    isShowButterflyPos: false,
    isShowDistanceToCursor: false,
    isShowVelocity: true,
    isShowHoveringDuration: false,
    isShowScareTime: false
};

export function updateDebugMode() {
    settings.isDebugMode = Object.values(settings).some(value => value);
    document.body.classList.toggle('debug-mode', settings.isDebugMode);
}

export function toggleSetting(settingKey) {
    if (settings.hasOwnProperty(settingKey)) {
        settings[settingKey] = !settings[settingKey];
        document.body.classList.toggle(settingKey, settings[settingKey]);
        updateDebugMode();
        return settings[settingKey];
    }
    return null;
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
    ESCAPE_SPEED: 20,
    PEACEFUL_SPEED: 5,
    MAX_SPEED: 7,
    MIN_SPEED: 3,
    SCARED_DURATION: 1000,
    STATES: {
        FLYING: 'FLYING',
        HOVERING: 'HOVERING',
        SCARED: 'SCARED',
        LEAVING: 'LEAVING'
    },
    SIZE: 15,
    MAX_COUNT: 40,
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

export const disney_color_palette = [
    '#FF6F61', // Coral
    '#6B5B95', // Purple
    '#88B04B', // Green
    '#F7CAC9', // Pink
    '#92A8D1', // Blue
    '#955251', // Brown
    '#B565A7', // Lavender
    '#009B77', // Teal
    '#DD4124', // Red
    '#D65076'  // Magenta
];