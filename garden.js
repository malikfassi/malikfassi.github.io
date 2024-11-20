import { color_config, butterfly_config } from "./config.js";
import { plantSeed, updateFlower, flowers } from "./flower.js";
import { getElementPagePosition } from "./utils.js";
import {
  updateWindParticles,
  windParticles,
  drawWindParticle,
} from "./wind.js";
import {
  updateButterfly,
  butterflies,
  scheduleNextSpawn,
  drawButterfly,
  getRelativeButterflyPosition,
  setAbsoluteButterflyPosition
} from "./butterfly.js";
import { isDebugMode, toggleDebug } from './config.js';

// Garden state and elements
export let isGardenMode = false;
export let gardenCanvas = null;
export let ctx = null;
let mouseX = 0;
let mouseY = 0;
let caughtButterfliesCount = 0;

// Initialize garden when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Wait a small amount of time to ensure all elements are loaded
    setTimeout(() => {
        initializeGardenElements();
        activateGarden(); // Activate garden mode by default
    }, 100);
});

function initializeGardenElements() {
    gardenCanvas = document.getElementById("gardenCanvas");
    if (!gardenCanvas) {
        console.error("Creating canvas element");
        gardenCanvas = document.createElement('canvas');
        gardenCanvas.id = 'gardenCanvas';
        gardenCanvas.className = 'garden-canvas';
        document.body.appendChild(gardenCanvas);
    }

    ctx = gardenCanvas.getContext("2d");

    // Add resize handler
    window.addEventListener("resize", handleCanvasResize);
    handleCanvasResize(); // Initial resize

    // Add event listeners for interaction
    gardenCanvas.addEventListener("click", handleCanvasClick);
    
    console.log('Garden elements initialized');

    // Add debug toggle
    const debugToggle = document.getElementById('debugToggle');
    if (debugToggle) {
        debugToggle.addEventListener('click', () => {
            const debugEnabled = toggleDebug();
            debugToggle.style.background = debugEnabled ? '#ff4444' : '#333';
            console.log('Debug mode:', debugEnabled);
        });
    }

    // Add mouse move listener
    window.addEventListener('mousemove', (event) => {
        const rect = gardenCanvas.getBoundingClientRect();
        mouseX = event.clientX - rect.left;
        mouseY = event.clientY - rect.top;
        
        if (isDebugMode) {
            console.log('Mouse moved:', { mouseX, mouseY });
        }
    });
}


function handleCanvasResize() {
    if (!gardenCanvas) return;
    
    // Get the full document width including any overflow
    const docWidth = Math.max(
        document.documentElement.clientWidth,
        document.documentElement.offsetWidth,
        document.documentElement.scrollWidth
    );
    
    // Get the full document height
    const docHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
    );

    // Only update and log if dimensions actually changed
    if (gardenCanvas.width !== docWidth || gardenCanvas.height !== docHeight) {
        // Set canvas dimensions
        gardenCanvas.width = docWidth;
        gardenCanvas.height = docHeight;

        if (butterfly_config.DEBUG) {
            console.log('Canvas resized to:', { 
                width: docWidth, 
                height: docHeight,
                viewport: { 
                    width: window.innerWidth, 
                    height: window.innerHeight 
                }
            });
        }
    }
}

// Call on initialization and window resize
window.addEventListener('resize', handleCanvasResize);
window.addEventListener('load', handleCanvasResize);

// Also call when content changes might affect document height
const observer = new ResizeObserver(() => {
    handleCanvasResize();
});
observer.observe(document.body);

export function activateGarden() {
    isGardenMode = true;
    
    // Get canvas element
    gardenCanvas = document.getElementById("gardenCanvas");
    
    if (!gardenCanvas) {
        console.error("Garden canvas not found!");
        return;
    }
    
    // Initialize canvas
    gardenCanvas.style.display = "block";
    ctx = gardenCanvas.getContext("2d");
    
    // Set up canvas size
    handleCanvasResize();
    
    // Add all event listeners here where we know canvas exists
    window.addEventListener('scroll', updateWordCoordinate);
    window.addEventListener('resize', updateWordCoordinate);
    gardenCanvas.addEventListener('mousemove', handleMouseMove);
    gardenCanvas.addEventListener('click', handleCanvasClick);
    
    // Start periodic coordinate updates
    setInterval(updateWordCoordinate, 100);
    
    // Start animation loop
    requestAnimationFrame(draw);
    
    // Start spawning butterflies
    scheduleNextSpawn();
}

export function deactivateGarden() {
    isGardenMode = false;
    
    // Remove event listeners
    window.removeEventListener('scroll', updateWordCoordinate);
    window.removeEventListener('resize', updateWordCoordinate);
    if (gardenCanvas) {
        gardenCanvas.removeEventListener('mousemove', handleMouseMove);
        gardenCanvas.removeEventListener('click', handleCanvasClick);
    }
    
    // Clear any intervals or timeouts
    clearInterval(updateWordCoordinate);
    
    // Clear canvas if it exists
    if (gardenCanvas && ctx) {
        ctx.clearRect(0, 0, gardenCanvas.width, gardenCanvas.height);
    }
}

function animateGarden() {
    if (!isGardenMode) return;

    const ctx = gardenCanvas.getContext('2d');
    ctx.clearRect(0, 0, gardenCanvas.width, gardenCanvas.height);

    // Update and draw wind particles
    updateWindParticles(gardenCanvas);
    windParticles.forEach(particle => drawWindParticle(ctx, particle));

    // Update and draw flowers
    flowers.forEach(flower => updateFlower(flower, ctx));

    // Update and draw butterflies with current mouse position
    butterflies.forEach(butterfly => {
        updateButterfly(butterfly, mouseX, mouseY);
        drawButterfly(ctx, butterfly);
    });

    if (isDebugMode) {
        drawDebugInfo(ctx, mouseX, mouseY);
        drawCursorInfo(ctx);
    }

    requestAnimationFrame(animateGarden);
}

function handleMouseMove(e) {
    if (!gardenCanvas) return;
    
    const rect = gardenCanvas.getBoundingClientRect();
    
    // Calculate mouse position relative to canvas
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    
    // Add scroll offset
    mouseX += window.scrollX;
    mouseY += window.scrollY;

    // Debug log
    if (isDebugMode) {
        console.log('Mouse position:', { mouseX, mouseY });
    }
}

function handleCanvasClick(event) {
    // Get the canvas position
    const canvasRect = gardenCanvas.getBoundingClientRect();
    
    // Calculate click position relative to the canvas
    const clickX = event.pageX - canvasRect.left;
    const clickY = event.pageY - canvasRect.top;

    butterflies.forEach((butterfly, index) => {
        const distance = Math.hypot(butterfly.x - clickX, butterfly.y - clickY);
        if (distance < butterfly_config.SIZE) {
            butterflies.splice(index, 1);
            caughtButterfliesCount++;
            updateCaughtButterfliesDisplay();
        }
    });
}

function updateCaughtButterfliesDisplay() {
  const displayElement = document.getElementById('caughtButterfliesCount');
  if (displayElement) {
    displayElement.textContent = `Butterflies Caught: ${caughtButterfliesCount}`;
  }
}

function drawDebugInfo(ctx, mouseX, mouseY) {
    if (!isDebugMode) return;

    // Initialize state counts from butterfly config states
    const stateCounts = {};
    Object.values(butterfly_config.STATES).forEach(state => {
        stateCounts[state] = 0;
    });

    // Count butterflies in each state
    butterflies.forEach(butterfly => {
        stateCounts[butterfly.state] = (stateCounts[butterfly.state] || 0) + 1;
    });

    // Calculate total butterflies
    const totalButterflies = butterflies.length;

    // Draw state counts on canvas
    ctx.save();
    const stateText = Object.entries(stateCounts)
        .map(([state, count]) => `${state}: ${count}`)
        .join(' | ');
    const fullText = `Total: ${totalButterflies} | ${stateText}`;
    
    // Calculate dimensions
    ctx.font = '14px Arial';
    const textWidth = ctx.measureText(fullText).width;
    const padding = 10;
    const boxWidth = textWidth + (padding * 2);
    const boxHeight = 25;
    const cornerRadius = 8;
    
    // Position at top center of canvas
    const x = (gardenCanvas.width - boxWidth) / 2;
    const y = 10;

    // Draw background
    ctx.fillStyle = color_config.DEBUG.BOX_BG;
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, cornerRadius);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = color_config.DEBUG.BOX_BORDER;
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, cornerRadius);
    ctx.stroke();

    // Draw text
    ctx.fillStyle = color_config.DEBUG.TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fullText, x + boxWidth/2, y + boxHeight/2);
    ctx.restore();

    // Keep all existing debug drawing code
    butterflies.forEach(butterfly => {
        // Calculate positions first
        const relativePos = getRelativeButterflyPosition(butterfly, gardenCanvas);
        const screenX = butterfly.x;
        const screenY = butterfly.y;
        
        // Draw background box first
        ctx.save();
        const lines = [
            `State: ${butterfly.state}`,
            `Words Hovered: ${butterfly.wordsHovered || 0}`,
            `Target word: ${butterfly.targetElement?.textContent}`,
            `Pos: (${Math.round(screenX)}, ${Math.round(screenY)})`
        ];
        
        // Add hover timer if hovering
        if (butterfly.state === butterfly_config.STATES.HOVERING && butterfly.hoveringStartTime) {
            const hoverTime = Date.now() - butterfly.hoveringStartTime;
            const remainingTime = Math.max(0, (butterfly.currentHoverDuration - hoverTime) / 1000).toFixed(1);
            lines.push(`Hover Time: ${remainingTime}s`);
        }
        
        // Calculate box dimensions
        const lineHeight = 15;
        const padding = 10; // Increased padding
        const cornerRadius = 8; // Added corner radius
        ctx.font = '12px Arial';
        const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        const boxWidth = maxWidth + (padding * 2);
        const boxHeight = (lines.length * lineHeight) + (padding * 2);
        
        // Draw rounded rectangle background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.roundRect(screenX + 20, screenY - 35, boxWidth, boxHeight, cornerRadius);
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.roundRect(screenX + 20, screenY - 35, boxWidth, boxHeight, cornerRadius);
        ctx.stroke();
        
        // Draw text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        lines.forEach((line, index) => {
            ctx.fillText(line, screenX + 20 + padding, screenY - 35 + padding + (lineHeight * index));
        });
        
        // Draw target line and info if exists
        if (butterfly.targetElement) {
            const targetPos = getElementPagePosition(butterfly.targetElement, gardenCanvas);
            
            // Draw line to target
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.moveTo(screenX, screenY);
            ctx.lineTo(targetPos.x, targetPos.y);
            ctx.stroke();
            
            // Draw target position with rounded corners
            const targetText = `Target: (${Math.round(targetPos.x)}, ${Math.round(targetPos.y)})`;
            const targetWidth = ctx.measureText(targetText).width + (padding * 2);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.roundRect(targetPos.x - targetWidth/2, targetPos.y - 25, targetWidth, 20, cornerRadius);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.beginPath();
            ctx.roundRect(targetPos.x - targetWidth/2, targetPos.y - 25, targetWidth, 20, cornerRadius);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillText(targetText, targetPos.x - targetWidth/2 + padding, targetPos.y - 15);
        }
        
        ctx.restore();
    }); 
}

function drawCursorInfo(ctx) {
      // Draw mouse coordinates if needed
      if (mouseX !== undefined && mouseY !== undefined) {
        const mouseText = `Mouse: (${Math.round(mouseX)}, ${Math.round(mouseY)})`;
        ctx.font = '12px monospace';
        const textWidth = ctx.measureText(mouseText).width;
        const padding = 10;
        const boxWidth = textWidth + (padding * 2);
        const boxHeight = 20;
        const cornerRadius = 8;

        // Draw background
        ctx.fillStyle = color_config.DEBUG.BOX_BG;
        ctx.beginPath();
        ctx.roundRect(mouseX + 20, mouseY - 25, boxWidth, boxHeight, cornerRadius);
        ctx.fill();

        // Draw border
        ctx.strokeStyle = color_config.DEBUG.BOX_BORDER;
        ctx.beginPath();
        ctx.roundRect(mouseX + 20, mouseY - 25, boxWidth, boxHeight, cornerRadius);
        ctx.stroke();

        // Draw text
        ctx.fillStyle = color_config.DEBUG.MOUSE_COORDS;
        ctx.fillText(mouseText, mouseX + 20 + padding, mouseY - 12);
    }
}

function updateWordCoordinate(element) {
    if (!isDebugMode || !element) return;
    
    let coordElement = element.querySelector('.word-coordinates');
    if (!coordElement) {
        coordElement = document.createElement('div');
        coordElement.className = 'word-coordinates';
        element.appendChild(coordElement);
    }
    
    const rect = element.getBoundingClientRect();
    const canvasRect = gardenCanvas.getBoundingClientRect();
    const x = rect.left + rect.width/2 - canvasRect.left;
    const y = rect.top + rect.height/2 - canvasRect.top;
    
    coordElement.textContent = `(${Math.round(x)}, ${Math.round(y)})`;
}

// Modify the draw function to pass mouse coordinates
function draw() {
    ctx.clearRect(0, 0, gardenCanvas.width, gardenCanvas.height);
    
    // Update and draw butterflies with mouse coordinates
    butterflies.forEach(butterfly => {
        updateButterfly(butterfly, mouseX, mouseY);
        drawButterfly(ctx, butterfly);
    });

    if (isDebugMode) {
        drawDebugInfo(ctx, mouseX, mouseY);
    }

    requestAnimationFrame(draw);
}
