import { color_config, butterfly_config } from "./config.js";

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

  // Check distance to mouse
  const distanceToMouse = Math.hypot(butterfly.x - mouseX, butterfly.y - mouseY);

  // Debug log to check distances
  if (distanceToMouse < butterfly_config.FEAR_RADIUS * 2) {
    console.log(`Distance to mouse: ${distanceToMouse}, Fear radius: ${butterfly_config.FEAR_RADIUS}`);
  }

  // Update scared state
  if (distanceToMouse < butterfly_config.FEAR_RADIUS && butterfly.state !== butterfly_config.STATES.SCARED) {
    butterfly.state = butterfly_config.STATES.SCARED;
    butterfly.scaredTime = currentTime;
    console.log('Butterfly scared!'); // Debug log
  } else if (butterfly.state === butterfly_config.STATES.SCARED && currentTime - butterfly.scaredTime > 2000) {
    butterfly.state = butterfly_config.STATES.FLYING;
  }

  // Handle different states
  switch (butterfly.state) {
    case butterfly_config.STATES.SPAWNING:
      handleButterflySpawning(butterfly);
      break;
    case butterfly_config.STATES.FLYING:
      handleButterflyFlying(butterfly);
      break;
    case butterfly_config.STATES.HOVERING:
      handleButterflyHovering(butterfly);
      break;
    case butterfly_config.STATES.SCARED:
      handleButterflyScared(butterfly, mouseX, mouseY);
      break;
  }

  // Initialize lastScroll if not exists
  if (!butterfly.lastScroll) {
    butterfly.lastScroll = {
      x: window.scrollX,
      y: window.scrollY
    };
    console.log(`Initializing last scroll: (${butterfly.lastScroll.x}, ${butterfly.lastScroll.y})`);
  }

  // Store original position before updates
  const originalX = butterfly.x;
  const originalY = butterfly.y;

  // Update position and physics
  butterfly.x += butterfly.velocity.x;
  butterfly.y += butterfly.velocity.y;
  butterfly.velocity.x *= 0.98;
  butterfly.velocity.y *= 0.98;

  // Adjust butterfly position based on scroll
  const scrollDeltaX = window.scrollX - butterfly.lastScroll.x;
  const scrollDeltaY = window.scrollY - butterfly.lastScroll.y;

  if (Math.abs(scrollDeltaX) > 0.1 || Math.abs(scrollDeltaY) > 0.1) {
    butterfly.x += scrollDeltaX;
    butterfly.y += scrollDeltaY;
    
    // Update last scroll position
    butterfly.lastScroll.x = window.scrollX;
    butterfly.lastScroll.y = window.scrollY;
  }

  // Log only if position changed significantly
  if (Math.abs(butterfly.x - originalX) > 1 || Math.abs(butterfly.y - originalY) > 1) {
    console.log(`Position changed from (${originalX}, ${originalY}) to (${butterfly.x}, ${butterfly.y})`);
  }
}

function handleButterflyFlying(butterfly) {
  // Add random movement
  butterfly.velocity.x += (Math.random() - 0.5) * 0.2; // Increased randomness
  butterfly.velocity.y += (Math.random() - 0.5) * 0.2; // Increased randomness

  // If the butterfly has a target element, fly towards it
  if (butterfly.targetElement) {
    const rect = butterfly.targetElement.getBoundingClientRect();
    const targetX = (rect.left + rect.right) / 2 + window.scrollX;
    const targetY = (rect.top + rect.bottom) / 2 + window.scrollY;
    const dx = targetX - butterfly.x;
    const dy = targetY - butterfly.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 1) {
        butterfly.velocity.x += (dx / distance) * 0.1;
        butterfly.velocity.y += (dy / distance) * 0.1;
    } else {
        butterfly.state = butterfly_config.STATES.HOVERING;
        butterfly.hoveringPosition = { x: targetX, y: targetY };
        butterfly.hoveringStartTime = Date.now();
    }
  }

  // Limit speed
  const speed = Math.hypot(butterfly.velocity.x, butterfly.velocity.y);
  if (speed > butterfly_config.PEACEFUL_SPEED) {
    butterfly.velocity.x *= butterfly_config.PEACEFUL_SPEED / speed;
    butterfly.velocity.y *= butterfly_config.PEACEFUL_SPEED / speed;
  }

  // Update position
  butterfly.x += butterfly.velocity.x;
  butterfly.y += butterfly.velocity.y;

  // Keep in bounds with margin
  const margin = 50;
  if (butterfly.x < margin) butterfly.velocity.x += 0.1;
  if (butterfly.x > gardenCanvas.width - margin) butterfly.velocity.x -= 0.1;
  if (butterfly.y < margin) butterfly.velocity.y += 0.1;
  if (butterfly.y > gardenCanvas.height - margin) butterfly.velocity.y -= 0.1;

  // Ensure every butterfly has a target
  if (!butterfly.targetElement && butterfly.state !== "leaving") {
    const potentialTargets = [
      ...document.querySelectorAll(".important-word:not(.targeted)"),
    ];
    if (potentialTargets.length > 0) {
      const target =
        potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
      butterfly.targetElement = target;
      target.classList.add("targeted");
      console.log(`Target assigned: ${butterfly.targetElement.textContent}`);
    }
  }

  // Change color of the word when butterfly is near
  if (butterfly.targetElement) {
    const rect = butterfly.targetElement.getBoundingClientRect();
    const targetX = (rect.left + rect.right) / 2 + window.scrollX;
    const targetY = (rect.top + rect.bottom) / 2 + window.scrollY;
    const distance = Math.hypot(butterfly.x - targetX, butterfly.y - targetY);

    if (distance < butterfly_config.INTERACTION_RADIUS) {
      butterfly.targetElement.style.color = butterfly.color; // Change color
    } else {
      butterfly.targetElement.style.color = ""; // Reset color
    }
  }

  // Call the function to handle leaving
  if (butterfly.state === "leaving") {
    handleButterflyLeaving(butterfly);
  }

  if (butterfly.wordsHovered >= butterfly_config.HOVER_WORDS_BEFORE_LEAVING) {
    butterfly.state = butterfly_config.STATES.LEAVING;
  }

  console.log(`Words hovered: ${butterfly.wordsHovered}`);
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

function handleButterflyHovering(butterfly) {
  if (butterfly.hoveringPosition) {
    // Hover effect: slight vertical oscillation
    const hoverOffset = Math.sin(Date.now() / 500) * 0.1;
    butterfly.x = butterfly.hoveringPosition.x;
    butterfly.y = butterfly.hoveringPosition.y + hoverOffset;

    // Change color of the word
    if (butterfly.targetElement) {
      butterfly.targetElement.style.color = butterfly.color;
      butterfly.targetElement.style.backgroundColor = "#f0f0f0";
    } else {
      console.warn("No target element while hovering.");
    }

    // Check if it's time to move to another word
    if (Date.now() - butterfly.hoveringStartTime > 3000) {
      butterfly.state = butterfly_config.STATES.FLYING;
      if (butterfly.targetElement) {
        butterfly.targetElement.style.color = ""; // Reset color
      }
      butterfly.targetElement = null; // Clear current target
      butterfly.wordsHovered += 1;
      console.log(`Words hovered: ${butterfly.wordsHovered}`);

      if (butterfly.wordsHovered >= butterfly_config.HOVER_WORDS_BEFORE_LEAVING) {
        butterfly.state = butterfly_config.STATES.LEAVING;
        console.log("Butterfly is leaving.");
        handleButterflyLeaving(butterfly); // Ensure leaving logic is called
      }
    }

    console.log("Butterfly is hovering on:", butterfly.targetElement ? butterfly.targetElement.textContent : "null");
  }
}

function handleButterflyScared(butterfly, mouseX, mouseY) {
  const dx = butterfly.x - mouseX;
  const dy = butterfly.y - mouseY;
  const distance = Math.hypot(dx, dy);

  if (distance > 0) {
    const escapeAngle = Math.atan2(dy, dx) + ((Math.random() - 0.5) * Math.PI) / 6;
    butterfly.velocity.x = Math.cos(escapeAngle) * butterfly_config.ESCAPE_SPEED;
    butterfly.velocity.y = Math.sin(escapeAngle) * butterfly_config.ESCAPE_SPEED;
  }

  // Change color temporarily
  const originalColor = butterfly.color;
  butterfly.color = '#FF0000'; // Change to red when scared

  // Revert color back after 1 second
  setTimeout(() => {
    butterfly.color = originalColor;
  }, 1000);
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
  const edge = ["top", "right", "bottom", "left"][
    Math.floor(Math.random() * 4)
  ];
  let x, y, angle;

  switch (edge) {
    case "top":
      x = Math.random() * gardenCanvas.width;
      y = -20;
      angle = Math.PI / 2;
      break;
    case "right":
      x = gardenCanvas.width + 20;
      y = Math.random() * gardenCanvas.height;
      angle = Math.PI;
      break;
    case "bottom":
      x = Math.random() * gardenCanvas.width;
      y = gardenCanvas.height + 20;
      angle = -Math.PI / 2;
      break;
    case "left":
      x = -20;
      y = Math.random() * gardenCanvas.height;
      angle = 0;
      break;
  }

  const color =
    color_config.PASTEL_COLORS[
      Math.floor(Math.random() * color_config.PASTEL_COLORS.length)
    ];

  butterflies.push({
    x,
    y,
    size: butterfly_config.SIZE,
    angle,
    state: butterfly_config.STATES.SPAWNING,
    birthTime: Date.now(),
    scaredTime: 0,
    velocity: {
      x: Math.cos(angle) * butterfly_config.PEACEFUL_SPEED,
      y: Math.sin(angle) * butterfly_config.PEACEFUL_SPEED,
    },
    targetElement: null, // Initialize targetElement to null
    color, // Assign color to butterfly
    wordsHovered: 0, // Initialize wordsHovered to 0
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
  console.log(`Butterfly is leaving: (${butterfly.x}, ${butterfly.y})`);
  
  // Determine the nearest edge and set velocity towards it
  const distances = {
    top: butterfly.y,
    right: gardenCanvas.width - butterfly.x,
    bottom: gardenCanvas.height - butterfly.y,
    left: butterfly.x,
  };

  const nearestEdge = Object.keys(distances).reduce((a, b) =>
    distances[a] < distances[b] ? a : b
  );

  switch (nearestEdge) {
    case "top":
      butterfly.velocity.x = 0;
      butterfly.velocity.y = -butterfly_config.ESCAPE_SPEED;
      break;
    case "right":
      butterfly.velocity.x = butterfly_config.ESCAPE_SPEED;
      butterfly.velocity.y = 0;
      break;
    case "bottom":
      butterfly.velocity.x = 0;
      butterfly.velocity.y = butterfly_config.ESCAPE_SPEED;
      break;
    case "left":
      butterfly.velocity.x = -butterfly_config.ESCAPE_SPEED;
      butterfly.velocity.y = 0;
      break;
  }

  // Update position
  butterfly.x += butterfly.velocity.x;
  butterfly.y += butterfly.velocity.y;

  // Check if the butterfly has exited the canvas
  if (
    butterfly.x < -butterfly_config.SIZE ||
    butterfly.x > gardenCanvas.width + butterfly_config.SIZE ||
    butterfly.y < -butterfly_config.SIZE ||
    butterfly.y > gardenCanvas.height + butterfly_config.SIZE
  ) {
    const index = butterflies.indexOf(butterfly);
    if (index > -1) {
      console.log(`Removing butterfly at index: ${index}`);
      butterflies.splice(index, 1);
      scheduleNextSpawn(); // Schedule a new spawn if needed
    }
  }
}
