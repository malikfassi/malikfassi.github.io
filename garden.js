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
  catchButterfly
} from "./butterfly.js";
import { isDebugMode, toggleDebug } from './config.js';

// Declare and initialize caughtButterfliesCount
let caughtButterfliesCount = 0;

// Garden state and elements
export let isGardenMode = false;
export let gardenCanvas = null;
export let ctx = null;

// Mouse state management
export const mouseState = {
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    isMoving: false,
    speed: 0,
    // Add touch support
    isTouch: false,
    touchId: null
};

// Initialize garden when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Wait a small amount of time to ensure all elements are loaded
    setTimeout(() => {
        initializeGardenElements();
        activateGarden(); // Activate garden mode by default
    }, 100);
});

// Single initialization function
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
    
    // Set up canvas size
    handleCanvasResize();
    
    // Add single resize handler
    window.addEventListener("resize", handleCanvasResize);
    
    // Initialize mouse tracking
    initializeMouseTracking();

    // Add debug toggle
    const debugToggle = document.getElementById('debugToggle');
    if (debugToggle) {
        debugToggle.addEventListener('click', () => {
            const debugEnabled = toggleDebug();
            debugToggle.style.background = debugEnabled ? '#ff4444' : '#333';
            console.log('Debug mode:', debugEnabled);
        });
    }
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

export function activateGarden() {
    isGardenMode = true;
    
    if (!gardenCanvas) {
        console.error("Garden canvas not found!");
        return;
    }
    
    // Show canvas
    gardenCanvas.style.display = "block";
    
    // Start animation loop
    requestAnimationFrame(animateGarden);
    
    // Start spawning butterflies
    scheduleNextSpawn();
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

    // Update and draw butterflies
    butterflies.forEach(butterfly => {
        updateButterfly(butterfly);
        drawButterfly(ctx, butterfly);
    });

    // Update the butterfly states count display
    updateButterflyStatesCounts();

    if (isDebugMode) {
        drawDebugInfo(ctx);
        drawCursorInfo(ctx);
    }

    requestAnimationFrame(animateGarden);
}

// Single mouse move handler that updates all necessary state
function handleMouseMove(event) {
    if (!gardenCanvas || mouseState.isTouch) return;
    
    const rect = gardenCanvas.getBoundingClientRect();
    updateMousePosition(event.clientX, event.clientY, rect);
    
    if (mouseState.isMoving) {
        handleInteraction(mouseState.x, mouseState.y);
    }
}

function handleInteraction(x, y) {
    butterflies.forEach((butterfly, index) => {
        const distance = Math.hypot(butterfly.x - x, butterfly.y - y);
        if (distance < butterfly_config.SIZE) {
            butterflies.splice(index, 1);
            caughtButterfliesCount++;
            updateCaughtButterfliesDisplay();
            updateButterflyStatesCounts();
        }
    });
}

// Initialize mouse tracking in a single place
function initializeMouseTracking() {
    if (!gardenCanvas) return;
    
    console.log('initializeMouseTracking isDebugMode', isDebugMode);
    console.log('Attaching mousemove event listener to canvas:', gardenCanvas);

    // Add mouse and touch listeners with passive option
    gardenCanvas.addEventListener('mousemove', handleMouseMove);
    gardenCanvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    gardenCanvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    gardenCanvas.addEventListener('touchend', handleTouchEnd);
    gardenCanvas.addEventListener('touchcancel', handleTouchEnd);
    
    // Initialize state
    mouseState.lastTime = Date.now();
}

function updateCaughtButterfliesDisplay() {
  const displayElement = document.getElementById('caughtButterfliesCount');
  if (displayElement) {
    displayElement.textContent = `Butterflies Caught: ${caughtButterfliesCount}`;
  }
}

function drawDebugInfo(ctx) {
    if (!isDebugMode) return;

    // Draw lines to targets for each butterfly
    butterflies.forEach(butterfly => {
        if (document.getElementById('showLineToTarget').checked) {  
            drawLineToTarget(ctx, butterfly);
        }
        drawButterflyDebugInfo(ctx, butterfly);
    });
}

function drawLineToTarget(ctx, butterfly) {
    if (butterfly.targetElement) {
        const targetPos = getElementPagePosition(butterfly.targetElement, gardenCanvas);
        ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)'; // Blue line with some transparency
        ctx.beginPath();
        ctx.moveTo(butterfly.x, butterfly.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();
    }
}

function drawButterflyDebugInfo(ctx, butterfly) {
    const screenX = butterfly.x;
    const screenY = butterfly.y;
    const distanceToCursor = Math.hypot(butterfly.x - mouseState.x, butterfly.y - mouseState.y);

    ctx.save();
    const lines = [];

    if (document.getElementById('showState').checked) {
        lines.push(`State: ${butterfly.state}`);
    }
    if (document.getElementById('showWordsHovered').checked) {
        lines.push(`Words Hovered: ${butterfly.wordsHovered || 0}`);
    }
    if (document.getElementById('showTargetWord').checked) {
        lines.push(`Target word: ${butterfly.targetElement?.textContent}`);
    }
    if (document.getElementById('showTargetPos').checked) {
        lines.push(`Target Pos: (${Math.round(butterfly.targetX)}, ${Math.round(butterfly.targetY)})`);
    }
    if (document.getElementById('showButterflyPos').checked) {
        lines.push(`Butterfly Pos: (${Math.round(screenX)}, ${Math.round(screenY)})`);
    }
    if (document.getElementById('showDistanceToCursor').checked) {
        lines.push(`Distance to Cursor: ${Math.round(distanceToCursor)}`);
    }
    if (document.getElementById('showVelocity').checked) {
        lines.push(`Velocity: ${butterfly.velocity.x.toFixed(3)}, ${butterfly.velocity.y.toFixed(3)}`);
    }
    if (document.getElementById('showHoveringDuration').checked) {
        if (butterfly.state === butterfly_config.STATES.HOVERING && butterfly.hoveringStartTime) {
            const hoverTime = Date.now() - butterfly.hoveringStartTime;
            const remainingTime = Math.max(0, (butterfly.currentHoverDuration - hoverTime) / 1000).toFixed(1);
            lines.push(`Hover Time: ${remainingTime}s`);
        }
    }

    const lineHeight = 15;
    const padding = 10;
    const cornerRadius = 8;
    ctx.font = '12px Arial';
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const boxWidth = maxWidth + (padding * 2);
    const boxHeight = (lines.length * lineHeight) + (padding * 2);

    // Draw background with padding
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.roundRect(screenX + 20, screenY - 35, boxWidth, boxHeight, cornerRadius);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.roundRect(screenX + 20, screenY - 35, boxWidth, boxHeight, cornerRadius);
    ctx.stroke();

    // Draw text with padding
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    lines.forEach((line, index) => {
        ctx.fillText(line, screenX + 20 + padding, screenY - 35 + padding + (lineHeight * index));
    });

    ctx.restore();
}

function drawCursorInfo(ctx) {
    // Draw mouse coordinates using mouseState
    const mouseText = `Mouse: (${Math.round(mouseState.x)}, ${Math.round(mouseState.y)})`;
    ctx.font = '12px monospace';
    const textWidth = ctx.measureText(mouseText).width;
    const padding = 10;
    const boxWidth = textWidth + (padding * 2);
    const boxHeight = 20;
    const cornerRadius = 8;

    // Draw background
    ctx.fillStyle = color_config.DEBUG.BOX_BG;
    ctx.beginPath();
    ctx.roundRect(mouseState.x + 20, mouseState.y - 25, boxWidth, boxHeight, cornerRadius);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = color_config.DEBUG.BOX_BORDER;
    ctx.beginPath();
    ctx.roundRect(mouseState.x + 20, mouseState.y - 25, boxWidth, boxHeight, cornerRadius);
    ctx.stroke();

    // Draw text
    ctx.fillStyle = color_config.DEBUG.MOUSE_COORDS;
    ctx.fillText(mouseText, mouseState.x + 20 + padding, mouseState.y - 12);
}

function handleTouchStart(event) {
    if (!gardenCanvas) return;
    
    event.preventDefault(); // Prevent default touch behavior
    const touch = event.touches[0];
    const rect = gardenCanvas.getBoundingClientRect();
    
    mouseState.isTouch = true;
    mouseState.touchId = touch.identifier;
    
    updateMousePosition(touch.clientX, touch.clientY, rect);
    handleInteraction(mouseState.x, mouseState.y);
}

function handleTouchMove(event) {
    if (!gardenCanvas || !mouseState.isTouch) return;
    
    event.preventDefault(); // Prevent default touch behavior
    const touch = Array.from(event.touches)
        .find(t => t.identifier === mouseState.touchId);
    
    if (!touch) return;
    
    const rect = gardenCanvas.getBoundingClientRect();
    updateMousePosition(touch.clientX, touch.clientY, rect);
    handleInteraction(mouseState.x, mouseState.y);
}

function handleTouchEnd() {
    mouseState.isTouch = false;
    mouseState.touchId = null;
}

// Centralized mouse position update
function updateMousePosition(clientX, clientY, rect) {
    const currentTime = Date.now();
    
    // Store previous position
    mouseState.lastX = mouseState.x;
    mouseState.lastY = mouseState.y;
    
    // Calculate new position relative to canvas and add scroll offset
    mouseState.x = clientX - rect.left + window.scrollX;
    mouseState.y = clientY - rect.top + window.scrollY;
    
    // Calculate movement speed
    const dx = mouseState.x - mouseState.lastX;
    const dy = mouseState.y - mouseState.lastY;
    const timeDelta = currentTime - mouseState.lastTime;
    mouseState.speed = Math.hypot(dx, dy) / Math.max(1, timeDelta);
    
    // Update timing
    mouseState.lastTime = currentTime;
    mouseState.isMoving = mouseState.speed > 0.1;
    
    // Debug logging
    if (isDebugMode) {
        console.log('Mouse position updated:', {
            clientX,
            clientY,
            rect: {
                left: rect.left,
                top: rect.top
            },
            scroll: {
                x: window.scrollX,
                y: window.scrollY
            },
            final: {
                x: mouseState.x,
                y: mouseState.y
            }
        });
    }
}

// Keep only the ResizeObserver for dynamic content changes
const observer = new ResizeObserver(() => {
    handleCanvasResize();
});
observer.observe(document.body);


function updateButterflyStatesCounts() {
    const stateCounts = {
        FLYING: 0,
        HOVERING: 0,
        LEAVING: 0,
        SCARED: 0
    };

    butterflies.forEach(butterfly => {
        stateCounts[butterfly.state] = (stateCounts[butterfly.state] || 0) + 1;
    });

    const totalButterflies = butterflies.length;

    const displayElement = document.getElementById('butterflyStatesCounts');
    if (displayElement) {
        displayElement.textContent = `Total: ${totalButterflies} | FLYING: ${stateCounts.FLYING} | HOVERING: ${stateCounts.HOVERING} | LEAVING: ${stateCounts.LEAVING} | SCARED: ${stateCounts.SCARED}`;
        displayElement.style.display = showStatsCheckbox.checked ? 'block' : 'none';
    }
}

document.getElementById('settingsButton').addEventListener('click', () => {
    // Toggle settings container visibility
    const settingsContainer = document.getElementById('settingsContainer');
    settingsContainer.style.display = settingsContainer.style.display === 'none' ? 'block' : 'none';
});

document.getElementById('settingsTitle').addEventListener('click', () => {
    // Toggle settings content visibility
    const settingsContent = document.getElementById('settingsContent');
    settingsContent.style.display = settingsContent.style.display === 'none' ? 'block' : 'none';
});

const debugCheckbox = document.getElementById('debugMode');
if (debugCheckbox) {
    debugCheckbox.addEventListener('change', () => {
        // Toggle debug mode
        const debugEnabled = toggleDebug();
        debugCheckbox.checked = debugEnabled;
        console.log('Debug mode:', debugEnabled);
    });
}

const showStatsCheckbox = document.getElementById('showStats');
if (showStatsCheckbox) {
    showStatsCheckbox.addEventListener('change', () => {
        //toggle stats display
        const displayElement = document.getElementById('butterflyStatesCounts');
        displayElement.style.display = showStatsCheckbox.checked ? 'block' : 'none';
    });
}
