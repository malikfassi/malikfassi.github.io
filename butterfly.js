import { color_config, butterfly_config, isDebugMode } from "./config.js";

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
            handleButterflyFlying(butterfly);
            break;
        case butterfly_config.STATES.HOVERING:
            handleButterflyHovering(butterfly, currentTime);
            break;
        case butterfly_config.STATES.SCARED:
            handleButterflyScared(butterfly, mouseX, mouseY);
            if (currentTime - butterfly.scaredTime > butterfly_config.SCARED_DURATION) {
                butterfly.state = butterfly_config.STATES.FLYING;
            }
            break;
        case butterfly_config.STATES.LEAVING:
            handleButterflyLeaving(butterfly);
            break;
    }

    if (isDebugMode) {
        console.log(`Words hovered: ${butterfly.wordsHovered}`);
        console.log(`Position changed from (${butterfly.lastX}, ${butterfly.lastY}) to (${butterfly.x}, ${butterfly.y})`);
    }
    
    butterfly.lastX = butterfly.x;
    butterfly.lastY = butterfly.y;
}

function handleButterflyFlying(butterfly) {
    if (!butterfly.targetElement) {
        const newTarget = findNewTarget();
        if (newTarget) {
            butterfly.targetElement = newTarget;
            newTarget.classList.add("targeted");
            console.log(`New target assigned: ${newTarget.textContent}`);
        }
    }

    if (butterfly.targetElement) {
        const targetPosition = getElementPagePosition(butterfly.targetElement);
        butterfly.targetX = targetPosition.x;
        butterfly.targetY = targetPosition.y;
        
        const dx = butterfly.targetX - butterfly.x;
        const dy = butterfly.targetY - butterfly.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 1) {
            butterfly.velocity.x += (dx / distance) * 0.5;
            butterfly.velocity.y += (dy / distance) * 0.5;
        } else {
            butterfly.state = butterfly_config.STATES.HOVERING;
            butterfly.hoveringPosition = { 
                x: butterfly.targetX,
                y: butterfly.targetY 
            };
            butterfly.hoveringStartTime = Date.now();
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

function handleButterflyHovering(butterfly, currentTime) {
    if (butterfly.targetElement && butterfly.hoveringPosition) {
        const targetPosition = getElementPagePosition(butterfly.targetElement);
        
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

function handleButterflyScared(butterfly, mouseX, mouseY) {
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

export function scheduleNextSpawn() {
  if (butterflySpawnTimeoutId) {
    clearTimeout(butterflySpawnTimeoutId);
  }

  const nextSpawnDelay =
    butterfly_config.SPAWN_CONFIG.MIN_INTERVAL * 2 +
    Math.random() *
      (butterfly_config.SPAWN_CONFIG.MAX_INTERVAL -
        butterfly_config.SPAWN_CONFIG.MIN_INTERVAL) *
      2;

  butterflySpawnTimeoutId = setTimeout(spawnButterfly, nextSpawnDelay);
}

function spawnButterfly() {
    if (butterflies.length >= butterfly_config.MAX_COUNT) {
        scheduleNextSpawn();
        return;
    }

    // Spawn from random edge
    const edge = Math.floor(Math.random() * 4);
    let x, y, angle;

    switch (edge) {
        case 0: // top
            x = Math.random() * window.innerWidth;
            y = -20;
            angle = Math.PI / 2;
            break;
        case 1: // right
            x = window.innerWidth + 20;
            y = Math.random() * window.innerHeight;
            angle = Math.PI;
            break;
        case 2: // bottom
            x = Math.random() * window.innerWidth;
            y = window.innerHeight + 20;
            angle = -Math.PI / 2;
            break;
        case 3: // left
            x = -20;
            y = Math.random() * window.innerHeight;
            angle = 0;
            break;
    }

    const color = color_config.PASTEL_COLORS[
        Math.floor(Math.random() * color_config.PASTEL_COLORS.length)
    ];

    butterflies.push({
        x,
        y,
        size: butterfly_config.SIZE,
        angle: Math.random() * Math.PI * 2, // Add initial random angle
        state: butterfly_config.STATES.FLYING,
        birthTime: Date.now(),
        scaredTime: 0,
        velocity: {
            x: Math.cos(angle) * butterfly_config.PEACEFUL_SPEED,
            y: Math.sin(angle) * butterfly_config.PEACEFUL_SPEED,
        },
        targetElement: null,
        color,
        wordsHovered: 0,
    });

    scheduleNextSpawn();
}

export function drawButterfly(ctx, butterfly) {
  const { x, y, size, angle, color } = butterfly;
  const time = Date.now() / 1000;
  const wingFlap = (Math.sin(time * 8) * Math.PI) / 8;

  ctx.save();
  
  // Get the canvas dimensions for proper scaling
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  const scale = Math.min(canvasWidth, canvasHeight) / 1000; // Base scale on smallest dimension
  const adjustedSize = size * scale;

  // Translate to butterfly position
  ctx.translate(x, y);
  ctx.rotate(angle + Math.sin(time) * 0.05);

  // Wing pattern using the butterfly's color
  const wingPattern = [
    [0, color, color, 0],
    [color, color, color, color],
    [color, color, color, color],
    [0, color, color, 0],
  ];

  // Use adjusted size for scaling
  const pixelSize = Math.max(1, Math.floor(adjustedSize / 4));

  // Draw left wing with adjusted scale
  ctx.save();
  ctx.rotate(-wingFlap);
  wingPattern.forEach((row, i) => {
    row.forEach((pixel, j) => {
      if (pixel) {
        ctx.fillStyle = pixel;
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

  // Draw right wing with adjusted scale
  ctx.save();
  ctx.rotate(wingFlap);
  wingPattern.forEach((row, i) => {
    row.forEach((pixel, j) => {
      if (pixel) {
        ctx.fillStyle = pixel;
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

  // Draw body with adjusted scale
  ctx.fillStyle = "#6D4C41";
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(-pixelSize / 2, i * pixelSize, pixelSize, pixelSize);
  }

  ctx.restore();
}

// Add this function to handle the butterfly leaving the canvas
function handleButterflyLeaving(butterfly) {
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
function handleScroll(butterfly) {
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
        const rect = butterfly.targetElement.getBoundingClientRect();
        butterfly.targetX = rect.left + rect.width/2 + window.scrollX;
        butterfly.targetY = rect.top + rect.height/2 + window.scrollY;
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

function getElementPagePosition(element) {
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
