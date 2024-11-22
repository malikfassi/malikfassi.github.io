// Create a new file for shared utilities
export function getElementPagePosition(element, gardenCanvas) {
    const rect = element.getBoundingClientRect();
    const canvasRect = gardenCanvas.getBoundingClientRect();
    
    // Calculate position relative to canvas
    const position = {
        x: rect.left + rect.width/2 - canvasRect.left,
        y: rect.top + rect.height/2 - canvasRect.top
    };
    return position;
}

export function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function rgbToHsl(rgb) {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s, l };
}

export function hslToHex({ h, s, l }) {
    h = ((h % 360 + 360) % 360) / 360;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h * 12) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function calculateRelativePosition(mouseX, mouseY, gardenCanvas) {
    const canvasRect = gardenCanvas.getBoundingClientRect();
    const viewportX = mouseX + window.scrollX;
    const viewportY = mouseY + window.scrollY;
    return {
        x: viewportX - canvasRect.left,
        y: viewportY - canvasRect.top
    };
}

export function calculateDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

export function updateMouseState(clientX, clientY, canvas) {
    const { x, y } = calculateRelativePosition(clientX, clientY, canvas);
    mouseState.lastX = mouseState.x;
    mouseState.lastY = mouseState.y;
    mouseState.x = x;
    mouseState.y = y;
}

export function drawTextBox(ctx, text, x, y, padding, cornerRadius, bgColor, borderColor, textColor) {
    ctx.font = '12px monospace';
    const textWidth = ctx.measureText(text).width;
    const boxWidth = textWidth + (padding * 2);
    const boxHeight = 20;

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, cornerRadius);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = borderColor;
    ctx.beginPath();
    ctx.roundRect(x, y, boxWidth, boxHeight, cornerRadius);
    ctx.stroke();

    // Draw text
    ctx.fillStyle = textColor;
    ctx.fillText(text, x + padding, y + boxHeight / 2 + 4); // Adjust for text baseline
}