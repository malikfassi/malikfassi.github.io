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
import { butterfly_config } from "./config.js";

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
  initializeGardenElements();
  activateGarden(); // Activate garden mode by default
});

function initializeGardenElements() {
  gardenButton = document.getElementById("gardenButton");
  gardenCanvas = document.getElementById("gardenCanvas");

  if (!gardenButton || !gardenCanvas) {
    console.error("Garden elements not found in the DOM");
    return;
  }

  ctx = gardenCanvas.getContext("2d");

  // Add resize handler
  window.addEventListener("resize", handleCanvasResize);
  handleCanvasResize(); // Initial resize to set dimensions

  // Add event listeners for interaction
  gardenCanvas.addEventListener("click", (event) => plantSeed(event, gardenCanvas));
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

  // Log only every LOG_INTERVAL frames
  if (frameCount % LOG_INTERVAL === 0) {
    console.log(`---Garden Status (Frame ${frameCount})---`);
    console.log(`Active butterflies: ${butterflies.length}`);
    console.log(`Viewport scroll: (${window.scrollX}, ${window.scrollY})`);
    
    // Log each butterfly's state once per interval
    butterflies.forEach((butterfly, index) => {
      if (butterfly.state !== butterfly.lastLoggedState) {
        console.log(`Butterfly ${index} state changed to: ${butterfly.state}`);
        butterfly.lastLoggedState = butterfly.state;
      }
    });
  }
  frameCount++;

  ctx.clearRect(0, 0, gardenCanvas.width, gardenCanvas.height);

  // Update and draw butterflies
  butterflies.forEach((butterfly, index) => {
    updateButterfly(butterfly, mouseX, mouseY);
    drawButterfly(ctx, butterfly);
  });

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

gardenCanvas.addEventListener('click', handleCanvasClick);
