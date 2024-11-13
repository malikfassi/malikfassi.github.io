export const GARDEN_CONFIG = {
    // Canvas
    CANVAS_OPACITY: 0.5,
    
    // Flower
    FLOWER_MAX_SIZE: 20,
    FLOWER_INITIAL_SIZE: 2,
    FLOWER_SCALE_DIVISOR: 8,
    FLOWER_GROWTH_AGE: 100,
    FLOWER_SEED_TO_GROWING_AGE: 20,
    FLOWER_BLOOMING_TO_ROTTING_AGE: 500, // Longer bloom time
    FLOWER_ROTTING_TO_DISAPPEARING_AGE: 300,
    FLOWER_SWAY_DIVISOR: 100,
    FLOWER_SWAY_MULTIPLIER: 0.3,
    
    // Butterfly
    BUTTERFLY_SIZE: 10,
    BUTTERFLY_LANDING_CHANCE: 0.01,
    BUTTERFLY_TAKEOFF_CHANCE: 0.01,
    BUTTERFLY_SPEED: 2,
    BUTTERFLY_ANGLE_RANDOMNESS: 0.2,
    
    // Wind
    WIND_PARTICLE_SIZE: 4,
    WIND_PARTICLE_COUNT: 100,
    WIND_SPEED: 2,
    WIND_FORCE: 0.2,
    WIND_CHANGE_SPEED: 0.001,
    WIND_PARTICLE_TRAIL_LENGTH: 3,
    WIND_PARTICLE_FADE_RATE: 0.95,
    
    // Animation
    ANIMATION_TIME_DIVISOR: 1000,
    
    // Colors
    BACKGROUND_COLOR: '#f0f8ff',
    COLORS: {
        STEM: '#2E7D32',
        LEAF: '#43A047',
        SEED: '#8B4513',
        SEED_DARK: '#A0522D',
        PETAL_LIGHT: '#FFB7C5',
        PETAL_MID: '#FF69B4',
        PETAL_DARK: '#FF1493',
        CENTER_LIGHT: '#FFD700',
        CENTER_DARK: '#FFA500'
    },
    STEM_LENGTH: 16, // Longer stem
    FEAR_RADIUS: 100,
    PEACEFUL_SPEED: 1,
    ESCAPE_SPEED: 4,
    SPAWN_INTERVAL: 5000,
    MAX_BUTTERFLIES: 10,
    SEED_MIN_DISTANCE: 40, // Minimum distance between seeds
    FRAME_DURATION: 200, // ms per frame
    FLOWER_STAGES: {
        SEED: 0,
        GROWING_START: 20,
        GROWING_MID: 50,
        BLOOMING: 100,
        ROTTING: 500,
        DISAPPEARING: 600
    },
    WIND_SWAY_SPEED: 0.002,
    WIND_SWAY_AMOUNT: 0.3,
    BUTTERFLY_STATES: {
        FLYING: 'flying',
        SCARED: 'scared',
        SITTING: 'sitting',
        SPAWNING: 'spawning',
        LEAVING: 'leaving'
    }
};

export const PIXEL_ART = {
    seed: [
        // Frame 1
        [
            [0,0,0,0,0,0,0,0],
            [0,0,0,'#8B4513',0,0,0,0],
            [0,0,'#8B4513','#A0522D','#8B4513',0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0]
        ],
        // Frame 2
        [
            [0,0,0,0,0,0,0,0],
            [0,0,'#8B4513','#A0522D','#8B4513',0,0,0],
            [0,0,'#A0522D','#8B4513','#A0522D',0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0]
        ]
    ],
    growing: [
        // Frame 1 - Initial sprout
        [
            [0,0,0,'#43A047',0,0,0,0],
            [0,0,'#43A047','#2E7D32','#43A047',0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0]
        ],
        // Frame 2 - Bud forming
        [
            [0,0,'#FFB7C5',0,'#FFB7C5',0,0,0],
            [0,0,'#FF69B4','#2E7D32','#FF69B4',0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0],
            [0,0,'#43A047','#2E7D32',0,0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0]
        ],
        // Frame 3 - Petals opening
        [
            [0,0,'#FFB7C5',0,'#FFB7C5',0,0,0],
            [0,'#FFB7C5','#FF69B4','#FFD700','#FF69B4','#FFB7C5',0,0],
            [0,0,'#FF69B4','#2E7D32','#FF69B4',0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0],
            [0,0,'#43A047','#2E7D32','#43A047',0,0,0],
            [0,0,0,'#2E7D32',0,0,0,0]
        ]
    ],
    blooming: [
        // Frame 1 - Full bloom
        [
            [0,0,'#FFB7C5',0,'#FFB7C5',0,0,0],
            [0,'#FFB7C5','#FF69B4','#FFD700','#FF69B4','#FFB7C5',0,0],
            ['#FFB7C5','#FF69B4','#FFD700','#FFA500','#FFD700','#FF69B4','#FFB7C5',0],
            [0,'#FFB7C5','#FF69B4','#FFD700','#FF69B4','#FFB7C5',0,0],
            [0,0,'#FFB7C5',0,'#FFB7C5',0,0,0]
        ],
        // Frame 2 - Slight petal movement
        [
            [0,'#FFB7C5',0,'#FFB7C5',0,'#FFB7C5',0,0],
            ['#FFB7C5','#FF69B4','#FFD700','#FFA500','#FFD700','#FF69B4','#FFB7C5',0],
            [0,'#FF69B4','#FFD700','#FFA500','#FFD700','#FF69B4',0,0],
            ['#FFB7C5','#FF69B4','#FFD700','#FFA500','#FFD700','#FF69B4','#FFB7C5',0],
            [0,'#FFB7C5',0,'#FFB7C5',0,'#FFB7C5',0,0]
        ]
    ]
};