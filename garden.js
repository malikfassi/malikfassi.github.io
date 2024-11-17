import { garden_config } from "./config.js";
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
}

function handleCanvasResize() {
  if (!gardenCanvas) return;

  console.log('---Canvas Resize---');
  console.log(`Old dimensions: ${gardenCanvas.width}x${gardenCanvas.height}`);
  console.log(`Window dimensions: ${window.innerWidth}x${window.innerHeight}`);
  console.log(`Scroll position: (${window.scrollX}, ${window.scrollY})`);
  console.log(`Viewport: ${window.visualViewport ? 
    `${window.visualViewport.width}x${window.visualViewport.height}` : 'Not available'}`);

  const oldWidth = gardenCanvas.width;
  const oldHeight = gardenCanvas.height;
  const oldAspectRatio = oldWidth / oldHeight;

  // Store relative positions of butterflies before resize
  const relativePositions = butterflies.map(butterfly => ({
    xRatio: butterfly.x / oldWidth,
    yRatio: butterfly.y / oldHeight,
    velocityXRatio: butterfly.velocity.x / oldWidth,
    velocityYRatio: butterfly.velocity.y / oldHeight
  }));

  // Set canvas dimensions to match the viewport size
  gardenCanvas.width = window.innerWidth;
  gardenCanvas.height = window.innerHeight;
  const newAspectRatio = gardenCanvas.width / gardenCanvas.height;

  // Update butterfly positions maintaining relative positions
  if (butterflies.length > 0 && oldWidth > 0 && oldHeight > 0) {
    butterflies.forEach((butterfly, index) => {
      const relative = relativePositions[index];
      
      // Update positions maintaining aspect ratio
      butterfly.x = relative.xRatio * gardenCanvas.width;
      butterfly.y = relative.yRatio * gardenCanvas.height;
      
      // Scale velocities proportionally
      butterfly.velocity.x = relative.velocityXRatio * gardenCanvas.width;
      butterfly.velocity.y = relative.velocityYRatio * gardenCanvas.height;
    });
  }

  console.log("Canvas resized:", gardenCanvas.width, gardenCanvas.height);
}

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
  const rect = gardenCanvas.getBoundingClientRect();
  // Use rect dimensions for accurate mouse position
  const scaleX = gardenCanvas.width / rect.width;
  const scaleY = gardenCanvas.height / rect.height;
  
  mouseX = (e.clientX - rect.left) * scaleX;
  mouseY = (e.clientY - rect.top) * scaleY;
}

function handleCanvasClick(event) {
  const rect = gardenCanvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  butterflies.forEach((butterfly, index) => {
    const distance = Math.hypot(butterfly.x - mouseX, butterfly.y - mouseY);
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
        
        // Draw state and target info
        ctx.fillText(`State: ${butterfly.state}`, butterfly.x + 20, butterfly.y - 20);
        ctx.fillText(`Target: ${butterfly.targetElement?.textContent || 'none'}`, butterfly.x + 20, butterfly.y - 5);
        
        // Draw position info
        ctx.fillText(`Pos: (${Math.round(butterfly.x)}, ${Math.round(butterfly.y)})`, butterfly.x + 20, butterfly.y + 10);
        
        // If there's a target, draw line to target
        if (butterfly.targetElement) {
            const rect = butterfly.targetElement.getBoundingClientRect();
            const targetX = rect.left + rect.width/2 + window.scrollX;
            const targetY = rect.top + rect.height/2 + window.scrollY;
            
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.moveTo(butterfly.x, butterfly.y);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();
            
            // Draw target position
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(targetX, targetY, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}
