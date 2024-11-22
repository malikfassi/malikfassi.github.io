class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 2;
        this.speedY = (Math.random() - 0.5) * 2;
        this.color = 'rgba(255, 215, 0, 1)'; // Gold color for spark
        this.life = 100; // Particle life in frames
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 1;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

let particles = [];

export function createParticles(x, y) {
    for (let i = 0; i < 20; i++) { // Create 20 particles
        particles.push(new Particle(x, y));
    }
}

export function updateParticles(ctx) {
    particles = particles.filter(particle => particle.life > 0);
    particles.forEach(particle => {
        particle.update();
        particle.draw(ctx);
    });
}