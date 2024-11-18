import { garden_config, butterfly_config } from "./config.js";
import { plantSeed, updateFlower, flowers } from "./flower.js";
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
} from "./butterfly.js";
import { isDebugMode, toggleDebug } from './config.js';

// Garden state and elements
export let isGardenMode = false;
export let gardenCanvas = null;
export let ctx = null;
let gardenButton = null;
let mouseX = 0;
let mouseY = 0;
let caughtButterfliesCount = 0;

// Add at the top of the file
let frameCount = 0;
const LOG_INTERVAL = 60; // Log every 60 frames

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
    gardenCanvas.addEventListener("mousemove", handleMouseMove);
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

    // Add scroll event listener
    window.addEventListener('scroll', handleGlobalScroll);
}

function handleGlobalScroll() {
    butterflies.forEach(butterfly => {
        if (butterfly.targetElement) {
            const rect = butterfly.targetElement.getBoundingClientRect();
            butterfly.targetX = rect.left + rect.width/2 + window.scrollX;
            butterfly.targetY = rect.top + rect.height/2 + window.scrollY;
            
            if (butterfly.state === butterfly_config.STATES.HOVERING && butterfly.hoveringPosition) {
                butterfly.hoveringPosition.x = butterfly.targetX;
                butterfly.hoveringPosition.y = butterfly.targetY;
            }
        }
    });
}

function handleCanvasResize() {
    if (!gardenCanvas) return;
    
    // Get the full document height including scrollable content
    const docHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
    );
    
    // Get the full document width
    const docWidth = Math.max(
        document.body.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.clientWidth,
        document.documentElement.scrollWidth,
        document.documentElement.offsetWidth
    );

    // Update canvas dimensions
    gardenCanvas.width = docWidth;
    gardenCanvas.height = docHeight;
    
    // Update canvas style to match dimensions
    gardenCanvas.style.width = `${docWidth}px`;
    gardenCanvas.style.height = `${docHeight}px`;

    if (butterfly_config.DEBUG) {
        console.log('Canvas resized to:', { width: docWidth, height: docHeight });
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
  if (!gardenCanvas) {
    gardenCanvas = document.getElementById("gardenCanvas");
  }

  if (!gardenCanvas) {
    console.error("Garden canvas not found in the DOM");
    return;
  }

  gardenCanvas.style.display = "block";
  ctx = gardenCanvas.getContext("2d");

  // Initialize canvas size properly
  handleCanvasResize();

  // Add event listeners for interaction
  gardenCanvas.addEventListener("click", handleCanvasClick); // Add click event for catching butterflies
  gardenCanvas.addEventListener("mousemove", handleMouseMove);
  console.log('mousemove added');

  // Start the animation loop
  requestAnimationFrame(animateGarden);

  // Schedule the first butterfly spawn
  scheduleNextSpawn();
}

export function deactivateGarden() {
  isGardenMode = false;
  if (gardenCanvas) {
    gardenCanvas.style.display = "none";
    gardenCanvas.style.pointerEvents = "none";
    gardenCanvas.removeEventListener("click", plantSeed);
    gardenCanvas.removeEventListener("mousemove", handleMouseMove);
  }

  document.body.style.backgroundColor = "";

  if (butterflySpawnTimeoutId) {
    clearTimeout(butterflySpawnTimeoutId);
    butterflySpawnTimeoutId = null;
  }

  butterflies.length = 0;
  flowers.length = 0;
  windParticles.length = 0;

  window.removeEventListener('scroll', handleGlobalScroll);
}

function animateGarden() {
  if (!isGardenMode) return;

  ctx.clearRect(0, 0, gardenCanvas.width, gardenCanvas.height);

  butterflies.forEach(butterfly => {
    updateButterfly(butterfly, mouseX, mouseY);
    drawButterfly(ctx, butterfly);
  });

  drawDebugInfo(ctx);
  requestAnimationFrame(animateGarden);
}

function handleMouseMove(e) {
    // Get the canvas position
    const canvasRect = gardenCanvas.getBoundingClientRect();
    
    // Calculate mouse position relative to the canvas
    mouseX = e.pageX - canvasRect.left;
    mouseY = e.pageY - canvasRect.top;
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

function drawDebugInfo(ctx) {
    if (!isDebugMode) return;
    
    butterflies.forEach(butterfly => {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.font = '12px Arial';
        
        // Draw butterfly info
        ctx.fillText(`State: ${butterfly.state}`, butterfly.x + 20, butterfly.y - 20);
        ctx.fillText(`Target: ${butterfly.targetElement?.textContent || 'none'}`, butterfly.x + 20, butterfly.y - 5);
        ctx.fillText(`Pos: (${Math.round(butterfly.x)}, ${Math.round(butterfly.y)})`, butterfly.x + 20, butterfly.y + 10);
        
        // If there's a target, draw line and target coordinates
        if (butterfly.targetElement) {
            const rect = butterfly.targetElement.getBoundingClientRect();
            // Get canvas position
            const canvasRect = gardenCanvas.getBoundingClientRect();
            
            // Calculate target position relative to canvas
            const targetX = rect.left + rect.width/2 - canvasRect.left;
            const targetY = rect.top + rect.height/2 - canvasRect.top;
            
            // Draw line to target
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.moveTo(butterfly.x, butterfly.y);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
            
            // Draw target position
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillText(`(${Math.round(targetX)}, ${Math.round(targetY)})`, targetX, targetY - 15);
            
            // Draw target point
            ctx.beginPath();
            ctx.arc(targetX, targetY, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
}
