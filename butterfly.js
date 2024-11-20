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
    
    // Store previous position for direction calculation
    const prevX = butterfly.x;
    const prevY = butterfly.y;
    
    // Handle scroll first
    handleScroll(butterfly);
    
    // Check mouse interaction before any other state updates
    handleMouseInteraction(butterfly, mouseX, mouseY);
    
    // Handle other states if not scared
    if (butterfly.state !== butterfly_config.STATES.SCARED) {
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
    }

    // Update position based on velocity
    butterfly.x += butterfly.velocity.x;
    butterfly.y += butterfly.velocity.y;

    // Calculate movement direction and update angle
    const dx = butterfly.x - prevX;
    const dy = butterfly.y - prevY;
    const movement = Math.hypot(dx, dy);
    
    // Only update angle if there's significant movement
    if (movement > 0.1) {
        // Add 90 degrees (PI/2) to make butterfly perpendicular to movement
        const targetAngle = Math.atan2(dy, dx) + Math.PI/2;
        
        // Smoothly interpolate to the target angle
        let angleDiff = targetAngle - butterfly.angle;
        
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Smooth rotation (adjust 0.1 for faster/slower rotation)
        butterfly.angle += angleDiff * 0.1;
    }

    // Apply friction
    butterfly.velocity.x *= 0.98;
    butterfly.velocity.y *= 0.98;

    butterfly.lastX = butterfly.x;
    butterfly.lastY = butterfly.y;
}

function butterflyMoveTo(butterfly, targetX, targetY, speed = butterfly_config.PEACEFUL_SPEED) {
    const time = Date.now() / 1000;
    
    // Calculate direction to target
    const dx = targetX - butterfly.x;
    const dy = targetY - butterfly.y;
    const distance = Math.hypot(dx, dy);

    // Base floating motion (figure-eight pattern)
    const floatX = Math.sin(time * 0.5 + butterfly.timeOffset) * Math.cos(time * 0.3);
    const floatY = Math.cos(time * 0.4 + butterfly.timeOffset) * Math.sin(time * 0.6);

    // Vertical bobbing (stronger when further from target)
    const verticalBob = Math.sin(time * 2 + butterfly.timeOffset) * 
        Math.min(1.0, distance / 200) * 0.3;

    // Random course corrections
    const courseCorrection = {
        x: Math.sin(time * 0.1 + butterfly.timeOffset * 2) * 0.2,
        y: Math.cos(time * 0.15 + butterfly.timeOffset * 2) * 0.2
    };

    // Combine all motion components
    let totalX = 0;
    let totalY = 0;

    if (distance > 1) {
        // Direct movement towards target (stronger when closer)
        const targetInfluence = Math.max(0.2, 1 - (distance / 1000));
        totalX += (dx / distance) * speed * targetInfluence;
        totalY += (dy / distance) * speed * targetInfluence;

        // Add floating motion (stronger when further)
        const floatInfluence = Math.min(1.0, distance / 200);
        totalX += floatX * speed * floatInfluence * 0.5;
        totalY += (floatY + verticalBob) * speed * floatInfluence * 0.5;

        // Add course corrections
        totalX += courseCorrection.x * speed;
        totalY += courseCorrection.y * speed;

        // Smooth acceleration
        butterfly.velocity.x += (totalX - butterfly.velocity.x) * 0.03;
        butterfly.velocity.y += (totalY - butterfly.velocity.y) * 0.03;
    }

    // Apply velocity with air resistance
    butterfly.x += butterfly.velocity.x;
    butterfly.y += butterfly.velocity.y;
    
    // More natural deceleration
    butterfly.velocity.x *= 0.95 + Math.sin(time * 0.8) * 0.02;
    butterfly.velocity.y *= 0.95 + Math.cos(time * 0.8) * 0.02;
}

function handleButterflyFlying(butterfly) {
    if (!butterfly.targetElement) {
        const newTarget = findNewTarget();
        if (newTarget) {
            butterfly.targetElement = newTarget;
            newTarget.classList.add("targeted");
        }
    }

    if (butterfly.targetElement) {
        const rect = butterfly.targetElement.getBoundingClientRect();
        const canvasRect = gardenCanvas.getBoundingClientRect();
        
        // Get target position first
        const targetPos = getElementPagePosition(butterfly.targetElement, gardenCanvas);
        
        // Calculate distance to target
        const dx = targetPos.x - butterfly.x;
        const dy = targetPos.y - butterfly.y;
        const distance = Math.hypot(dx, dy);
        
        // Now we can check distance and set hover position if needed
        if (!butterfly.hoveringPosition && distance < butterfly_config.HOVER_THRESHOLD) {
            // Random position within the word boundaries
            const randomX = rect.left + (Math.random() * rect.width);
            const randomY = rect.top + (Math.random() * rect.height);
            
            butterfly.hoveringPosition = {
                x: randomX + window.scrollX,
                y: randomY + window.scrollY
            };
        }
        
        // Get final target position (either random hover position or word position)
        const finalTargetPos = butterfly.hoveringPosition || targetPos;
        
        // Move towards target
        butterflyMoveTo(butterfly, finalTargetPos.x, finalTargetPos.y);

        // Check if close enough to start hovering
        if (distance < butterfly_config.HOVER_THRESHOLD) {
            butterfly.state = butterfly_config.STATES.HOVERING;
            butterfly.hoveringStartTime = Date.now();
            butterfly.currentHoverDuration = 
                butterfly_config.HOVER.MIN_DURATION + 
                Math.random() * (butterfly_config.HOVER.MAX_DURATION - butterfly_config.HOVER.MIN_DURATION);
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
    if (butterfly.targetElement && butterfly.state !== butterfly_config.STATES.LEAVING) {
        butterfly.targetElement.classList.remove("targeted");
        butterfly.targetElement.style.color = '';
        butterfly.targetElement = null;
    }
    butterfly.state = butterfly_config.STATES.FLYING;
    butterfly.wordsHovered = (butterfly.wordsHovered || 0) + 1;
    
    // Check if butterfly should leave after hovering enough words
    if (butterfly.wordsHovered >= butterfly_config.HOVER_WORDS_BEFORE_LEAVING) {
        butterfly.state = butterfly_config.STATES.LEAVING;
        // The leaving target will be set in handleButterflyLeaving
    } else {
        butterfly.state = butterfly_config.STATES.FLYING;
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

    const color = color_config.BUTTERFLY_COLORS[Math.floor(Math.random() * color_config.BUTTERFLY_COLORS.length)];

    const butterfly = {
        x,
        y,
        size: butterfly_config.SIZE,
        color: color,
        originalColor: color,
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
    ctx.save();
    
    // Get relative position for drawing
    const relativePos = getRelativeButterflyPosition(butterfly, gardenCanvas);
        
    if (!butterfly.color) {
        butterfly.color = '#FFFFFF'; // Default to white or any other default color
    }

    if (butterfly.state === butterfly_config.STATES.SCARED) {
        const flashSpeed = 0.02;
        const flashIntensity = Math.abs(Math.sin(Date.now() * flashSpeed));
        
        const baseColor = butterfly.originalColor; // Use originalColor or fallback to current colo
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        
        const angerTint = 0.8;
        const newR = Math.min(255, r + (255 - r) * angerTint);
        const newG = Math.max(0, g - g * angerTint * 0.5);
        const newB = Math.max(0, b - b * angerTint * 0.5);
        
        butterfly.color = `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
    } else {
        butterfly.color = butterfly.originalColor || butterfly.color;
    }

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
            sizeMultiplier = 1 + Math.sin(time * 8) * 0.2;
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
    
    // Draw scared symbol if butterfly is scared
    if (butterfly.state === butterfly_config.STATES.SCARED && butterfly.scaredSymbol) {
        // Comic style font
        ctx.font = 'bold 16px Comic Sans MS, cursive';
        
        // Flash effect with softer red
        const flashSpeed = 0.015;
        const flashIntensity = Math.sin(Date.now() * flashSpeed);
        
        if (flashIntensity > 0) {
            ctx.fillStyle = '#ff6b6b';
            ctx.strokeStyle = 'white';
        } else {
            ctx.fillStyle = 'white';
            ctx.strokeStyle = '#ff6b6b';
        }
        ctx.lineWidth = 3;
        
        // Position symbol in manga style (top-right of the head)
        const symbolOffsetX = butterfly_config.SIZE * 0.8; // Right of the butterfly
        const symbolOffsetY = -butterfly_config.SIZE * 1; // Above the butterfly
        
        // Add simple bounce effect
        const bounce = Math.sin(Date.now() * 0.008) * 3;
        
        // Draw text with outline
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(butterfly.scaredSymbol, symbolOffsetX, symbolOffsetY + bounce);
        ctx.fillText(butterfly.scaredSymbol, symbolOffsetX, symbolOffsetY + bounce);
    }
    
    ctx.restore(); 
}

// Add this function to handle the butterfly leaving the canvas
function handleButterflyLeaving(butterfly) {
    // If butterfly doesn't have a leaving target yet, set one
    if (!butterfly.targetElement || butterfly.state !== butterfly_config.STATES.LEAVING) {
        // Create a virtual target at the nearest screen edge
        const edgeTarget = document.createElement('div');
        
        // Determine the nearest edge
        const distToLeft = butterfly.x;
        const distToRight = gardenCanvas.width - butterfly.x;
        const distToTop = butterfly.y;
        const distToBottom = gardenCanvas.height - butterfly.y;
        
        // Find the minimum distance and corresponding edge position
        const distances = [
            { edge: 'left', dist: distToLeft, x: -butterfly_config.EDGE_BUFFER, y: butterfly.y },
            { edge: 'right', dist: distToRight, x: gardenCanvas.width + butterfly_config.EDGE_BUFFER, y: butterfly.y },
            { edge: 'top', dist: distToTop, x: butterfly.x, y: -butterfly_config.EDGE_BUFFER },
            { edge: 'bottom', dist: distToBottom, x: butterfly.x, y: gardenCanvas.height + butterfly_config.EDGE_BUFFER }
        ];
        
        const nearestEdge = distances.reduce((min, curr) => curr.dist < min.dist ? curr : min);
        
        // Set the virtual target's position
        edgeTarget.getBoundingClientRect = () => ({
            left: nearestEdge.x,
            top: nearestEdge.y,
            width: 0,
            height: 0
        });
        
        edgeTarget.textContent = `Leaving via ${nearestEdge.edge} edge`;
        butterfly.targetElement = edgeTarget;
        
        if (butterfly_config.DEBUG) {
            console.log(`Butterfly leaving towards ${nearestEdge.edge} edge at (${nearestEdge.x}, ${nearestEdge.y})`);
        }
    }

    // Move towards the edge target
    const targetPos = getElementPagePosition(butterfly.targetElement, gardenCanvas);
    butterflyMoveTo(butterfly, targetPos.x, targetPos.y, butterfly_config.LEAVING_SPEED);

    // Check if butterfly has reached the edge
    const distanceToTarget = Math.hypot(targetPos.x - butterfly.x, targetPos.y - butterfly.y);
    if (distanceToTarget < butterfly_config.EDGE_BUFFER) {
        // Remove the butterfly when it reaches the edge
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
    // Get all important words, regardless of viewport visibility
    const allTargets = [...document.querySelectorAll(".important-word:not(.targeted)")];
    
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
    // Track mouse movement
    if (!butterfly.lastMouseX) {
        butterfly.lastMouseX = mouseX;
        butterfly.lastMouseY = mouseY;
        return false;
    }

    const mouseMovement = Math.hypot(mouseX - butterfly.lastMouseX, mouseY - butterfly.lastMouseY);
    const isMouseMoving = mouseMovement > 2;

    butterfly.lastMouseX = mouseX;
    butterfly.lastMouseY = mouseY;

    const dx = butterfly.x - mouseX;
    const dy = butterfly.y - mouseY;
    const distanceToMouse = Math.hypot(dx, dy);
    
    // Check if we're in scared state or should enter it
    if (distanceToMouse < butterfly_config.FEAR_RADIUS && isMouseMoving) {
        // Enter scared state if not already scared
        if (butterfly.state !== butterfly_config.STATES.SCARED) {
            butterfly.state = butterfly_config.STATES.SCARED;
            butterfly.scaredStartTime = Date.now();
            
            if (butterfly.targetElement) {
                butterfly.targetElement.classList.remove("targeted");
                butterfly.targetElement.style.color = "";
                butterfly.targetElement = null;
            }
            
            butterfly.scaredSymbol = ['!', '?', '*', '!!'][Math.floor(Math.random() * 4)];
        }
        
        const normalizedDx = dx / distanceToMouse;
        const normalizedDy = dy / distanceToMouse;
        
        const fearIntensity = Math.pow(1 - (distanceToMouse / butterfly_config.FEAR_RADIUS), 1.5) * 0.7;
        const escapeSpeed = butterfly_config.ESCAPE_SPEED * (0.5 + fearIntensity);
        
        butterfly.velocity.x = normalizedDx * escapeSpeed;
        butterfly.velocity.y = normalizedDy * escapeSpeed;
        
        return true;
    }
    
    // Check if we should exit scared state
    if (butterfly.state === butterfly_config.STATES.SCARED) {
        const scaredDuration = Date.now() - butterfly.scaredStartTime;
        const minScaredDuration = 1500; // Minimum 1.5 seconds of being scared
        
        if (scaredDuration > minScaredDuration && 
            (distanceToMouse > butterfly_config.FEAR_RADIUS * 1.1 || !isMouseMoving)) {
            butterfly.state = butterfly_config.STATES.FLYING;
        }
    }
    
    return false;
}

function calculateSafePath(butterfly, targetPos, mouseX, mouseY) {
    // Calculate direct path to target
    const dx = targetPos.x - butterfly.x;
    const dy = targetPos.y - butterfly.y;
    const directAngle = Math.atan2(dy, dx);
    
    // Calculate angle to mouse
    const mouseAngle = Math.atan2(butterfly.y - mouseY, butterfly.x - mouseX);
    
    // If mouse is between butterfly and target, calculate detour
    const angleDiff = Math.abs(directAngle - mouseAngle);
    if (angleDiff < Math.PI * 0.5) {
        // Add deviation to avoid mouse
        const detourAngle = directAngle + (Math.PI * 0.3 * Math.sign(Math.sin(mouseAngle)));
        return {
            x: Math.cos(detourAngle) * butterfly_config.NORMAL_SPEED,
            y: Math.sin(detourAngle) * butterfly_config.NORMAL_SPEED
        };
    }
    
    // Otherwise proceed directly to target
    return {
        x: dx * 0.1,
        y: dy * 0.1
    };
}

function findSafeTarget(butterfly, mouseX, mouseY) {
    const allTargets = [...document.querySelectorAll(".important-word:not(.targeted)")];
    if (allTargets.length === 0) return;
    
    // Score targets based on distance from mouse and current position
    const scoredTargets = allTargets.map(target => {
        const pos = getElementPagePosition(target, gardenCanvas);
        const distanceToMouse = Math.hypot(pos.x - mouseX, pos.y - mouseY);
        const distanceToButterfly = Math.hypot(pos.x - butterfly.x, pos.y - butterfly.y);
        
        return {
            target,
            score: distanceToMouse - distanceToButterfly * 0.5 // Prefer targets far from mouse
        };
    });
    
    // Choose one of the top 3 safest targets randomly
    scoredTargets.sort((a, b) => b.score - a.score);
    const safeTarget = scoredTargets[Math.floor(Math.random() * Math.min(3, scoredTargets.length))].target;
    
    butterfly.targetElement = safeTarget;
    safeTarget.classList.add("targeted");
}

function colorWord(element, butterfly) {
    const isHovering = butterfly.state === butterfly_config.STATES.HOVERING;
    if (isHovering) {
        element.style.color = butterfly.color;
    } else {
        element.style.color = '';
    }
}

// Helper function to add red tint
function adjustColorToRed(baseColor, intensity) {
    const r = parseInt(baseColor.slice(1,3), 16);
    const g = parseInt(baseColor.slice(3,5), 16);
    const b = parseInt(baseColor.slice(5,7), 16);
    
    const newR = Math.min(255, r + (255 - r) * intensity);
    const newG = Math.max(0, g - g * intensity * 0.5);
    const newB = Math.max(0, b - b * intensity * 0.5);
    
    return `rgb(${Math.round(newR)}, ${Math.round(newG)}, ${Math.round(newB)})`;
}
