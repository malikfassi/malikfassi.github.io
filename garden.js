document.addEventListener('DOMContentLoaded', function() {
    const gardenToggle = document.getElementById('gardenToggle');
    const gardenCanvas = document.getElementById('gardenCanvas');
    const ctx = gardenCanvas.getContext('2d');
    let isGardenMode = false;
    let flowers = [];
    let butterflies = [];
    let windParticles = [];
    const flowerMaxSize = 20;
    const butterflySize = 10;
    const windParticleSize = 2;

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
        document.body.style.backgroundColor = '#f0f8ff'; // Light pastel blue
        gardenCanvas.addEventListener('click', plantSeed);
        console.log('Garden mode activated');
        requestAnimationFrame(animateGarden);
    }

    function deactivateGarden() {
        gardenCanvas.style.display = 'none';
        gardenCanvas.style.pointerEvents = 'none'; // Disable pointer events when not in garden mode
        document.body.style.backgroundColor = '';
        gardenCanvas.removeEventListener('click', plantSeed);
        ctx.clearRect(0, 0, gardenCanvas.width, gardenCanvas.height);
        flowers = [];
        butterflies = [];
        windParticles = [];
        console.log('Garden mode deactivated');
    }

    function plantSeed(e) {
        const x = e.clientX;
        const y = e.clientY;
        console.log(`Planting seed at (${x}, ${y})`);
        flowers.push({ x, y, size: 2, state: 'seed', age: 0 });
        butterflies.push({ x, y, size: butterflySize, angle: 0, targetFlower: null, sitting: false });
        console.log('Current flowers:', flowers);
        console.log('Current butterflies:', butterflies);
    }

    function drawFlower(flower) {
        const { x, y, size, state } = flower;
        const petalSize = size / 2;

        if (state === 'seed') {
            ctx.fillStyle = 'brown';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        } else if (state === 'growing' || state === 'blooming') {
            // Draw petals
            ctx.fillStyle = 'lightpink';
            ctx.beginPath();
            ctx.arc(x - petalSize, y - petalSize, petalSize, 0, Math.PI * 2);
            ctx.arc(x + petalSize, y - petalSize, petalSize, 0, Math.PI * 2);
            ctx.arc(x - petalSize, y + petalSize, petalSize, 0, Math.PI * 2);
            ctx.arc(x + petalSize, y + petalSize, petalSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw center
            ctx.fillStyle = 'lightyellow';
            ctx.beginPath();
            ctx.arc(x, y, petalSize, 0, Math.PI * 2);
            ctx.fill();
        } else if (state === 'rotting') {
            // Draw rotting petals
            ctx.fillStyle = 'lightbrown';
            ctx.beginPath();
            ctx.arc(x - petalSize, y - petalSize, petalSize, 0, Math.PI * 2);
            ctx.arc(x + petalSize, y - petalSize, petalSize, 0, Math.PI * 2);
            ctx.arc(x - petalSize, y + petalSize, petalSize, 0, Math.PI * 2);
            ctx.arc(x + petalSize, y + petalSize, petalSize, 0, Math.PI * 2);
            ctx.fill();

            // Draw center
            ctx.fillStyle = 'darkred';
            ctx.beginPath();
            ctx.arc(x, y, petalSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawButterfly(butterfly) {
        const { x, y, size } = butterfly;
        ctx.fillStyle = 'lightblue';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - size / 2, y - size / 2);
        ctx.lineTo(x, y - size);
        ctx.lineTo(x + size / 2, y - size / 2);
        ctx.closePath();
        ctx.fill();
    }

    function drawWindParticle(particle) {
        ctx.fillStyle = 'lightgray';
        ctx.fillRect(particle.x - windParticleSize / 2, particle.y - windParticleSize / 2, windParticleSize, windParticleSize);
    }

    function animateGarden() {
        ctx.clearRect(0, 0, gardenCanvas.width, gardenCanvas.height);

        flowers.forEach(flower => {
            // Update flower state
            flower.age++;
            if (flower.state === 'seed' && flower.age > 20) {
                flower.state = 'growing';
            } else if (flower.state === 'growing') {
                flower.size += 0.5;
                if (flower.size >= flowerMaxSize) {
                    flower.state = 'blooming';
                }
            } else if (flower.state === 'blooming' && flower.age > 200) {
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

        butterflies.forEach(butterfly => {
            if (!butterfly.sitting) {
                if (Math.random() < 0.01) {
                    // Occasionally choose a flower to sit on
                    const bloomingFlowers = flowers.filter(flower => flower.state === 'blooming');
                    if (bloomingFlowers.length > 0) {
                        butterfly.targetFlower = bloomingFlowers[Math.floor(Math.random() * bloomingFlowers.length)];
                        butterfly.sitting = true;
                    }
                }
                butterfly.angle += (Math.random() - 0.5) * 0.2; // Add randomness to the angle
                butterfly.x += Math.cos(butterfly.angle) * 2;
                butterfly.y += Math.sin(butterfly.angle) * 2;
            } else {
                // Sit on the flower for a while
                if (butterfly.targetFlower && butterfly.targetFlower.state === 'blooming') {
                    butterfly.x = butterfly.targetFlower.x;
                    butterfly.y = butterfly.targetFlower.y - butterflySize;
                    if (Math.random() < 0.01) {
                        butterfly.sitting = false;
                        butterfly.targetFlower = null;
                    }
                } else {
                    butterfly.sitting = false;
                    butterfly.targetFlower = null;
                }
            }
            drawButterfly(butterfly);
        });

        windParticles.forEach(particle => {
            particle.x += Math.random() * 2 - 1;
            particle.y += Math.random() * 2 - 1;
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
            y: Math.random() * gardenCanvas.height
        });
    }
    console.log('Wind particles initialized');
});