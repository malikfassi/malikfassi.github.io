import { color_config, butterfly_config } from "./config.js";
import { gardenCanvas, mouseState } from "./garden.js";
import { getElementPagePosition } from './utils.js';
import { incrementCaughtButterfliesCount } from './garden.js';

export let butterflies = [];

export function updateButterfly(butterfly) {
    const currentTime = Date.now();
    
    // Store previous position for direction calculation
    const prevX = butterfly.x;
    const prevY = butterfly.y;
    
    // Handle scroll first
    handleScroll(butterfly);
    
    // Check mouse interaction before any other state updates
    handleMouseInteraction(butterfly);
    
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

    // Add more randomness for erratic movement
    const randomTwitch = {
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5
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

        // Add course corrections and random twitch
        totalX += courseCorrection.x * speed + randomTwitch.x;
        totalY += courseCorrection.y * speed + randomTwitch.y;

        // Smooth acceleration
        butterfly.velocity.x += (totalX - butterfly.velocity.x) * 0.03;
        butterfly.velocity.y += (totalY - butterfly.velocity.y) * 0.03;
    }

    // Apply velocity with air resistance
    butterfly.x += butterfly.velocity.x;
    butterfly.y += butterfly.velocity.y;
    
    // More natural deceleration
    butterfly.velocity.x *= 0.95;
    butterfly.velocity.y *= 0.95;
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
    
    // Calculate direction to hovering position
    const dx = butterfly.hoveringPosition.x - butterfly.x;
    const dy = butterfly.hoveringPosition.y - butterfly.y;
    const distance = Math.hypot(dx, dy);
    
    if (distance > 0) {
        // Normalize direction
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        // Calculate velocity towards hovering position using TRANSITION_SPEED
        const transitionSpeed = butterfly_config.HOVER.TRANSITION_SPEED;
        butterfly.velocity.x += (normalizedDx * transitionSpeed - butterfly.velocity.x) * 0.1;
        butterfly.velocity.y += (normalizedDy * transitionSpeed - butterfly.velocity.y) * 0.1;
    }
    
    // Update butterfly position with velocity
    butterfly.x += butterfly.velocity.x;
    butterfly.y += butterfly.velocity.y;
    
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
    setButterflyColor(butterfly);
    const { x, y, angle, sizeMultiplier } = calculateButterflyProperties(butterfly);
    ctx.translate(x, y + calculateVerticalBob(butterfly));
    ctx.rotate(angle + Math.sin(Date.now() / 1000) * 0.05);
    drawWings(ctx, butterfly, sizeMultiplier);
    drawBody(ctx, sizeMultiplier);
    drawScaredSymbol(ctx, butterfly);
    ctx.restore();
}

function setButterflyColor(butterfly) {
    if (!butterfly.color) {
        butterfly.color = '#FFFFFF';
    }
    if (butterfly.state === butterfly_config.STATES.SCARED) {
        butterfly.color = calculateScaredColor(butterfly);
    } else {
        butterfly.color = butterfly.originalColor || butterfly.color;
    }
}

function calculateButterflyProperties(butterfly) {
    const baseSize = butterfly_config.SIZE;
    const time = Date.now() / 1000 + (butterfly.timeOffset || 0);
    const sizeMultiplier = calculateSizeMultiplier(butterfly, time);
    return {
        x: butterfly.x,
        y: butterfly.y,
        angle: butterfly.angle,
        sizeMultiplier,
        size: baseSize * sizeMultiplier
    };
}

function calculateSizeMultiplier(butterfly, time) {
    switch (butterfly.state) {
        case butterfly_config.STATES.FLYING:
            return 1 + Math.sin(time * 6) * 0.2;
        case butterfly_config.STATES.HOVERING:
            return 1 + Math.sin(time * 4) * 0.1;
        case butterfly_config.STATES.SCARED:
            return 1 + Math.sin(time * 8) * 0.2;
        default:
            return 1;
    }
}

function calculateVerticalBob(butterfly) {
    const time = Date.now() / 1000 + (butterfly.timeOffset || 0);
    return Math.sin(time * (butterfly.state === butterfly_config.STATES.HOVERING ? 4 : 6)) * 2;
}

function drawWings(ctx, butterfly, sizeMultiplier) {
    const wingPattern = [
        [0, butterfly.color, butterfly.color, 0],
        [butterfly.color, butterfly.color, butterfly.color, butterfly.color],
        [butterfly.color, butterfly.color, butterfly.color, butterfly.color],
        [0, butterfly.color, butterfly.color, 0],
    ];
    const pixelSize = Math.max(1, Math.floor(butterfly_config.SIZE * sizeMultiplier / 4));
    const wingFlapSpeed = butterfly.state === butterfly_config.STATES.HOVERING ? 4 : 6;
    const wingFlap = (Math.sin(Date.now() / 1000 * wingFlapSpeed) * Math.PI) / 8;

    // Draw left wing
    ctx.save();
    ctx.translate(-pixelSize * 2, 0); // Adjust position for left wing
    ctx.rotate(-wingFlap);
    drawWing(ctx, wingPattern, pixelSize);
    ctx.restore();

    // Draw right wing
    ctx.save();
    ctx.translate(pixelSize * 2, 0); // Adjust position for right wing
    ctx.rotate(wingFlap);
    drawWing(ctx, wingPattern, pixelSize);
    ctx.restore();
}

function drawWing(ctx, wingPattern, pixelSize) {
    wingPattern.forEach((row, i) => {
        row.forEach((pixel, j) => {
            if (pixel) {
                ctx.fillStyle = pixel;
                ctx.globalAlpha = 0.8;
                ctx.fillRect(
                    j * pixelSize - (wingPattern[0].length / 2) * pixelSize,
                    i * pixelSize - (wingPattern.length / 2) * pixelSize,
                    pixelSize,
                    pixelSize
                );
            }
        });
    });
}

function drawBody(ctx, sizeMultiplier) {
    ctx.fillStyle = "#6D4C41";
    ctx.globalAlpha = 1;
    const pixelSize = Math.max(1, Math.floor(butterfly_config.SIZE * sizeMultiplier / 4));
    for (let i = -2; i <= 2; i++) {
        ctx.fillRect(-pixelSize / 2, i * pixelSize, pixelSize, pixelSize);
    }
}

function drawScaredSymbol(ctx, butterfly) {
    if (butterfly.state === butterfly_config.STATES.SCARED && butterfly.scaredSymbol) {
        ctx.font = 'bold 16px Comic Sans MS, cursive';
        const flashIntensity = Math.sin(Date.now() * butterfly_config.FLASH_SPEED);
        ctx.fillStyle = flashIntensity > 0 ? '#ff6b6b' : 'white';
        ctx.strokeStyle = flashIntensity > 0 ? 'white' : '#ff6b6b';
        ctx.lineWidth = 3;
        const symbolOffsetX = butterfly_config.SIZE * 0.8;
        const symbolOffsetY = -butterfly_config.SIZE * 1;
        const bounce = Math.sin(Date.now() * 0.008) * 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText(butterfly.scaredSymbol, symbolOffsetX, symbolOffsetY + bounce);
        ctx.fillText(butterfly.scaredSymbol, symbolOffsetX, symbolOffsetY + bounce);
    }
}

// Add this function to handle the butterfly leaving the canvas
function handleButterflyLeaving(butterfly) {
    if (!butterfly.targetElement || butterfly.state !== butterfly_config.STATES.LEAVING) {
        setLeavingTarget(butterfly);
    }
    moveToEdge(butterfly);
}

function setLeavingTarget(butterfly) {
    const edgeTarget = document.createElement('div');
    const nearestEdge = findNearestEdge(butterfly);
    edgeTarget.getBoundingClientRect = () => ({
        left: nearestEdge.x,
        top: nearestEdge.y,
        width: 0,
        height: 0
    });
    edgeTarget.textContent = `Leaving via ${nearestEdge.edge} edge`;
    butterfly.targetElement = edgeTarget;
}

function findNearestEdge(butterfly) {
    const distances = [
        { edge: 'left', dist: butterfly.x, x: -butterfly_config.EDGE_BUFFER, y: butterfly.y },
        { edge: 'right', dist: gardenCanvas.width - butterfly.x, x: gardenCanvas.width + butterfly_config.EDGE_BUFFER, y: butterfly.y },
        { edge: 'top', dist: butterfly.y, x: butterfly.x, y: -butterfly_config.EDGE_BUFFER },
        { edge: 'bottom', dist: gardenCanvas.height - butterfly.y, x: butterfly.x, y: gardenCanvas.height + butterfly_config.EDGE_BUFFER }
    ];
    return distances.reduce((min, curr) => curr.dist < min.dist ? curr : min);
}

function moveToEdge(butterfly) {
    const targetPos = getElementPagePosition(butterfly.targetElement, gardenCanvas);
    butterflyMoveTo(butterfly, targetPos.x, targetPos.y, butterfly_config.LEAVING_SPEED);

    // Check if the butterfly is close enough to the edge to be considered "leaving"
    if (Math.hypot(targetPos.x - butterfly.x, targetPos.y - butterfly.y) < butterfly_config.EDGE_BUFFER) {
        const index = butterflies.indexOf(butterfly);
        if (index > -1) {
            butterflies.splice(index, 1);
        }
    }
}

export function getRelativeButterflyPosition(butterfly, gardenCanvas) {
    const canvasRect = gardenCanvas.getBoundingClientRect();
    const viewportX = butterfly.x - window.scrollX;
    const viewportY = butterfly.y - window.scrollY;
    return {
        x: viewportX - canvasRect.left,
        y: viewportY - canvasRect.top
    };
}

export function setAbsoluteButterflyPosition(butterfly, relativeX, relativeY, gardenCanvas) {
    const canvasRect = gardenCanvas.getBoundingClientRect();
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

function handleMouseInteraction(butterfly) {
    if (!initializeMousePosition(butterfly)) return false;
    const relativePos = getRelativeButterflyPosition(butterfly, gardenCanvas);
    const { isMouseMoving, distanceToCursor } = calculateMouseMovement(butterfly, relativePos);
    if (distanceToCursor < butterfly_config.FEAR_RADIUS && isMouseMoving) {
        enterScaredState(butterfly, relativePos, distanceToCursor);
        return true;
    }
}

function initializeMousePosition(butterfly) {
    if (!butterfly.lastMouseX) {
        butterfly.lastMouseX = mouseState.x;
        butterfly.lastMouseY = mouseState.y;
        return false;
    }
    return true;
}

function calculateMouseMovement(butterfly, relativePos) {
    const mouseMovement = Math.hypot(mouseState.x - butterfly.lastMouseX, mouseState.y - butterfly.lastMouseY);
    const isMouseMoving = mouseMovement > 2;
    butterfly.lastMouseX = mouseState.x;
    butterfly.lastMouseY = mouseState.y;
    const dx = relativePos.x - mouseState.x;
    const dy = relativePos.y - mouseState.y;
    const distanceToCursor = Math.hypot(dx, dy);
    return { isMouseMoving, distanceToCursor };
}

function enterScaredState(butterfly, relativePos, distanceToCursor) {
    if (butterfly.state !== butterfly_config.STATES.SCARED) {
        butterfly.state = butterfly_config.STATES.SCARED;
        butterfly.scaredStartTime = Date.now();
        if (butterfly.targetElement) {
            butterfly.targetElement.classList.remove("targeted");
            butterfly.targetElement.style.color = "";
            butterfly.targetElement = null;
        }
        butterfly.scaredSymbol = ['!', '?', '*', '!!', '@'][Math.floor(Math.random() * 4)];
    }

    // Calculate direction away from the cursor
    const normalizedDx = (relativePos.x - mouseState.x) / distanceToCursor;
    const normalizedDy = (relativePos.y - mouseState.y) / distanceToCursor;
    const escapeTargetX = butterfly.x + normalizedDx * butterfly_config.FEAR_RADIUS;
    const escapeTargetY = butterfly.y + normalizedDy * butterfly_config.FEAR_RADIUS;

    // Use butterflyMoveTo to move away with ESCAPE_SPEED
    butterflyMoveTo(butterfly, escapeTargetX, escapeTargetY, butterfly_config.ESCAPE_SPEED);

    // Check if the scared duration has passed
    if (Date.now() - butterfly.scaredStartTime > butterfly_config.SCARED_DURATION) {
        butterfly.state = butterfly_config.STATES.FLYING; // Transition back to flying
    }
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
    incrementCaughtButterfliesCount();
}

function calculateScaredColor(butterfly) {
    const baseColor = butterfly.originalColor || '#FFFFFF'; // Default to white if no original color
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);

    // Adjust color to a darker shade to indicate fear
    const newR = Math.max(0, r - 50);
    const newG = Math.max(0, g - 50);
    const newB = Math.max(0, b - 50);

    return `rgb(${newR}, ${newG}, ${newB})`;
}
