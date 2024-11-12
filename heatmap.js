document.addEventListener('DOMContentLoaded', function() {
    const modeToggle = document.getElementById('modeToggle');
    const heatmapCanvas = document.getElementById('heatmapCanvas');
    const ctx = heatmapCanvas.getContext('2d');
    let isHeatmapMode = false;
    let heatmapData = {};
    const cellSize = 2;
    const influenceRadius = 10; // Radius of influence in cells
    const fadeRate = 0.98; // Rate at which the heatmap fades
    const intensityMultiplier = 20; // Multiplier to increase intensity faster

    function resizeCanvas() {
        heatmapCanvas.width = window.innerWidth;
        heatmapCanvas.height = window.innerHeight;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function activateHeatmap() {
        heatmapCanvas.style.display = 'block';
        document.body.style.backgroundColor = '#d3d3d3'; // Light pale blue-grey
        document.addEventListener('mousemove', updateHeatmap);
        requestAnimationFrame(fadeHeatmap);
    }

    function deactivateHeatmap() {
        heatmapCanvas.style.display = 'none';
        document.body.style.backgroundColor = '';
        document.removeEventListener('mousemove', updateHeatmap);
        ctx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);
        heatmapData = {};
    }

    function getColor(intensity) {
        const ratio = intensity / 255;
        const r = Math.min(255, Math.max(0, 255 * (ratio - 0.5) * 2));
        const g = Math.min(255, Math.max(0, 255 * (1 - Math.abs(ratio - 0.5) * 2)));
        const b = Math.min(255, Math.max(0, 255 * (0.5 - ratio) * 2));
        return `rgb(${r}, ${g}, ${b})`;
    }

    function updateHeatmap(e) {
        const x = Math.floor(e.clientX / cellSize);
        const y = Math.floor(e.clientY / cellSize);

        for (let dx = -influenceRadius; dx <= influenceRadius; dx++) {
            for (let dy = -influenceRadius; dy <= influenceRadius; dy++) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance <= influenceRadius) {
                    const key = `${x + dx},${y + dy}`;
                    const influence = 1 - (distance / influenceRadius);
                    heatmapData[key] = (heatmapData[key] || 0) + influence;
                }
            }
        }

        drawHeatmap();
    }

    function drawHeatmap() {
        ctx.clearRect(0, 0, heatmapCanvas.width, heatmapCanvas.height);

        for (let pos in heatmapData) {
            const [x, y] = pos.split(',').map(Number);
            const intensity = Math.min(heatmapData[pos] * intensityMultiplier, 255);
            ctx.fillStyle = getColor(intensity);
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }

    function fadeHeatmap() {
        for (let pos in heatmapData) {
            heatmapData[pos] *= fadeRate;
            if (heatmapData[pos] < 1) {
                delete heatmapData[pos];
            }
        }
        drawHeatmap();
        if (isHeatmapMode) {
            requestAnimationFrame(fadeHeatmap);
        }
    }

    modeToggle.addEventListener('click', function() {
        isHeatmapMode = !isHeatmapMode;
        if (isHeatmapMode) {
            activateHeatmap();
            this.textContent = 'Normal Mode';
        } else {
            deactivateHeatmap();
            this.textContent = 'Toggle Heatmap';
        }
    });
});