import { GARDEN_CONFIG, PIXEL_ART } from './config.js';

document.addEventListener('DOMContentLoaded', function() {
    const gardenToggle = document.getElementById('gardenToggle');
    const gardenCanvas = document.getElementById('gardenCanvas');
    const ctx = gardenCanvas.getContext('2d');
    let isGardenMode = false;
    let flowers = [];
    let butterflies = [];
    let windParticles = [];
    const flowerMaxSize = GARDEN_CONFIG.FLOWER_MAX_SIZE;
    let butterflySpawnTimeoutId = null;

    function resizeCanvas() {
        gardenCanvas.width = window.innerWidth;
        gardenCanvas.height = window.innerHeight;
        console.log('Canvas resized to', gardenCanvas.width, gardenCanvas.height);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function activateGarden() {
        gardenCanvas.style.display = 'block';
        gardenCanvas.style.pointerEvents = 'auto'; // Ensure canvas captures pointer events
        document.body.style.backgroundColor = GARDEN_CONFIG.BACKGROUND_COLOR;
        gardenCanvas.addEventListener('click', plantSeed);
        
        // Initialize arrays if needed
        butterflies = Array.isArray(butterflies) ? butterflies : [];
        
        console.log('Garden mode activated');
        requestAnimationFrame(animateGarden);
        spawnButterfly(); // Start spawning butterflies
    }

    function deactivateGarden() {
        gardenCanvas.style.display = 'none';
        gardenCanvas.style.pointerEvents = 'none'; // Disable pointer events when not in garden mode
        document.body.style.backgroundColor = '';
        gardenCanvas.removeEventListener('click', plantSeed);
        
        if (butterflySpawnTimeoutId) {
            clearTimeout(butterflySpawnTimeoutId);
            butterflySpawnTimeoutId = null;
        }
        
        ctx.clearRect(0, 0, gardenCanvas.width, gardenCanvas.height);
        flowers = [];
        butterflies = [];
        windParticles = [];
        console.log('Garden mode deactivated');
    }

    function canPlantSeed(x, y) {
        return !flowers.some(flower => 
            Math.hypot(flower.x - x, flower.y - y) < GARDEN_CONFIG.SEED_MIN_DISTANCE
        );
    }

    function getFlowerFrame(flower) {
        const { state, age } = flower;
        
        // Validate state exists in PIXEL_ART
        if (!PIXEL_ART[state] || !PIXEL_ART[state].length) {
            console.warn(`No frames found for flower state: ${state}`);
            return PIXEL_ART.seed[0]; // Return default frame
        }
        
        const frameIndex = Math.floor((age / GARDEN_CONFIG.FRAME_DURATION)) % PIXEL_ART[state].length;
        return PIXEL_ART[state][frameIndex];
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

    function plantSeed(e) {
        const x = e.clientX;
        const y = e.clientY;
        
        if (canPlantSeed(x, y)) {
            flowers.push({ x, y, size: 2, state: 'seed', age: 0 });
            console.log(`Planting seed at (${x}, ${y})`);
        }
    }

    function drawFlower(flower) {
        const { x, y, size, state, age } = flower;
        const scale = Math.max(1, Math.floor(size / 8));
        const time = Date.now() / GARDEN_CONFIG.ANIMATION_TIME_DIVISOR;
        
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        
        const frame = getFlowerFrame(flower);
        if (!frame) return; // Skip drawing if no frame
        
        // Apply wind sway if not a seed
        if (state !== 'seed') {
            const sway = calculateWindSway(x, y, time);
            ctx.translate(Math.floor(x + sway.x * scale), Math.floor(y + sway.y * scale));
        } else {
            ctx.translate(Math.floor(x), Math.floor(y));
        }
        
        const growthProgress = Math.min(1, age / GARDEN_CONFIG.FLOWER_STAGES.BLOOMING);
        
        frame.forEach((row, i) => {
            if (i <= frame.length * growthProgress) {
                row.forEach((pixel, j) => {
                    if (pixel) {
                        ctx.fillStyle = pixel;
                        ctx.fillRect(
                            Math.floor((j - frame[0].length/2) * scale),
                            Math.floor((i - frame.length) * scale),
                            scale,
                            scale
                        );
                    }
                });
            }
        });
        
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
        particle.trail.forEach((pos, index) => {
            const alpha = (particle.opacity * (1 - index / GARDEN_CONFIG.WIND_PARTICLE_TRAIL_LENGTH));
            ctx.fillStyle = `rgba(200, 200, 255, ${alpha})`;
            ctx.fillRect(
                Math.floor(pos.x), 
                Math.floor(pos.y), 
                GARDEN_CONFIG.WIND_PARTICLE_SIZE, 
                GARDEN_CONFIG.WIND_PARTICLE_SIZE
            );
        });
    }

    function animateGarden() {
        // Clear with integer coordinates
        ctx.clearRect(0, 0, Math.floor(gardenCanvas.width), Math.floor(gardenCanvas.height));
        
        flowers.forEach(flower => {
            // Update flower state
            flower.age++;
            if (flower.state === 'seed' && flower.age > 20) {
                flower.state = 'growing';
            } else if (flower.state === 'growing') {
                flower.size += 0.2; // Slower growth
                if (flower.size >= GARDEN_CONFIG.FLOWER_MAX_SIZE) {
                    flower.state = 'blooming';
                }
            } else if (flower.state === 'blooming' && flower.age > GARDEN_CONFIG.FLOWER_BLOOMING_TO_ROTTING_AGE) {
                flower.state = 'rotting';
            } else if (flower.state === 'rotting' && flower.age > 300) {
                flower.state = 'disappearing';
            }

            if (flower.state !== 'disappearing') {
                drawFlower(flower);
            }
        });

        // Remove disappeared flowers
        flowers = flowers.filter(flower => flower.state !== 'disappearing');

        let mouseX = 0, mouseY = 0;
        gardenCanvas.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        butterflies.forEach(butterfly => {
            updateButterfly(butterfly, mouseX, mouseY);
            drawButterfly(butterfly);
        });

        updateWindParticles();

        windParticles.forEach(particle => {
            drawWindParticle(particle);
        });

        if (isGardenMode) {
            requestAnimationFrame(animateGarden);
        }
    }

    gardenToggle.addEventListener('click', function() {
        isGardenMode = !isGardenMode;
        if (isGardenMode) {
            activateGarden();
            this.textContent = 'Normal Mode';
        } else {
            deactivateGarden();
            this.textContent = 'Toggle Garden';
        }
    });

    // Initialize wind particles
    for (let i = 0; i < 100; i++) {
        windParticles.push({
            x: Math.random() * gardenCanvas.width,
            y: gardenCanvas.height,
            opacity: 1,
            trail: []
        });
    }
    console.log('Wind particles initialized');

    function spawnButterfly() {
        // Safety check for butterflies array
        if (!Array.isArray(butterflies)) {
            butterflies = [];
        }

        if (butterflies.length >= GARDEN_CONFIG.MAX_BUTTERFLIES) {
            scheduleNextSpawn();
            return;
        }

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
            size: GARDEN_CONFIG.BUTTERFLY_SIZE,
            angle,
            state: GARDEN_CONFIG.BUTTERFLY_STATES.SPAWNING,
            birthTime: Date.now(),
            velocity: {
                x: Math.cos(angle) * GARDEN_CONFIG.PEACEFUL_SPEED,
                y: Math.sin(angle) * GARDEN_CONFIG.PEACEFUL_SPEED
            }
        });

        scheduleNextSpawn();
    }

    function scheduleNextSpawn() {
        if (butterflySpawnTimeoutId) {
            clearTimeout(butterflySpawnTimeoutId);
        }
        
        const nextSpawnDelay = GARDEN_CONFIG.BUTTERFLY_MIN_SPAWN_INTERVAL + 
            Math.random() * (GARDEN_CONFIG.BUTTERFLY_MAX_SPAWN_INTERVAL - GARDEN_CONFIG.BUTTERFLY_MIN_SPAWN_INTERVAL);
        
        butterflySpawnTimeoutId = setTimeout(spawnButterfly, nextSpawnDelay);
    }

    function updateButterfly(butterfly, mouseX, mouseY) {
        const age = Date.now() - butterfly.birthTime;
        
        // Check if butterfly should leave
        if (age > GARDEN_CONFIG.BUTTERFLY_LIFESPAN) {
            butterfly.state = GARDEN_CONFIG.BUTTERFLY_STATES.LEAVING;
        }

        // Handle scared state
        const distToMouse = Math.hypot(butterfly.x - mouseX, butterfly.y - mouseY);
        if (distToMouse < GARDEN_CONFIG.FEAR_RADIUS && 
            butterfly.state !== GARDEN_CONFIG.BUTTERFLY_STATES.LEAVING) {
            butterfly.state = GARDEN_CONFIG.BUTTERFLY_STATES.SCARED;
            const escapeAngle = Math.atan2(butterfly.y - mouseY, butterfly.x - mouseX);
            butterfly.velocity.x = Math.cos(escapeAngle) * GARDEN_CONFIG.ESCAPE_SPEED;
            butterfly.velocity.y = Math.sin(escapeAngle) * GARDEN_CONFIG.ESCAPE_SPEED;
        } else if (butterfly.state === GARDEN_CONFIG.BUTTERFLY_STATES.SCARED) {
            butterfly.state = GARDEN_CONFIG.BUTTERFLY_STATES.FLYING;
        }

        // Update position based on state
        switch (butterfly.state) {
            case GARDEN_CONFIG.BUTTERFLY_STATES.LEAVING:
                handleButterflyLeaving(butterfly);
                break;
            case GARDEN_CONFIG.BUTTERFLY_STATES.FLYING:
                handleButterflyFlying(butterfly);
                break;
            case GARDEN_CONFIG.BUTTERFLY_STATES.SITTING:
                handleButterflySitting(butterfly);
                break;
            case GARDEN_CONFIG.BUTTERFLY_STATES.SPAWNING:
                handleButterflySpawning(butterfly);
                break;
        }
    }

    function updateWindParticles() {
        // Calculate wind direction and force
        const time = Date.now() / 1000;
        const baseWindAngle = Math.sin(time * GARDEN_CONFIG.WIND_CHANGE_SPEED) * Math.PI;
        const windForce = (Math.sin(time * GARDEN_CONFIG.WIND_CHANGE_SPEED * 2) + 1) * GARDEN_CONFIG.WIND_FORCE;

        windParticles.forEach(particle => {
            if (!particle.trail) {
                particle.trail = [];
                particle.opacity = 1;
            }

            // Update position with wind physics
            const noise = Math.sin(particle.x / 100 + time) * 0.5; // Perlin-like noise
            particle.x += Math.cos(baseWindAngle + noise) * windForce;
            particle.y += Math.sin(baseWindAngle + noise) * windForce + 0.1; // Slight upward drift

            // Add current position to trail
            particle.trail.unshift({x: particle.x, y: particle.y});
            if (particle.trail.length > GARDEN_CONFIG.WIND_PARTICLE_TRAIL_LENGTH) {
                particle.trail.pop();
            }

            // Fade out particle
            particle.opacity *= GARDEN_CONFIG.WIND_PARTICLE_FADE_RATE;

            // Reset particle if it's too faded or out of bounds
            if (particle.opacity < 0.1 || 
                particle.x < 0 || particle.x > gardenCanvas.width ||
                particle.y < 0 || particle.y > gardenCanvas.height) {
                resetWindParticle(particle);
            }
        });
    }

    function resetWindParticle(particle) {
        particle.x = Math.random() * gardenCanvas.width;
        particle.y = gardenCanvas.height;
        particle.opacity = 1;
        particle.trail = [];
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
            butterfly.state = GARDEN_CONFIG.BUTTERFLY_STATES.FLYING;
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
                butterfly.state = GARDEN_CONFIG.BUTTERFLY_STATES.SITTING;
            }
        }
    }

    function handleButterflySitting(butterfly) {
        if (!butterfly.targetFlower || butterfly.targetFlower.state !== 'blooming') {
            butterfly.state = GARDEN_CONFIG.BUTTERFLY_STATES.FLYING;
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
            butterfly.state = GARDEN_CONFIG.BUTTERFLY_STATES.FLYING;
            butterfly.targetFlower = null;
        }
    }
});