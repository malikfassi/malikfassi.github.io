import { color_config, butterfly_config, isDebugMode } from "./config.js";
import { gardenCanvas } from "./garden.js";
import { getElementPagePosition, hexToRgb, rgbToHsl, hslToHex } from './utils.js';

export let butterflies = [];
let butterflySpawnTimeoutId = null;
let lastLoggedPosition = { x: 0, y: 0 };
const LOG_THRESHOLD = 50; // Only log when position changes by this many pixels

function shouldLogPosition(butterfly) {
  const dx = Math.abs(butterfly.x - lastLoggedPosition.x);
  const dy = Math.abs(butterfly.y - lastLoggedPosition.y);
  return dx > LOG_THRESHOLD || dy > LOG_THRESHOLD;
}

export function updateButterfly(butterfly, mouseX, mouseY) {
    const currentTime = Date.now();
    
    // Handle scroll first
    handleScroll(butterfly);
    
    // Check mouse interaction before any other state updates
    const isScared = handleMouseInteraction(butterfly, mouseX, mouseY);
    
    // If scared, skip other state handling
    if (isScared) {
        return;
    }

    // Only handle other states if not scared
    switch (butterfly.state) {
        case butterfly_config.STATES.FLYING:
            handleButterflyFlying(butterfly);
            break;
        case butterfly_config.STATES.HOVERING:
            handleButterflyHovering(butterfly, currentTime);
            break;
        case butterfly_config.STATES.LEAVING:
            handleButterflyLeaving(butterfly);
            break;
    }

    // Update position based on velocity
    butterfly.x += butterfly.velocity.x;
    butterfly.y += butterfly.velocity.y;

    // Apply friction
    butterfly.velocity.x *= 0.98;
    butterfly.velocity.y *= 0.98;

    if (isDebugMode) {
        console.log(`Words hovered: ${butterfly.wordsHovered}`);
        console.log(`Position changed from (${butterfly.lastX}, ${butterfly.lastY}) to (${butterfly.x}, ${butterfly.y})`);
    }
    
    butterfly.lastX = butterfly.x;
    butterfly.lastY = butterfly.y;
}

function butterflyMoveTo(butterfly, targetX, targetY, speed = butterfly_config.PEACEFUL_SPEED) {
    const time = Date.now() / 1000;
    
    // Initialize more complex wandering properties if not exists
    if (!butterfly.wanderOffsets) {
        butterfly.wanderOffsets = {
            // Multiple frequencies for more organic movement
            frequencies: {
                x: [0.2 + Math.random() * 0.1, 0.4 + Math.random() * 0.2, 0.1 + Math.random() * 0.1],
                y: [0.3 + Math.random() * 0.1, 0.2 + Math.random() * 0.2, 0.15 + Math.random() * 0.1]
            },
            // Phase offsets for each frequency
            phases: {
                x: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2],
                y: [Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2]
            },
            // Amplitudes for each frequency
            amplitudes: {
                x: [0.6, 0.3, 0.1],  // Decreasing influence for higher frequencies
                y: [0.5, 0.35, 0.15]
            }
        };
    }

    // Calculate direction to target
    const dx = targetX - butterfly.x;
    const dy = targetY - butterfly.y;
    const distance = Math.hypot(dx, dy);

    // Complex wandering pattern combining multiple sine waves
    let wanderX = 0;
    let wanderY = 0;

    // Add each frequency component
    for (let i = 0; i < 3; i++) {
        wanderX += Math.sin(
            time * butterfly.wanderOffsets.frequencies.x[i] + 
            butterfly.wanderOffsets.phases.x[i]
        ) * butterfly.wanderOffsets.amplitudes.x[i];

        wanderY += Math.sin(
            time * butterfly.wanderOffsets.frequencies.y[i] + 
            butterfly.wanderOffsets.phases.y[i]
        ) * butterfly.wanderOffsets.amplitudes.y[i];
    }

    // Add circular motion component
    const circularMotion = {
        x: Math.cos(time * 0.5) * Math.sin(time * 0.3) * 0.2,
        y: Math.sin(time * 0.5) * Math.cos(time * 0.3) * 0.2
    };

    wanderX += circularMotion.x;
    wanderY += circularMotion.y;

    // Distance-based wandering weight with smooth transition
    const wanderWeight = Math.min(0.8, (distance / butterfly_config.WANDER.DISTANCE_FACTOR)) * 
        (0.7 + Math.sin(time * 0.2) * 0.3); // Slightly varying influence

    if (distance > 1) {
        // Smoother target influence
        const targetInfluence = 1 - (wanderWeight * butterfly_config.WANDER.TARGET_WEIGHT);
        
        // Combine direct movement with wandering, using smooth acceleration
        butterfly.velocity.x += (
            (dx / distance) * speed * targetInfluence + 
            wanderX * butterfly_config.WANDER.AMPLITUDE * wanderWeight
        ) * 0.06;
        
        butterfly.velocity.y += (
            (dy / distance) * speed * targetInfluence + 
            wanderY * butterfly_config.WANDER.AMPLITUDE * wanderWeight
        ) * 0.06;
    }

    // Add slight upward bias for more natural movement
    butterfly.velocity.y += Math.sin(time * 0.2) * 0.01;
}

function handleButterflyFlying(butterfly) {
    if (!butterfly.targetElement) {
        const newTarget = findNewTarget();
        if (newTarget) {
            butterfly.targetElement = newTarget;
            newTarget.classList.add("targeted");
            if (butterfly_config.DEBUG) {
                console.log(`New target assigned: ${newTarget.textContent}`);
            }
        }
    }

    if (butterfly.targetElement) {
        const targetPos = getElementPagePosition(butterfly.targetElement, gardenCanvas);
        // Calculate distance to target
        const dx = targetPos.x - butterfly.x;
        const dy = targetPos.y - butterfly.y;
        const distance = Math.hypot(dx, dy);

        // Move towards target
        butterflyMoveTo(butterfly, targetPos.x, targetPos.y);

        // Check if close enough to start hovering
        if (distance < butterfly_config.HOVER_THRESHOLD) {
            butterfly.state = butterfly_config.STATES.HOVERING;
            butterfly.hoveringPosition = { ...targetPos };
            butterfly.hoveringStartTime = Date.now();
            butterfly.currentHoverDuration = 
                butterfly_config.HOVER.MIN_DURATION + 
                Math.random() * (butterfly_config.HOVER.MAX_DURATION - butterfly_config.HOVER.MIN_DURATION);
            if (butterfly_config.DEBUG) {
                console.log('Butterfly started hovering', { distance, threshold: butterfly_config.HOVER_THRESHOLD });
            }
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

function releaseTarget(butterfly) {
    if (butterfly.targetElement) {
        butterfly.targetElement.classList.remove("targeted");
        butterfly.targetElement.style.color = '';
        butterfly.targetElement = null;
    }
    butterfly.state = butterfly_config.STATES.FLYING;
    butterfly.wordsHovered = (butterfly.wordsHovered || 0) + 1;
    
    // Check if butterfly should leave after hovering enough words
    if (butterfly.wordsHovered >= butterfly_config.HOVER_WORDS_BEFORE_LEAVING) {
        butterfly.state = butterfly_config.STATES.LEAVING;
    }
}

function handleButterflyHovering(butterfly, currentTime) {
    if (!butterfly.targetElement || !butterfly.hoveringPosition) return;
    
    const targetPosition = getElementPagePosition(butterfly.targetElement, gardenCanvas);
    
    // Update hovering position with gentle wandering
    const hoverTime = currentTime / 1000;
    const wanderRadius = 15;  // Smaller radius for more stable hovering
    
    butterfly.hoveringPosition.x = targetPosition.x + Math.sin(hoverTime * 1.5) * wanderRadius;
    butterfly.hoveringPosition.y = targetPosition.y + Math.cos(hoverTime * 2) * wanderRadius;
    
    // Update butterfly position with smooth movement
    butterfly.x += (butterfly.hoveringPosition.x - butterfly.x) * butterfly_config.HOVER.TRANSITION_SPEED;
    butterfly.y += (butterfly.hoveringPosition.y - butterfly.y) * butterfly_config.HOVER.TRANSITION_SPEED;
    
    // Change color of the word
    colorWord(butterfly.targetElement, butterfly);

    // Check if it's time to move to another word
    if (!butterfly.hoveringStartTime) {
        butterfly.hoveringStartTime = currentTime;
        // Set random hover duration for this visit
        butterfly.currentHoverDuration = 
            butterfly_config.HOVER.MIN_DURATION + 
            Math.random() * (butterfly_config.HOVER.MAX_DURATION - butterfly_config.HOVER.MIN_DURATION);
    } else if (currentTime - butterfly.hoveringStartTime > butterfly.currentHoverDuration) {
        releaseTarget(butterfly);
    }
}

function handleButterflyScared(butterfly, mouseX, mouseY, currentTime) {
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
  const { x, y, angle, color, state } = butterfly;
  const baseSize = butterfly_config.SIZE;
  const time = Date.now() / 1000 + (butterfly.timeOffset || 0);
  
  // Different oscillation amplitudes based on state
  let sizeMultiplier;
  switch(state) {
    case butterfly_config.STATES.FLYING:
      // Larger oscillation during flight (20% size variation)
      sizeMultiplier = 1 + Math.sin(time * 6) * 0.2;
      break;
    case butterfly_config.STATES.HOVERING:
      // Smaller oscillation while hovering (10% size variation)
      sizeMultiplier = 1 + Math.sin(time * 4) * 0.1;
      break;
    case butterfly_config.STATES.SCARED:
      // Rapid, large oscillation when scared (30% size variation)
      sizeMultiplier = 1 + Math.sin(time * 8) * 0.3;
      break;
    default:
      sizeMultiplier = 1;
  }
  
  const size = baseSize * sizeMultiplier;
  
  ctx.save();
  
  // Add slight vertical movement synchronized with size
  const verticalBob = Math.sin(time * (state === butterfly_config.STATES.HOVERING ? 4 : 6)) * 2;
  ctx.translate(x, y + verticalBob);
  ctx.rotate(angle + Math.sin(time) * 0.05);

  // Wing pattern using the butterfly's color
  const wingPattern = [
    [0, color, color, 0],
    [color, color, color, color],
    [color, color, color, color],
    [0, color, color, 0],
  ];

  const pixelSize = Math.max(1, Math.floor(size / 4));

  // Wing flap speed also varies by state
  const wingFlapSpeed = state === butterfly_config.STATES.HOVERING ? 4 : 6;
  const wingFlap = (Math.sin(time * wingFlapSpeed) * Math.PI) / 8;

  // Draw left wing
  ctx.save();
  ctx.rotate(-wingFlap);
  wingPattern.forEach((row, i) => {
    row.forEach((pixel, j) => {
      if (pixel) {
        ctx.fillStyle = pixel;
        // Add slight transparency based on size to enhance depth effect
        ctx.globalAlpha = 0.8 + (sizeMultiplier - 1) * 0.5;
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
        ctx.globalAlpha = 0.8 + (sizeMultiplier - 1) * 0.5;
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

  // Draw scared reaction if butterfly is in scared state
  if (butterfly.state === butterfly_config.STATES.SCARED) {
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = 'black';
    
    // Calculate positions for multiple apostrophes in an arc
    const radius = butterfly_config.SIZE * 1.5;
    for (let i = 0; i < 3; i++) {
        const angle = -Math.PI/4 - (i * Math.PI/6); // Spread apostrophes in an arc
        const x = butterfly.x + Math.cos(angle) * radius;
        const y = butterfly.y + Math.sin(angle) * radius;
        
        // Alternate between ! and '
        const symbol = i % 2 === 0 ? '!' : "'";
        
        // Add some randomness to the position
        const offsetX = Math.sin(Date.now() / 100 + i) * 2;
        const offsetY = Math.cos(Date.now() / 100 + i) * 2;
        
        ctx.fillText(symbol, x + offsetX, y + offsetY);
    }
  }
  
  ctx.restore();
}

// Add this function to handle the butterfly leaving the canvas
function handleButterflyLeaving(butterfly) {
    // Determine nearest edge and set target point if not set
    if (!butterfly.leavingTarget) {
        const distanceToTop = butterfly.y;
        const distanceToRight = window.innerWidth - butterfly.x;
        const distanceToBottom = window.innerHeight + window.scrollY - butterfly.y;
        const distanceToLeft = butterfly.x;

        // Find the nearest edge and set a random point along it
        const edges = [
            { name: 'top', distance: distanceToTop, getTarget: () => ({ 
                x: Math.random() * window.innerWidth, 
                y: -butterfly_config.SIZE 
            })},
            { name: 'right', distance: distanceToRight, getTarget: () => ({ 
                x: window.innerWidth + butterfly_config.SIZE, 
                y: Math.random() * window.innerHeight + window.scrollY 
            })},
            { name: 'bottom', distance: distanceToBottom, getTarget: () => ({ 
                x: Math.random() * window.innerWidth, 
                y: window.innerHeight + butterfly_config.SIZE + window.scrollY 
            })},
            { name: 'left', distance: distanceToLeft, getTarget: () => ({ 
                x: -butterfly_config.SIZE, 
                y: Math.random() * window.innerHeight + window.scrollY 
            })}
        ];

        const nearestEdge = edges.reduce((a, b) => a.distance < b.distance ? a : b);
        butterfly.leavingTarget = nearestEdge.getTarget();
    }

    // Use common movement function
    butterflyMoveTo(butterfly, 
        butterfly.leavingTarget.x, 
        butterfly.leavingTarget.y, 
        butterfly_config.LEAVING_SPEED
    );

    // Check if butterfly has left the screen
    const margin = butterfly_config.SIZE * 2;
    const isOffscreen = 
        butterfly.y < -margin ||
        butterfly.y > window.innerHeight + margin + window.scrollY ||
        butterfly.x < -margin ||
        butterfly.x > window.innerWidth + margin;

    if (isOffscreen) {
        const index = butterflies.indexOf(butterfly);
        if (index > -1) {
            butterflies.splice(index, 1);
        }
    }
}

export function getRelativeButterflyPosition(butterfly, gardenCanvas) {
    const canvasRect = gardenCanvas.getBoundingClientRect();
    
    // Convert absolute butterfly position to viewport-relative position
    const viewportX = butterfly.x - window.scrollX;
    const viewportY = butterfly.y - window.scrollY;
    
    // Calculate position relative to canvas
    return {
        x: viewportX - canvasRect.left,
        y: viewportY - canvasRect.top
    };
}

export function setAbsoluteButterflyPosition(butterfly, relativeX, relativeY, gardenCanvas) {
    const canvasRect = gardenCanvas.getBoundingClientRect();
    
    // Convert canvas-relative position to absolute position
    butterfly.x = relativeX + canvasRect.left + window.scrollX;
    butterfly.y = relativeY + canvasRect.top + window.scrollY;
}

function handleScroll(butterfly) {
    if (!butterfly.lastScrollY) {
        butterfly.lastScrollY = window.scrollY;
        butterfly.lastScrollX = window.scrollX;
        return;
    }

    // Get relative position before scroll
    const relativePos = getRelativeButterflyPosition(butterfly, gardenCanvas);
    
    // Update scroll tracking
    butterfly.lastScrollY = window.scrollY;
    butterfly.lastScrollX = window.scrollX;
    
    // Only update position if not in FLYING state
    if (butterfly.state !== butterfly_config.STATES.FLYING) {
        // Maintain relative position after scroll
        setAbsoluteButterflyPosition(butterfly, relativePos.x, relativePos.y, gardenCanvas);
    }

    // Update target position if exists
    if (butterfly.targetElement) {
        const targetPos = getElementPagePosition(butterfly.targetElement, gardenCanvas);
        if (butterfly.state === butterfly_config.STATES.HOVERING && butterfly.hoveringPosition) {
            butterfly.hoveringPosition.x = targetPos.x;
            butterfly.hoveringPosition.y = targetPos.y;
        }
    }
}

function findNewTarget() {
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

function handleMouseInteraction(butterfly, mouseX, mouseY) {
    // Calculate distance to mouse
    const dx = butterfly.x - mouseX;
    const dy = butterfly.y - mouseY;
    const distanceToMouse = Math.hypot(dx, dy);
    
    // Check if mouse is within fear radius
    if (distanceToMouse < butterfly_config.FEAR_RADIUS) {
        // Switch to scared state if not already scared
        if (butterfly.state !== butterfly_config.STATES.SCARED) {
            if (butterfly_config.DEBUG) {
                console.log(`🦋 Butterfly became scared! Distance to mouse: ${Math.round(distanceToMouse)}px`);
                console.log(`Mouse position: (${Math.round(mouseX)}, ${Math.round(mouseY)})`);
                console.log(`Butterfly position: (${Math.round(butterfly.x)}, ${Math.round(butterfly.y)})`);
            }
            butterfly.state = butterfly_config.STATES.SCARED;
            butterfly.scaredStartTime = Date.now();
            
            // Release current target if any
            if (butterfly.targetElement) {
                butterfly.targetElement.classList.remove("targeted");
                butterfly.targetElement.style.color = ""; // Reset color
                butterfly.targetElement = null;
            }
        }
        
        // Calculate escape direction (away from mouse)
        const escapeAngle = Math.atan2(dy, dx);
        
        // Faster escape when closer to mouse
        const escapeSpeed = butterfly_config.ESCAPE_SPEED * 
            (1 - (distanceToMouse / butterfly_config.FEAR_RADIUS));
        
        // Set butterfly angle to match escape direction
        butterfly.angle = escapeAngle + Math.PI; // Face away from mouse
        
        // Add some erratic panic movement
        const panicTime = Date.now() / 1000;
        const panicX = Math.sin(panicTime * butterfly_config.PANIC.FREQUENCY + butterfly.timeOffset) * 
                      butterfly_config.PANIC.AMPLITUDE;
        const panicY = Math.cos(panicTime * butterfly_config.PANIC.FREQUENCY + butterfly.timeOffset) * 
                      butterfly_config.PANIC.AMPLITUDE;
        
        // Update velocity to escape
        butterfly.velocity.x = Math.cos(escapeAngle) * escapeSpeed + panicX;
        butterfly.velocity.y = Math.sin(escapeAngle) * escapeSpeed + panicY;
        
        return true; // Indicates butterfly is scared
    }
    
    // Check if scared state should end
    if (butterfly.state === butterfly_config.STATES.SCARED) {
        const scaredDuration = Date.now() - butterfly.scaredStartTime;
        if (scaredDuration > butterfly_config.SCARED_DURATION) {
            butterfly.state = butterfly_config.STATES.FLYING;
        }
        return true; // Still in scared state
    }
    
    return false;
}

function colorWord(element, butterfly) {
    const isHovering = butterfly.state === butterfly_config.STATES.HOVERING;
    if (isHovering) {
        element.style.color = butterfly.color;
    } else {
        element.style.color = '';
    }
}
