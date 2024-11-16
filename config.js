export const GARDEN_CONFIG = {
    BACKGROUND_COLOR: '#e8f5e9',
    
    FLOWER_CONFIG: {
        MIN_SIZE: 15,
        MAX_SIZE: 25,
        GROWTH_SPEED: 0.03,
        SWAY_AMOUNT: 0.8,
        WIND_INFLUENCE: 1.2,
        SWAY_SPEED: 0.001,
        COLORS: [
            '#FF6B6B',  // Red
            '#4ECDC4',  // Turquoise
            '#45B7D1',  // Light blue
            '#96CEB4',  // Mint
            '#FFEEAD'   // Light yellow
        ]
    },
    
    BUTTERFLY_CONFIG: {
        SIZE: 15,
        MAX_COUNT: 5,
        PEACEFUL_SPEED: 2,
        FEAR_RADIUS: 100,
        ESCAPE_SPEED: 5,
        STATES: {
            SPAWNING: 'spawning',
            FLYING: 'flying',
            SCARED: 'scared',
            SITTING: 'sitting'
        }
    },
    
    WIND_CONFIG: {
        PARTICLE_COUNT: 150,
        PARTICLE_SIZE: 3,
        PARTICLE_TRAIL_LENGTH: 10,
        PARTICLE_FADE_RATE: 0.995,
        FORCE: 5.0,
        CHANGE_SPEED: 0.0003,
        SWAY_AMOUNT: 0.25,
        SWAY_SPEED: 0.002
    },
    
    SPAWN_CONFIG: {
        BUTTERFLY_MIN_INTERVAL: 3000,
        BUTTERFLY_MAX_INTERVAL: 8000
    }
};