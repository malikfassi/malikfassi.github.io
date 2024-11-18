import { color_config, butterfly_config, isDebugMode } from "./config.js";
import { gardenCanvas } from "./garden.js";

export let butterflies = [];
let butterflySpawnTimeoutId = null;
let lastLoggedPosition = { x: 0, y: 0 };
const LOG_THRESHOLD = 50; // Only log when position changes by this many pixels

function shouldLogPosition(butterfly) {
  const dx = Math.abs(butterfly.x - lastLoggedPosition.x);
  const dy = Math.abs(butterfly.y - lastLoggedPosition.y);
  return dx > LOG_THRESHOLD || dy > LOG_THRESHOLD;
}

export function updateButterfly(butterfly, mouseX, mouseY, gardenCanvas) {
    const currentTime = Date.now();
    
    // Handle scroll first
    handleScroll(butterfly, gardenCanvas);
    
    // Update position based on velocity for all states
    butterfly.x += butterfly.velocity.x;
    butterfly.y += butterfly.velocity.y;

    // Apply friction except when leaving
    if (butterfly.state !== butterfly_config.STATES.LEAVING) {
        butterfly.velocity.x *= 0.95;
        butterfly.velocity.y *= 0.95;
    }

    // Handle different states
    switch (butterfly.state) {
        case butterfly_config.STATES.FLYING:
            handleButterflyFlying(butterfly, gardenCanvas);
            break;
        case butterfly_config.STATES.HOVERING:
            handleButterflyHovering(butterfly, currentTime, gardenCanvas);
            break;
        case butterfly_config.STATES.SCARED:
            handleButterflyScared(butterfly, mouseX, mouseY, currentTime, gardenCanvas);
            if (currentTime - butterfly.scaredTime > butterfly_config.SCARED_DURATION) {
                butterfly.state = butterfly_config.STATES.FLYING;
            }
            break;
        case butterfly_config.STATES.LEAVING:
            handleButterflyLeaving(butterfly, gardenCanvas);
            break;
    }

    if (isDebugMode) {
        console.log(`Words hovered: ${butterfly.wordsHovered}`);
        console.log(`Position changed from (${butterfly.lastX}, ${butterfly.lastY}) to (${butterfly.x}, ${butterfly.y})`);
    }
    
    butterfly.lastX = butterfly.x;
    butterfly.lastY = butterfly.y;
}

function handleButterflyFlying(butterfly, gardenCanvas) {
    if (!butterfly.targetElement) {
        const newTarget = findNewTarget(gardenCanvas);
        if (newTarget) {
            butterfly.targetElement = newTarget;
            newTarget.classList.add("targeted");
            console.log(`New target assigned: ${newTarget.textContent}`);
        }
    }

    if (butterfly.targetElement) {
        const targetPosition = getElementPagePosition(butterfly.targetElement, gardenCanvas);
        butterfly.targetX = targetPosition.x;
        butterfly.targetY = targetPosition.y;
        
        const dx = butterfly.targetX - butterfly.x;
        const dy = butterfly.targetY - butterfly.y;
        const distance = Math.hypot(dx, dy);

        // Add wandering behavior
        const time = Date.now() / 1000;
        const wanderX = Math.sin(time * 2) * 3;
        const wanderY = Math.cos(time * 1.5) * 2;

        if (distance > 50) {  // Far from target - more wandering
            // Normalize direction and add wandering
            const dirX = (dx / distance) + wanderX * 0.5;
            const dirY = (dy / distance) + wanderY * 0.5;
            
            // Gradually adjust velocity
            butterfly.velocity.x += dirX * 0.1;
            butterfly.velocity.y += dirY * 0.1;
            
            // Limit maximum speed
            const speed = Math.hypot(butterfly.velocity.x, butterfly.velocity.y);
            if (speed > butterfly_config.PEACEFUL_SPEED) {
                butterfly.velocity.x *= butterfly_config.PEACEFUL_SPEED / speed;
                butterfly.velocity.y *= butterfly_config.PEACEFUL_SPEED / speed;
            }
        } else if (distance > 5) {  // Close to target - more precise movement
            // Slower, more precise approach
            butterfly.velocity.x += (dx / distance) * 0.05;
            butterfly.velocity.y += (dy / distance) * 0.05;
        } else {
            // Reached target
            butterfly.state = butterfly_config.STATES.HOVERING;
            butterfly.hoveringPosition = { 
                x: butterfly.targetX,
                y: butterfly.targetY 
            };
            butterfly.hoveringStartTime = Date.now();
        }

        // Update butterfly angle based on movement direction
        if (Math.abs(butterfly.velocity.x) > 0.1 || Math.abs(butterfly.velocity.y) > 0.1) {
            const targetAngle = Math.atan2(butterfly.velocity.y, butterfly.velocity.x);
            // Smooth angle transition
            const angleDiff = targetAngle - butterfly.angle;
            butterfly.angle += angleDiff * 0.1;
        }
    }
}

function handleButterflySpawning(butterfly) {
  // Gradually move into screen using buffer zone from config
  const EDGE_BUFFER = butterfly_config.EDGE_BUFFER || 50; // Default to 50 if not set
  
  const targetY =
    butterfly.y < 0
      ? EDGE_BUFFER
      : butterfly.y > gardenCanvas.height
      ? gardenCanvas.height - EDGE_BUFFER
      : butterfly.y;
  const targetX =
    butterfly.x < 0
      ? EDGE_BUFFER
      : butterfly.x > gardenCanvas.width
      ? gardenCanvas.width - EDGE_BUFFER
      : butterfly.x;

  butterfly.x += (targetX - butterfly.x) * 0.05;
  butterfly.y += (targetY - butterfly.y) * 0.05;

  // Transition to flying state when close enough to target
  if (
    Math.abs(butterfly.x - targetX) < 5 &&
    Math.abs(butterfly.y - targetY) < 5
  ) {
    butterfly.state = butterfly_config.STATES.FLYING;
  }
}

function handleButterflyHovering(butterfly, currentTime, gardenCanvas) {
    if (butterfly.targetElement && butterfly.hoveringPosition) {
        const targetPosition = getElementPagePosition(butterfly.targetElement, gardenCanvas);
        
        // Update hovering position
        butterfly.hoveringPosition.x = targetPosition.x;
        butterfly.hoveringPosition.y = targetPosition.y;
        
        // Add coordinates span if it doesn't exist
        if (!butterfly.targetElement.querySelector('.word-coordinates')) {
            const coordSpan = document.createElement('span');
            coordSpan.className = 'word-coordinates';
            butterfly.targetElement.appendChild(coordSpan);
            coordSpan.textContent = `(${Math.round(targetPosition.x)}, ${Math.round(targetPosition.y)})`;
        }

        // Apply hover oscillation
        const hoverOffset = Math.sin(currentTime / butterfly_config.HOVER_OSCILLATION.FREQUENCY * Math.PI * 2) 
            * butterfly_config.HOVER_OSCILLATION.AMPLITUDE;
            
        // Update butterfly position
        butterfly.x = targetPosition.x;
        butterfly.y = targetPosition.y + hoverOffset;

        // Change color of the word
        if (butterfly.targetElement) {
            butterfly.targetElement.style.color = butterfly.color;
            console.log(`Coloring word: ${butterfly.targetElement.textContent}`);
        } else {
            console.warn("No target element while hovering");
        }

        // Check if it's time to move to another word
        if (currentTime - butterfly.hoveringStartTime > 3000) {
            console.log('Hover duration complete');
            butterfly.state = butterfly_config.STATES.FLYING;
            if (butterfly.targetElement) {
                butterfly.targetElement.style.color = ""; // Reset color
                butterfly.targetElement.classList.remove("targeted"); // Remove targeted class
                console.log(`Released target: ${butterfly.targetElement.textContent}`);
            }
            butterfly.targetElement = null; // Clear current target
            butterfly.wordsHovered += 1;
            console.log(`Total words hovered: ${butterfly.wordsHovered}`);

            if (butterfly.wordsHovered >= butterfly_config.HOVER_WORDS_BEFORE_LEAVING) {
                console.log('Reached hover limit - transitioning to leaving state');
                butterfly.state = butterfly_config.STATES.LEAVING;
            }
        }
    }
}

function handleButterflyScared(butterfly, mouseX, mouseY, currentTime, gardenCanvas) {
    console.log('Butterfly is scared!');
    console.log(`Mouse position: (${mouseX}, ${mouseY})`);
    console.log(`Butterfly position: (${butterfly.x}, ${butterfly.y})`);

    const dx = butterfly.x - mouseX;
    const dy = butterfly.y - mouseY;
    const distance = Math.hypot(dx, dy);

    console.log(`Distance from mouse: ${distance}`);

    if (distance > 0) {
        const escapeAngle = Math.atan2(dy, dx) + ((Math.random() - 0.5) * Math.PI) / 6;
        butterfly.velocity.x = Math.cos(escapeAngle) * butterfly_config.ESCAPE_SPEED;
        butterfly.velocity.y = Math.sin(escapeAngle) * butterfly_config.ESCAPE_SPEED;
        console.log(`Escape velocity: (${butterfly.velocity.x.toFixed(2)}, ${butterfly.velocity.y.toFixed(2)})`);
        // Set the butterfly's angle to match escape direction
        butterfly.angle = escapeAngle + Math.PI; // Add PI to face away from mouse
    }
}

let spawnTimeout = null;

function scheduleNextSpawn() {
    if (spawnTimeout) clearTimeout(spawnTimeout);
    
    const delay = butterfly_config.SPAWN_CONFIG.MIN_INTERVAL + 
                  Math.random() * (butterfly_config.SPAWN_CONFIG.MAX_INTERVAL - butterfly_config.SPAWN_CONFIG.MIN_INTERVAL);
    
    spawnTimeout = setTimeout(spawnButterfly, delay);
}

function spawnButterfly() {
    if (butterflies.length >= butterfly_config.MAX_COUNT) {
        // If we reached the max count, schedule the next spawn
        scheduleNextSpawn();
        return;
    }

    // Randomly choose which border to spawn from (0: top, 1: right, 2: bottom, 3: left)
    const border = Math.floor(Math.random() * 4);
    let x, y;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollY = window.scrollY;
    
    // Set initial position based on chosen border
    switch(border) {
        case 0: // Top
            x = Math.random() * viewportWidth;
            y = -butterfly_config.SIZE + scrollY;
            break;
        case 1: // Right
            x = viewportWidth + butterfly_config.SIZE;
            y = Math.random() * viewportHeight + scrollY;
            break;
        case 2: // Bottom
            x = Math.random() * viewportWidth;
            y = viewportHeight + butterfly_config.SIZE + scrollY;
            break;
        case 3: // Left
            x = -butterfly_config.SIZE;
            y = Math.random() * viewportHeight + scrollY;
            break;
    }

    const butterfly = {
        x,
        y,
        size: butterfly_config.SIZE,
        color: color_config.PASTEL_COLORS[Math.floor(Math.random() * color_config.PASTEL_COLORS.length)],
        angle: 0,
        velocity: { x: 0, y: 0 },
        state: butterfly_config.STATES.FLYING,
        wordsHovered: 0,
        lastScrollY: window.scrollY,
        lastScrollX: window.scrollX,
        timeOffset: Math.random() * 1000
    };

    butterflies.push(butterfly);
    scheduleNextSpawn();
}

// Export for use in garden.js
export { spawnButterfly, scheduleNextSpawn };

export function drawButterfly(ctx, butterfly) {
  const { x, y, angle, color, targetElement } = butterfly;
  const baseSize = butterfly_config.SIZE;
  const time = Date.now() / 1000;
  
  // More subtle wing flap
  const wingFlap = (Math.sin(time * 6) * Math.PI) / 10;
  
  // Calculate distance to target if exists
  let distanceMultiplier = 1;
  if (targetElement) {
    const targetPos = getElementPagePosition(targetElement, gardenCanvas);
    const distance = Math.hypot(targetPos.x - x, targetPos.y - y);
    // Gradually reduce size as butterfly gets closer to target
    // Start reducing size when within 100 pixels
    if (distance < 100) {
      distanceMultiplier = 0.8 + (distance / 100) * 0.2; // Size ranges from 80% to 100%
    }
  }

  // More subtle size oscillation: 0.95 to 1.05 times the base size
  const sizeMultiplier = (1 + Math.sin(time * 6) * 0.05) * distanceMultiplier;
  const size = baseSize * sizeMultiplier;

  ctx.save();
  
  const pixelSize = Math.max(1, Math.floor(size / 4));

  // More subtle vertical movement
  const verticalBob = Math.sin(time * 6) * 1.5;
  ctx.translate(x, y + verticalBob);
  ctx.rotate(angle + Math.sin(time) * 0.03); // Reduced rotation wobble

  // Wing pattern using the butterfly's color
  const wingPattern = [
    [0, color, color, 0],
    [color, color, color, color],
    [color, color, color, color],
    [0, color, color, 0],
  ];

  // Draw left wing
  ctx.save();
  ctx.rotate(-wingFlap);
  wingPattern.forEach((row, i) => {
    row.forEach((pixel, j) => {
      if (pixel) {
        ctx.fillStyle = pixel;
        // Subtle opacity variation
        ctx.globalAlpha = 0.9 + (sizeMultiplier - 1) * 0.2;
        ctx.fillRect(
          (j - wingPattern[0].length) * pixelSize,
          (i - wingPattern.length / 2) * pixelSize,
          pixelSize,
          pixelSize
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
        ctx.globalAlpha = 0.9 + (sizeMultiplier - 1) * 0.2;
        ctx.fillRect(
          j * pixelSize,
          (i - wingPattern.length / 2) * pixelSize,
          pixelSize,
          pixelSize
        );
      }
    });
  });
  ctx.restore();

  // Draw body
  ctx.fillStyle = "#6D4C41";
  ctx.globalAlpha = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(-pixelSize / 2, i * pixelSize, pixelSize, pixelSize);
  }

  ctx.restore();
}

// Add this function to handle the butterfly leaving the canvas
function handleButterflyLeaving(butterfly, gardenCanvas) {
    console.log('Butterfly is leaving');
    
    // Determine nearest edge and set velocity accordingly
    const distanceToTop = butterfly.y;
    const distanceToRight = window.innerWidth - butterfly.x;
    const distanceToBottom = window.innerHeight + window.scrollY - butterfly.y;
    const distanceToLeft = butterfly.x;

    // Find the nearest edge
    const edges = [
        { name: 'top', distance: distanceToTop, vx: 0, vy: -5 },
        { name: 'right', distance: distanceToRight, vx: 5, vy: 0 },
        { name: 'bottom', distance: distanceToBottom, vx: 0, vy: 5 },
        { name: 'left', distance: distanceToLeft, vx: -5, vy: 0 }
    ];

    const nearestEdge = edges.reduce((a, b) => a.distance < b.distance ? a : b);
    
    // Set velocity towards the nearest edge
    butterfly.velocity.x = nearestEdge.vx;
    butterfly.velocity.y = nearestEdge.vy;

    console.log(`Heading towards ${nearestEdge.name} edge`);
    
    // Check if butterfly has left the screen
    const margin = 50;
    const isOffscreen = 
        butterfly.y < -margin ||
        butterfly.y > window.innerHeight + margin + window.scrollY ||
        butterfly.x < -margin ||
        butterfly.x > window.innerWidth + margin;

    if (isOffscreen) {
        console.log('Butterfly has left the screen - removing');
        const index = butterflies.indexOf(butterfly);
        if (index > -1) {
            butterflies.splice(index, 1);
        }
    }

    // Clear any existing target
    if (butterfly.targetElement) {
        butterfly.targetElement.classList.remove("targeted");
        butterfly.targetElement = null;
    }

    // Update angle to match leaving direction
    if (butterfly.velocity.x !== 0 || butterfly.velocity.y !== 0) {
        butterfly.angle = Math.atan2(butterfly.velocity.y, butterfly.velocity.x);
    }
}

// Add this as a separate function to handle scroll properly
function handleScroll(butterfly, gardenCanvas) {
    if (!butterfly.lastScrollY) {
        butterfly.lastScrollY = window.scrollY;
        butterfly.lastScrollX = window.scrollX;
        return;
    }

    const deltaY = window.scrollY - butterfly.lastScrollY;
    const deltaX = window.scrollX - butterfly.lastScrollX;

    // Update butterfly position with scroll
    butterfly.y += deltaY;
    butterfly.x += deltaX;

    // Update target position if exists
    if (butterfly.targetElement) {
        const targetPosition = getElementPagePosition(butterfly.targetElement, gardenCanvas);
        butterfly.targetX = targetPosition.x;
        butterfly.targetY = targetPosition.y;
    }

    // Update hovering position if in hovering state
    if (butterfly.state === butterfly_config.STATES.HOVERING && butterfly.hoveringPosition) {
        butterfly.hoveringPosition.x += deltaX;
        butterfly.hoveringPosition.y += deltaY;
    }

    butterfly.lastScrollY = window.scrollY;
    butterfly.lastScrollX = window.scrollX;

    // Update all word coordinates
    document.querySelectorAll('.important-word').forEach(element => {
        const rect = element.getBoundingClientRect();
        const canvasRect = gardenCanvas.getBoundingClientRect();
        const x = rect.left + rect.width/2 - canvasRect.left;
        const y = rect.top + rect.height/2 - canvasRect.top;
        
        element.setAttribute('data-x', Math.round(x));
        element.setAttribute('data-y', Math.round(y));
        
        const coordSpan = element.querySelector('.word-coordinates');
        if (coordSpan) {
            coordSpan.textContent = `(${Math.round(x)}, ${Math.round(y)})`;
        }
    });
}

function getElementPagePosition(element, gardenCanvas) {
    const rect = element.getBoundingClientRect();
    const canvasRect = gardenCanvas.getBoundingClientRect();
    
    // Calculate position relative to canvas
    const position = {
        x: rect.left + rect.width/2 - canvasRect.left,
        y: rect.top + rect.height/2 - canvasRect.top
    };

    if (butterfly_config.DEBUG) {
        console.log('Element position:', {
            elementRect: rect,
            canvasRect: canvasRect,
            final: position
        });
    }

    return position;
}

function findNewTarget(gardenCanvas) {
    // First try to find targets in the current viewport
    const viewportTargets = [...document.querySelectorAll(".important-word:not(.targeted)")].filter(element => {
        const rect = element.getBoundingClientRect();
        const canvasRect = gardenCanvas.getBoundingClientRect();
        
        // Calculate and store coordinates
        const x = rect.left + rect.width/2 - canvasRect.left;
        const y = rect.top + rect.height/2 - canvasRect.top;
        
        // Update data attributes
        element.setAttribute('data-x', Math.round(x));
        element.setAttribute('data-y', Math.round(y));
        
        // Add coordinate display span if not exists
        if (!element.querySelector('.word-coordinates')) {
            const coordSpan = document.createElement('span');
            coordSpan.className = 'word-coordinates';
            coordSpan.style.cssText = 'position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 10px; color: red;';
            element.style.position = 'relative';
            coordSpan.textContent = `(${Math.round(x)}, ${Math.round(y)})`;
            element.appendChild(coordSpan);
        }
        
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });

    // Rest of the function remains the same
    const allTargets = viewportTargets.length > 0 ? 
        viewportTargets : 
        [...document.querySelectorAll(".important-word:not(.targeted)")];

    if (allTargets.length > 0) {
        const target = allTargets[Math.floor(Math.random() * allTargets.length)];
        return target;
    }

    return null;
}

// In your debug toggle function
function toggleDebug() {
    isDebugMode = !isDebugMode;
    document.body.classList.toggle('debug-mode', isDebugMode);
}

function handleGlobalScroll(gardenCanvas) {
    butterflies.forEach(butterfly => {
        handleScroll(butterfly, gardenCanvas);
    });
}
