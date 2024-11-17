import { wind_config } from './config.js';

export let windParticles = [];

export function updateWindParticles(gardenCanvas) {
    const time = Date.now() / 1000;
    const windAngle = Math.sin(time * wind_config.CHANGE_SPEED) * Math.PI;
    const windForce = (Math.sin(time * wind_config.CHANGE_SPEED * 2) + 1) 
                     * wind_config.FORCE;

    windParticles.forEach(particle => {
        if (!particle.trail) {
            particle.trail = [];
        }

        particle.trail.unshift({x: particle.x, y: particle.y});
        
        while (particle.trail.length > wind_config.PARTICLE_TRAIL_LENGTH) {
            particle.trail.pop();
        }

        // Gentler movement with wind
        const noise = Math.sin(particle.x / 200 + time) * 0.3;
        particle.x += Math.cos(windAngle + noise) * windForce * 0.5;
        particle.y += Math.sin(windAngle + noise) * windForce * 0.3;

        // Wrap around screen instead of resetting
        if (particle.x < 0) particle.x = gardenCanvas.width;
        if (particle.x > gardenCanvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = gardenCanvas.height;
        if (particle.y > gardenCanvas.height) particle.y = 0;
    });
}

export function drawWindParticle(particle) {
    ctx.save();
    
    particle.trail.forEach((pos, index) => {
        const alpha = (particle.opacity * (1 - index / wind_config.PARTICLE_TRAIL_LENGTH));
        ctx.fillStyle = `rgba(220, 220, 220, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(
            Math.floor(pos.x), 
            Math.floor(pos.y), 
            wind_config.PARTICLE_SIZE * (1 - index / wind_config.PARTICLE_TRAIL_LENGTH * 0.3),
            0,
            Math.PI * 2
        );
        ctx.fill();
    });
    
    ctx.restore();
} 