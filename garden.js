import { GARDEN_CONFIG } from './config.js';

// Make sure these are at the very top of garden.js and exported if needed
export let isGardenMode = false;
export let gardenCanvas = null;
export let ctx = null;
export let flowers = [];
export let butterflies = [];
export let windParticles = [];
export let butterflySpawnTimeoutId = null;
let gardenButton = null;
let mouseX = 0;
let mouseY = 0;

// Initialize garden when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeGardenElements);

function initializeGardenElements() {
    gardenButton = document.getElementById('gardenButton');
    gardenCanvas = document.getElementById('gardenCanvas');
    
    if (!gardenButton || !gardenCanvas) {
        console.error('Garden elements not found in the DOM');
        return;
    }
    
    // Add event listener only if button exists
    gardenButton.addEventListener('click', () => {
        if (!isGardenMode) {
            activateGarden();
        } else {
            deactivateGarden();
        }
    });
    
    ctx = gardenCanvas.getContext('2d');
    
    // Add resize handler
    window.addEventListener('resize', handleCanvasResize);
}

function handleCanvasResize() {
    if (!gardenCanvas) return;
    
    // Set actual canvas dimensions to match window
    gardenCanvas.width = window.innerWidth;
    gardenCanvas.height = window.innerHeight;
    
    // Reset CSS dimensions to 100%
    gardenCanvas.style.width = '100%';
    gardenCanvas.style.height = '100%';
    
    // Prevent stretching
    gardenCanvas.style.objectFit = 'contain';
    
    console.log('Canvas resized:', gardenCanvas.width, gardenCanvas.height);
}

export function activateGarden() {
    isGardenMode = true;
    if (!gardenCanvas) {
        gardenCanvas = document.getElementById('gardenCanvas');
    }
    
    gardenCanvas.style.display = 'block';
    ctx = gardenCanvas.getContext('2d');
    
    // Initialize canvas size properly
    handleCanvasResize();
    
    // Rest of activation code...
}

export function deactivateGarden() {
    isGardenMode = false;
    if (gardenCanvas) {
        gardenCanvas.style.display = 'none';
        gardenCanvas.style.pointerEvents = 'none';
        gardenCanvas.removeEventListener('click', plantSeed);
        gardenCanvas.removeEventListener('mousemove', handleMouseMove);
    }
    
    document.body.style.backgroundColor = '';
    
    if (butterflySpawnTimeoutId) {
        clearTimeout(butterflySpawnTimeoutId);
        butterflySpawnTimeoutId = null;
    }
    
    butterflies = [];
    flowers = [];
    windParticles = [];
}

function calculateWindSway(x, y, time) {
    const windTime = time * GARDEN_CONFIG.WIND_SWAY_SPEED;
    const windX = Math.sin(windTime + x / 100);
    const windY = Math.cos(windTime + y / 100) * 0.5;
    return {
        x: windX * GARDEN_CONFIG.WIND_SWAY_AMOUNT,
        y: windY * GARDEN_CONFIG.WIND_SWAY_AMOUNT
    };
}

function plantSeed(event) {
    const rect = gardenCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const flower = {
        x: x,
        y: y,
        size: 5, // Start smaller
        maxSize: GARDEN_CONFIG.FLOWER_CONFIG.MIN_SIZE + 
                Math.random() * (GARDEN_CONFIG.FLOWER_CONFIG.MAX_SIZE - GARDEN_CONFIG.FLOWER_CONFIG.MIN_SIZE),
        color: GARDEN_CONFIG.FLOWER_CONFIG.COLORS[
            Math.floor(Math.random() * GARDEN_CONFIG.FLOWER_CONFIG.COLORS.length)
        ],
        offset: Math.random() * Math.PI * 2,
        sway: 0,
        birthTime: Date.now()
    };
    
    flowers.push(flower);
}

function drawFlower(flower) {
    ctx.save();
    
    // Calculate stem curve based on sway
    const stemHeight = flower.size * 3;
    const controlPointOffset = flower.sway * 30; // Amplify the sway effect
    
    // Draw curved stem
    ctx.beginPath();
    ctx.moveTo(flower.x, flower.y);
    ctx.quadraticCurveTo(
        flower.x + controlPointOffset, 
        flower.y - stemHeight/2,
        flower.x + (controlPointOffset * 1.5), 
        flower.y - stemHeight
    );
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw flower head at the end of stem
    ctx.translate(
        flower.x + (controlPointOffset * 1.5), 
        flower.y - stemHeight
    );
    ctx.rotate(flower.sway * 2); // Amplify rotation
    
    // Draw petals
    ctx.beginPath();
    const petalCount = 8;
    for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const petalSize = flower.size;
        
        ctx.save();
        ctx.rotate(angle);
        // Draw petal as elongated ellipse
        ctx.beginPath();
        ctx.ellipse(0, -petalSize/2, petalSize/3, petalSize, 0, 0, Math.PI * 2);
        ctx.fillStyle = flower.color;
        ctx.fill();
        ctx.restore();
    }
    
    // Draw center of flower
    ctx.beginPath();
    ctx.arc(0, 0, flower.size/4, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700'; // Golden yellow center
    ctx.fill();
    
    ctx.restore();
}

function drawButterfly(butterfly) {
    const { x, y, size, angle } = butterfly;
    const time = Date.now() / GARDEN_CONFIG.ANIMATION_TIME_DIVISOR;
    const wingFlap = Math.sin(time * 8) * Math.PI / 6; // Wing flapping animation
    
    ctx.save();
    ctx.translate(Math.floor(x), Math.floor(y));
    ctx.rotate(angle + Math.sin(time) * 0.1); // Body rotation
    
    // Wing pattern
    const wingPattern = [
        [0, 0, '#B2EBF2', '#B2EBF2', 0, 0],
        [0, '#81D4FA', '#4FC3F7', '#4FC3F7', '#81D4FA', 0],
        ['#81D4FA', '#4FC3F7', '#29B6F6', '#29B6F6', '#4FC3F7', '#81D4FA'],
        [0, '#81D4FA', '#4FC3F7', '#4FC3F7', '#81D4FA', 0],
        [0, 0, '#B2EBF2', '#B2EBF2', 0, 0]
    ];

    const scale = Math.max(1, Math.floor(size / 6));
    
    // Draw left wing
    ctx.save();
    ctx.rotate(-wingFlap);
    wingPattern.forEach((row, i) => {
        row.forEach((pixel, j) => {
            if (pixel) {
                ctx.fillStyle = pixel;
                ctx.fillRect(
                    Math.floor((j - wingPattern[0].length) * scale),
                    Math.floor((i - wingPattern.length/2) * scale),
                    scale,
                    scale
                );
            }
        });
    });
    ctx.restore();

    // Draw right wing
    ctx.save();
    ctx.rotate(wingFlap);
    wingPattern.forEach((row, i) => {
        row.forEach((pixel, j) => {
            if (pixel) {
                ctx.fillStyle = pixel;
                ctx.fillRect(
                    Math.floor(j * scale),
                    Math.floor((i - wingPattern.length/2) * scale),
                    scale,
                    scale
                );
            }
        });
    });
    ctx.restore();

    // Draw body
    ctx.fillStyle = '#37474F';
    for(let i = -2; i <= 2; i++) {
        ctx.fillRect(
            -scale/2,
            i * scale,
            scale,
            scale
        );
    }
    
    ctx.restore();
}

function drawWindParticle(particle) {
    ctx.save();
    
    particle.trail.forEach((pos, index) => {
        const alpha = (particle.opacity * (1 - index / GARDEN_CONFIG.WIND_CONFIG.PARTICLE_TRAIL_LENGTH));
        ctx.fillStyle = `rgba(220, 220, 220, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(
            Math.floor(pos.x), 
            Math.floor(pos.y), 
            GARDEN_CONFIG.WIND_CONFIG.PARTICLE_SIZE * (1 - index / GARDEN_CONFIG.WIND_CONFIG.PARTICLE_TRAIL_LENGTH * 0.3),
            0,
            Math.PI * 2
        );
        ctx.fill();
    });
    
    ctx.restore();
}

function updateFlower(flower) {
    // Update flower growth
    if (flower.size < flower.maxSize) {
        flower.size += (flower.maxSize - flower.size) * GARDEN_CONFIG.FLOWER_CONFIG.GROWTH_SPEED;
    }

    const time = Date.now() / 1000;
    const windAngle = Math.sin(time * GARDEN_CONFIG.WIND_CONFIG.CHANGE_SPEED) * Math.PI;
    const windForce = (Math.sin(time * GARDEN_CONFIG.WIND_CONFIG.CHANGE_SPEED * 2) + 1) 
                     * GARDEN_CONFIG.WIND_CONFIG.FORCE;
    
    // Calculate base sway with smoother movement
    const baseSway = Math.sin(time * GARDEN_CONFIG.FLOWER_CONFIG.SWAY_SPEED + flower.offset) * 0.3;
    
    // Add some noise to make movement more natural
    const noise = Math.sin(time * 0.001 + flower.offset * 2) * 0.1;
    
    // Combine all effects
    const windEffect = Math.cos(windAngle) * windForce * GARDEN_CONFIG.FLOWER_CONFIG.WIND_INFLUENCE;
    flower.sway = (baseSway + windEffect + noise) * GARDEN_CONFIG.FLOWER_CONFIG.SWAY_AMOUNT;
    
    // Apply height-based multiplier
    const heightMultiplier = flower.size / GARDEN_CONFIG.FLOWER_CONFIG.MIN_SIZE;
    flower.sway *= heightMultiplier;
    
    drawFlower(flower);
}

function animateGarden() {
    if (!isGardenMode) return;
    
    console.log('--- Frame Start ---');
    console.log(`Active particles: ${windParticles.length}`);
    
    ctx.clearRect(0, 0, gardenCanvas.width, gardenCanvas.height);
    
    // Update and draw flowers
    flowers.forEach(updateFlower);
    
    // Update and draw wind particles
    updateWindParticles();
    windParticles.forEach(particle => {
        drawWindParticle(particle);
    });
    
    // Update and draw butterflies
    butterflies.forEach(butterfly => {
        updateButterfly(butterfly, mouseX, mouseY);
        drawButterfly(butterfly);
    });

    if (isGardenMode) {
        requestAnimationFrame(animateGarden);
    }
}

function spawnButterfly() {
    if (butterflies.length >= GARDEN_CONFIG.BUTTERFLY_CONFIG.MAX_COUNT) {
        scheduleNextSpawn();
        return;
    }

    // Spawn from random edge
    const edge = ['top', 'right', 'bottom', 'left'][Math.floor(Math.random() * 4)];
    let x, y, angle;
    
    switch(edge) {
        case 'top':
            x = Math.random() * gardenCanvas.width;
            y = -20;
            angle = Math.PI / 2;
            break;
        case 'right':
            x = gardenCanvas.width + 20;
            y = Math.random() * gardenCanvas.height;
            angle = Math.PI;
            break;
        case 'bottom':
            x = Math.random() * gardenCanvas.width;
            y = gardenCanvas.height + 20;
            angle = -Math.PI / 2;
            break;
        case 'left':
            x = -20;
            y = Math.random() * gardenCanvas.height;
            angle = 0;
            break;
    }

    butterflies.push({
        x,
        y,
        size: GARDEN_CONFIG.BUTTERFLY_CONFIG.SIZE,
        angle,
        state: GARDEN_CONFIG.BUTTERFLY_CONFIG.STATES.SPAWNING,
        birthTime: Date.now(),
        scaredTime: 0,
        velocity: {
            x: Math.cos(angle) * GARDEN_CONFIG.BUTTERFLY_CONFIG.PEACEFUL_SPEED,
            y: Math.sin(angle) * GARDEN_CONFIG.BUTTERFLY_CONFIG.PEACEFUL_SPEED
        }
    });

    scheduleNextSpawn();
}

function scheduleNextSpawn() {
    if (butterflySpawnTimeoutId) {
        clearTimeout(butterflySpawnTimeoutId);
    }
    
    const nextSpawnDelay = GARDEN_CONFIG.SPAWN_CONFIG.BUTTERFLY_MIN_INTERVAL + 
        Math.random() * (GARDEN_CONFIG.SPAWN_CONFIG.BUTTERFLY_MAX_INTERVAL - 
                        GARDEN_CONFIG.SPAWN_CONFIG.BUTTERFLY_MIN_INTERVAL);
    
    butterflySpawnTimeoutId = setTimeout(spawnButterfly, nextSpawnDelay);
}

function updateButterfly(butterfly, mouseX, mouseY) {
    const currentTime = Date.now();
    
    // Handle different states
    switch(butterfly.state) {
        case GARDEN_CONFIG.BUTTERFLY_CONFIG.STATES.SPAWNING:
            handleButterflySpawning(butterfly);
            break;
        case GARDEN_CONFIG.BUTTERFLY_CONFIG.STATES.FLYING:
            handleButterflyFlying(butterfly);
            break;
        case GARDEN_CONFIG.BUTTERFLY_CONFIG.STATES.SITTING:
            handleButterflySitting(butterfly);
            break;
        case GARDEN_CONFIG.BUTTERFLY_CONFIG.STATES.SCARED:
            // Handle scared state
            break;
    }

    // Check for mouse proximity
    const distToMouse = Math.hypot(butterfly.x - mouseX, butterfly.y - mouseY);
    
    if (distToMouse < GARDEN_CONFIG.BUTTERFLY_CONFIG.FEAR_RADIUS) {
        butterfly.state = GARDEN_CONFIG.BUTTERFLY_CONFIG.STATES.SCARED;
        // ... rest of scared behavior
    }
    
    // Update position and physics
    butterfly.x += butterfly.velocity.x;
    butterfly.y += butterfly.velocity.y;
    butterfly.velocity.x *= 0.98;
    butterfly.velocity.y *= 0.98;
}

function updateWindParticles() {
    const time = Date.now() / 1000;
    const windAngle = Math.sin(time * GARDEN_CONFIG.WIND_CONFIG.CHANGE_SPEED) * Math.PI;
    const windForce = (Math.sin(time * GARDEN_CONFIG.WIND_CONFIG.CHANGE_SPEED * 2) + 1) 
                     * GARDEN_CONFIG.WIND_CONFIG.FORCE;

    windParticles.forEach(particle => {
        if (!particle.trail) {
            particle.trail = [];
        }

        particle.trail.unshift({x: particle.x, y: particle.y});
        
        while (particle.trail.length > GARDEN_CONFIG.WIND_CONFIG.PARTICLE_TRAIL_LENGTH) {
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

function handleButterflySpawning(butterfly) {
    // Gradually move into screen
    const targetY = butterfly.y < 0 ? 50 : 
                   butterfly.y > gardenCanvas.height ? gardenCanvas.height - 50 : butterfly.y;
    const targetX = butterfly.x < 0 ? 50 : 
                   butterfly.x > gardenCanvas.width ? gardenCanvas.width - 50 : butterfly.x;
    
    butterfly.x += (targetX - butterfly.x) * 0.05;
    butterfly.y += (targetY - butterfly.y) * 0.05;
    
    // Transition to flying state when close enough to target
    if (Math.abs(butterfly.x - targetX) < 5 && Math.abs(butterfly.y - targetY) < 5) {
        butterfly.state = GARDEN_CONFIG.BUTTERFLY_CONFIG.STATES.FLYING;
    }
}

function handleButterflyLeaving(butterfly) {
    // Find nearest edge
    const edges = [
        {x: butterfly.x, y: -20}, // top
        {x: gardenCanvas.width + 20, y: butterfly.y}, // right
        {x: butterfly.x, y: gardenCanvas.height + 20}, // bottom
        {x: -20, y: butterfly.y} // left
    ];
    
    const nearestEdge = edges.reduce((nearest, edge) => {
        const distToCurrent = Math.hypot(butterfly.x - edge.x, butterfly.y - edge.y);
        const distToNearest = Math.hypot(butterfly.x - nearest.x, butterfly.y - nearest.y);
        return distToCurrent < distToNearest ? edge : nearest;
    });
    
    // Move towards nearest edge
    const angle = Math.atan2(nearestEdge.y - butterfly.y, nearestEdge.x - butterfly.x);
    butterfly.velocity.x = Math.cos(angle) * GARDEN_CONFIG.PEACEFUL_SPEED;
    butterfly.velocity.y = Math.sin(angle) * GARDEN_CONFIG.PEACEFUL_SPEED;
    
    // Update position
    butterfly.x += butterfly.velocity.x;
    butterfly.y += butterfly.velocity.y;
    
    // Remove if off screen
    if (butterfly.x < -30 || butterfly.x > gardenCanvas.width + 30 ||
        butterfly.y < -30 || butterfly.y > gardenCanvas.height + 30) {
        const index = butterflies.indexOf(butterfly);
        if (index > -1) {
            butterflies.splice(index, 1);
        }
    }
}

function handleButterflyFlying(butterfly) {
    // Add random movement
    butterfly.velocity.x += (Math.random() - 0.5) * 0.1;
    butterfly.velocity.y += (Math.random() - 0.5) * 0.1;
    
    // Limit speed
    const speed = Math.hypot(butterfly.velocity.x, butterfly.velocity.y);
    if (speed > GARDEN_CONFIG.PEACEFUL_SPEED) {
        butterfly.velocity.x *= GARDEN_CONFIG.PEACEFUL_SPEED / speed;
        butterfly.velocity.y *= GARDEN_CONFIG.PEACEFUL_SPEED / speed;
    }
    
    // Update position
    butterfly.x += butterfly.velocity.x;
    butterfly.y += butterfly.velocity.y;
    
    // Keep in bounds with margin
    const margin = 50;
    if (butterfly.x < margin) butterfly.velocity.x += 0.1;
    if (butterfly.x > gardenCanvas.width - margin) butterfly.velocity.x -= 0.1;
    if (butterfly.y < margin) butterfly.velocity.y += 0.1;
    if (butterfly.y > gardenCanvas.height - margin) butterfly.velocity.y -= 0.1;
    
    // Random chance to sit on flower
    if (Math.random() < 0.005) {
        const bloomingFlowers = flowers.filter(f => f.state === 'blooming');
        if (bloomingFlowers.length > 0) {
            butterfly.targetFlower = bloomingFlowers[Math.floor(Math.random() * bloomingFlowers.length)];
            butterfly.state = GARDEN_CONFIG.BUTTERFLY_CONFIG.STATES.SITTING;
        }
    }
}

function handleButterflySitting(butterfly) {
    if (!butterfly.targetFlower || butterfly.targetFlower.state !== 'blooming') {
        butterfly.state = GARDEN_CONFIG.BUTTERFLY_CONFIG.STATES.FLYING;
        butterfly.targetFlower = null;
        return;
    }
    
    // Move to flower position
    const targetX = butterfly.targetFlower.x;
    const targetY = butterfly.targetFlower.y - butterfly.size;
    
    butterfly.x += (targetX - butterfly.x) * 0.1;
    butterfly.y += (targetY - butterfly.y) * 0.1;
    
    // Random chance to leave flower
    if (Math.random() < 0.01) {
        butterfly.state = GARDEN_CONFIG.BUTTERFLY_CONFIG.STATES.FLYING;
        butterfly.targetFlower = null;
    }
}

function handleMouseMove(e) {
    const rect = gardenCanvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
}