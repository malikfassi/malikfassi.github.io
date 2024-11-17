import { color_config, flower_config } from './config.js';

export let flowers = [];

export function plantSeed(event, gardenCanvas) {
    const rect = gardenCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const flower = {
        x: x,
        y: y,
        size: 5, // Start smaller
        maxSize: flower_config.MIN_SIZE + 
                Math.random() * (flower_config.MAX_SIZE - flower_config.MIN_SIZE),
        color: color_config.PASTEL_COLORS[Math.floor(Math.random() * color_config.PASTEL_COLORS.length)],
        offset: Math.random() * Math.PI * 2,
        sway: 0,
        birthTime: Date.now(),
        state: 'growing'
    };
    
    flowers.push(flower);
    console.log('Planted a seed at:', x, y);
}

export function updateFlower(flower, ctx) {
    // Update flower growth
    if (flower.size < flower.maxSize) {
        flower.size += (flower.maxSize - flower.size) * flower_config.GROWTH_SPEED;
    }

    const time = Date.now() / 1000;
    const windAngle = Math.sin(time * wind_config.CHANGE_SPEED) * Math.PI;
    const windForce = (Math.sin(time * wind_config.CHANGE_SPEED * 2) + 1) 
                     * wind_config.FORCE;
    
    // Calculate base sway with smoother movement
    const baseSway = Math.sin(time * flower_config.SWAY_SPEED + flower.offset) * 0.3;
    
    // Add some noise to make movement more natural
    const noise = Math.sin(time * 0.001 + flower.offset * 2) * 0.1;
    
    // Combine all effects
    const windEffect = Math.cos(windAngle) * windForce * flower_config.WIND_INFLUENCE;
    flower.sway = (baseSway + windEffect + noise) * flower_config.SWAY_AMOUNT;
    
    // Apply height-based multiplier
    const heightMultiplier = flower.size / flower_config.MIN_SIZE;
    flower.sway *= heightMultiplier;
    
    drawFlower(flower, ctx);
}

function drawFlower(flower, ctx) {
    ctx.save();
    ctx.translate(flower.x, flower.y);
    ctx.fillStyle = flower.color;
    ctx.beginPath();
    ctx.arc(0, 0, flower.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}