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
    // Log state and target when flying
    console.log(`Butterfly state: ${butterfly.state}`);
    console.log(`Current target: ${butterfly.targetElement ? butterfly.targetElement.textContent : 'none'}`);

    // If the butterfly has a target element, fly towards it
    if (butterfly.targetElement) {
        // Update target position considering scroll
        const rect = butterfly.targetElement.getBoundingClientRect();
        butterfly.targetX = rect.left + rect.width/2 + window.scrollX;
        butterfly.targetY = rect.top + rect.height/2 + window.scrollY;
        
        const dx = butterfly.targetX - butterfly.x;
        const dy = butterfly.targetY - butterfly.y;
        const distance = Math.hypot(dx, dy);

        console.log(`Flying to target: distance=${distance}, targetPos=(${butterfly.targetX}, ${butterfly.targetY})`);

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
    } else {
        // Find new target
        const potentialTargets = [
            ...document.querySelectorAll(".important-word:not(.targeted)")
        ];
        console.log(`Available targets: ${potentialTargets.length}`);
        
        if (potentialTargets.length > 0) {
            const target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
            butterfly.targetElement = target;
            target.classList.add("targeted");
            console.log(`New target assigned: ${target.textContent}`);
        } else {
            console.log('No available targets found');
        }
    }
}

function handleButterflySpawning(butterfly) {
  // Gradually move into screen
  const targetY =
    butterfly.y < 0
      ? 50
      : butterfly.y > gardenCanvas.height
      ? gardenCanvas.height - 50
      : butterfly.y;
  const targetX =
    butterfly.x < 0
      ? 50
      : butterfly.x > gardenCanvas.width
      ? gardenCanvas.width - 50
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
        // Update target position in case of scroll
        const rect = butterfly.targetElement.getBoundingClientRect();
        const targetX = rect.left + rect.width/2 + window.scrollX;
        const targetY = rect.top + rect.height/2 + window.scrollY;
        
        // Update hovering position to match target
        butterfly.hoveringPosition.x = targetX;
        butterfly.hoveringPosition.y = targetY;
        
        // Add slight movement while hovering
        const hoverOffset = Math.sin(currentTime / 500) * 5;
        butterfly.x = butterfly.hoveringPosition.x;
        butterfly.y = butterfly.hoveringPosition.y + hoverOffset;

        // Change color of the word
        butterfly.targetElement.style.color = butterfly.color;
        
        if (isDebugMode) {
            console.log(`Hovering at: (${butterfly.x}, ${butterfly.y})`);
        }
    }
    console.log(`Hovering state - Time spent: ${currentTime - butterfly.hoveringStartTime}ms`);
    
    if (butterfly.hoveringPosition) {
        // Add slight movement while hovering
        const hoverOffset = Math.sin(currentTime / 500) * 5;
        butterfly.x = butterfly.hoveringPosition.x;
        butterfly.y = butterfly.hoveringPosition.y + hoverOffset;

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
        angle,
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
}

// Add this as a separate function to handle scroll properly
function handleScroll(butterfly) {
    const currentScroll = {
        x: window.scrollX,
        y: window.scrollY
    };
    
    if (!butterfly.lastScroll) {
        butterfly.lastScroll = {...currentScroll};
        return;
    }

    // Calculate scroll delta
    const scrollDeltaY = currentScroll.y - butterfly.lastScroll.y;
    const scrollDeltaX = currentScroll.x - butterfly.lastScroll.x;

    if (Math.abs(scrollDeltaY) > 0.1 || Math.abs(scrollDeltaX) > 0.1) {
        // Adjust butterfly position
        butterfly.y += scrollDeltaY;
        butterfly.x += scrollDeltaX;

        // If hovering, adjust hovering position
        if (butterfly.hoveringPosition) {
            butterfly.hoveringPosition.y += scrollDeltaY;
            butterfly.hoveringPosition.x += scrollDeltaX;
        }

        // If has target, update target position
        if (butterfly.targetElement) {
            const rect = butterfly.targetElement.getBoundingClientRect();
            butterfly.targetY = rect.top + rect.height/2 + window.scrollY;
            butterfly.targetX = rect.left + rect.width/2 + window.scrollX;
        }

        if (isDebugMode) {
            console.log(`Scroll adjusted: deltaY=${scrollDeltaY}, deltaX=${scrollDeltaX}`);
            console.log(`New position: (${butterfly.x}, ${butterfly.y})`);
            if (butterfly.targetElement) {
                console.log(`Target position: (${butterfly.targetX}, ${butterfly.targetY})`);
            }
        }
    }

    butterfly.lastScroll = {...currentScroll};
}
