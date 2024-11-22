import { color_config, butterfly_config } from "./config.js";
import { gardenCanvas, mouseState } from "./garden.js";
import { getElementPagePosition } from './utils.js';

export let butterflies = [];

export function updateButterfly(butterfly) {
    const currentTime = Date.now();
    
    // Store previous position for direction calculation
    const prevX = butterfly.x;
    const prevY = butterfly.y;
    
    // Handle scroll first
    handleScroll(butterfly);
    
    // Check mouse interaction before any other state updates
    handleMouseInteraction(butterfly, mouseState.x, mouseState.y);
    
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

    // Apply friction with a smaller decay factor
    butterfly.velocity.x *= 0.99; // Slightly reduce friction
    butterfly.velocity.y *= 0.99;

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
        
        // Get target position first
        const targetPos = getElementPagePosition(butterfly.targetElement, gardenCanvas);
        
        butterfly.targetX = targetPos.x
        butterfly.targetY = targetPos.y
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
    
    butterfly.hoveringPosition.x = targetPosition.x + Math.sin(hoverTime * 1.5) * butterfly_config.WANDER_RADIUS;
    butterfly.hoveringPosition.y = targetPosition.y + Math.cos(hoverTime * 2) * butterfly_config.WANDER_RADIUS;
    
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
        
    if (!butterfly.color) {
        butterfly.color = '#FFFFFF'; // Default to white or any other default color
    }

    if (butterfly.state === butterfly_config.STATES.SCARED) {        
        const baseColor = butterfly.originalColor; // Use originalColor or fallback to current color
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);
        
        const newR = Math.min(255, r + (255 - r) * butterfly_config.ANGER_TINT);
        const newG = Math.max(0, g - g * butterfly_config.ANGER_TINT * 0.5);
        const newB = Math.max(0, b - b * butterfly_config.ANGER_TINT * 0.5);
        
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
        const flashIntensity = Math.sin(Date.now() * butterfly_config.FLASH_SPEED);
        
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


function colorWord(element, butterfly) {
    const isHovering = butterfly.state === butterfly_config.STATES.HOVERING;
    if (isHovering) {
        element.style.color = butterfly.color;
    } else {
        element.style.color = '';
    }
}

export function catchButterfly(butterfly, index) {
    console.log(`Caught butterfly at position: (${butterfly.x}, ${butterfly.y})`);
    butterflies.splice(index, 1);
    caughtButterfliesCount++;
    updateCaughtButterfliesDisplay();
}
