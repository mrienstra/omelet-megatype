const messageInput = document.getElementById('messageInput');
const displayArea = document.getElementById('displayArea');
const displayCanvas = document.getElementById('displayCanvas');
const displayCtx = displayCanvas.getContext('2d');
const staticBtn = document.getElementById('staticBtn');
const scrollBtn = document.getElementById('scrollBtn');
const slideshowBtn = document.getElementById('slideshowBtn');
const textColorInput = document.getElementById('textColor');
const bgColorInput = document.getElementById('bgColor');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const showBtn = document.getElementById('showBtn');
const closeBtn = document.getElementById('closeBtn');
const controls = document.getElementById('controls');
const speedControl = document.getElementById('speedControl');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const measurementCanvas = document.createElement('canvas');
const measurementCtx = measurementCanvas.getContext('2d');
const scalingModeControl = document.getElementById('scalingModeControl');
const fitBtn = document.getElementById('fitBtn');
const fillBtn = document.getElementById('fillBtn');
const balancedBtn = document.getElementById('balancedBtn');
const perLetterScalingControl = document.getElementById('perLetterScalingControl');
const perLetterScaling = document.getElementById('perLetterScaling');
const independentScalingControl = document.getElementById('independentScalingControl');
const independentScaling = document.getElementById('independentScaling');
const debugLogging = document.getElementById('debugLogging');

let currentMode = 'static';
let currentLetterIndex = 0;
let slideshowInterval = null;
let scrollAnimationId = null;
let scrollOffset = 0;
let optimalFontSize = 100; // vmin value where largest char fits perfectly
let optimalFontUnit = 'vmin'; // unit to use for optimal font size
let scalingMode = 'fit'; // 'fit', 'fill', or 'balanced'

// Helper function for conditional logging
function log(...args) {
    if (debugLogging.checked) {
        console.log(...args);
    }
}

// Setup canvas with proper pixel density
function setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = displayCanvas.getBoundingClientRect();

    displayCanvas.width = rect.width * dpr;
    displayCanvas.height = rect.height * dpr;

    displayCtx.scale(dpr, dpr);

    log(`Canvas setup: ${rect.width}x${rect.height} CSS, ${displayCanvas.width}x${displayCanvas.height} physical (DPR: ${dpr})`);
}

// Render text on canvas with perfect centering
function renderCanvas(text, fontSizePx, fontFamily, fontWeight) {
    const rect = displayCanvas.getBoundingClientRect();
    const bgColor = bgColorInput.value;
    const textColor = textColorInput.value;

    // Clear canvas
    displayCtx.fillStyle = bgColor;
    displayCtx.fillRect(0, 0, rect.width, rect.height);

    // Set font
    displayCtx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
    displayCtx.fillStyle = textColor;
    displayCtx.textBaseline = 'alphabetic';

    // Measure text to get bounding box
    const metrics = displayCtx.measureText(text);
    const textWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    // Calculate position to center the actual bounding box (not the baseline)
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Position so the bounding box center aligns with canvas center
    const x = centerX - (textWidth / 2) + metrics.actualBoundingBoxLeft;
    const y = centerY - (textHeight / 2) + metrics.actualBoundingBoxAscent;

    displayCtx.fillText(text, x, y);

    log(`Rendered "${text}" at (${x.toFixed(2)}, ${y.toFixed(2)}), bbox: ${textWidth.toFixed(2)}x${textHeight.toFixed(2)}px`);
}

// Render text with independent horizontal and vertical scaling
function renderCanvasWithIndependentScale(text, fontSizePx, fontFamily, fontWeight, scaleMultiplier) {
    const rect = displayCanvas.getBoundingClientRect();
    const bgColor = bgColorInput.value;
    const textColor = textColorInput.value;

    // Clear canvas
    displayCtx.fillStyle = bgColor;
    displayCtx.fillRect(0, 0, rect.width, rect.height);

    // Set font
    displayCtx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
    displayCtx.fillStyle = textColor;
    displayCtx.textBaseline = 'alphabetic';

    // Measure text to get bounding box at the given font size
    const metrics = displayCtx.measureText(text);
    const textWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
    const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

    // Calculate scale factors to fill both dimensions, then apply the multiplier
    const baseScaleX = rect.width / textWidth;
    const baseScaleY = rect.height / textHeight;
    const scaleX = baseScaleX * scaleMultiplier;
    const scaleY = baseScaleY * scaleMultiplier;

    log(`Independent scaling: text bbox ${textWidth.toFixed(2)}x${textHeight.toFixed(2)}px -> viewport ${rect.width.toFixed(2)}x${rect.height.toFixed(2)}px`);
    log(`Scale factors: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)} (multiplier: ${scaleMultiplier.toFixed(2)})`);

    // Save context state
    displayCtx.save();

    // Apply non-uniform scaling
    displayCtx.scale(scaleX, scaleY);

    // Calculate position in the scaled coordinate system
    // The center of the viewport in scaled coordinates
    const scaledCenterX = rect.width / (2 * scaleX);
    const scaledCenterY = rect.height / (2 * scaleY);

    // Position the text so its bounding box center aligns with the viewport center
    const x = scaledCenterX - (textWidth / 2) + metrics.actualBoundingBoxLeft;
    const y = scaledCenterY - (textHeight / 2) + metrics.actualBoundingBoxAscent;

    displayCtx.fillText(text, x, y);

    // Restore context state
    displayCtx.restore();

    log(`Rendered "${text}" with independent scaling at (${x.toFixed(2)}, ${y.toFixed(2)}) in scaled coords`);
}

// Calculate optimal font size for a message (where largest char fits screen)
function calculateOptimalFontSize(message) {
    if (!message) return 100;

    const characters = Array.from(message);
    const uniqueChars = [...new Set(characters)];

    log('=== CALCULATING OPTIMAL FONT SIZE (Canvas) ===');
    log('Message:', message);
    log('Unique characters:', uniqueChars);
    log('Scaling mode:', scalingMode);

    // Get viewport dimensions
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isPortrait = vh > vw;

    log('Viewport:', vw, 'x', vh, isPortrait ? '(portrait)' : '(landscape)');

    // Calculate test font size in pixels
    // We'll use a test size of 100vmin to establish proportions
    const testSizeVmin = 100;
    const vmin = Math.min(vw, vh);
    const testSizePx = (testSizeVmin / 100) * vmin;

    // Use system fonts with bold weight
    const fontFamily = '-apple-system, "system-ui", "Segoe UI", Arial, sans-serif';
    const fontWeight = 'bold';

    // Set canvas font - need to use pixel size for measurement
    measurementCtx.font = `${fontWeight} ${testSizePx}px ${fontFamily}`;

    log(`Test font: ${measurementCtx.font}`);
    log(`Test size: ${testSizeVmin}vmin = ${testSizePx.toFixed(2)}px`);

    // Track the maximum width and maximum height across all characters
    let maxWidth = 0;
    let maxHeight = 0;
    let widestChar = '';
    let tallestChar = '';

    uniqueChars.forEach(char => {
        const metrics = measurementCtx.measureText(char);

        // Calculate actual bounding box dimensions
        const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
        const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        log(`  "${char}": ${width.toFixed(2)}px wide, ${height.toFixed(2)}px tall (canvas measureText)`);

        if (width > maxWidth) {
            maxWidth = width;
            widestChar = char;
        }
        if (height > maxHeight) {
            maxHeight = height;
            tallestChar = char;
        }
    });

    log(`Widest char: "${widestChar}" at ${maxWidth.toFixed(2)}px`);
    log(`Tallest char: "${tallestChar}" at ${maxHeight.toFixed(2)}px`);

    // Calculate ratios: what percentage of viewport does the max bounding box take?
    const widthRatio = maxWidth / vw;
    const heightRatio = maxHeight / vh;

    log(`Width ratio: ${widthRatio.toFixed(4)} (${(widthRatio * 100).toFixed(2)}% of viewport width)`);
    log(`Height ratio: ${heightRatio.toFixed(4)} (${(heightRatio * 100).toFixed(2)}% of viewport height)`);

    let constraintRatio;
    let unit;

    if (scalingMode === 'fit') {
        // Fit: constrained by whichever dimension hits the edge first (the larger ratio)
        constraintRatio = Math.max(widthRatio, heightRatio);
        unit = 'vmin';
        log(`FIT mode: constrained by ${widthRatio > heightRatio ? 'WIDTH' : 'HEIGHT'}`);
    } else if (scalingMode === 'fill') {
        // Fill: constrained by whichever dimension hits the edge last (the smaller ratio)
        constraintRatio = Math.min(widthRatio, heightRatio);
        unit = 'vmax';
        log(`FILL mode: constrained by ${widthRatio < heightRatio ? 'WIDTH' : 'HEIGHT'}`);
    } else { // 'balanced'
        // Average of both dimensions
        constraintRatio = (widthRatio + heightRatio) / 2;
        unit = 'vmin';
        log('BALANCED mode: using average of both dimensions');
    }

    log(`Constraint ratio: ${constraintRatio.toFixed(4)}`);

    // Store the unit for later use
    optimalFontUnit = unit;

    // Calculate what font size would make the largest char fit edge-to-edge
    if (constraintRatio > 0) {
        const targetRatio = 1.0; // 100% of viewport (edge-to-edge)
        let optimalSize = (testSizeVmin * targetRatio) / constraintRatio;

        // Convert from vmin to vmax if needed (we measured in vmin units)
        if (unit === 'vmax') {
            const vmax = Math.max(vw, vh);
            optimalSize = optimalSize * (vmin / vmax);
            log(`Converted from ${((testSizeVmin * targetRatio) / constraintRatio).toFixed(2)}vmin to ${optimalSize.toFixed(2)}vmax`);
        }

        log(`Optimal font size: ${optimalSize.toFixed(2)}${unit} (at 100%)`);
        log('===================================\n');
        return optimalSize;
    }

    log('ERROR: constraint ratio was 0');
    log('===================================\n');
    return 100;
}

// Update speed display
speedSlider.addEventListener('input', () => {
    speedValue.textContent = speedSlider.value;
    // Scroll animation speed is handled automatically in renderScroll
    if (currentMode === 'slideshow' && displayArea.classList.contains('active')) {
        startSlideshow(); // Restart with new speed
    }
});

// Update font size display
fontSizeSlider.addEventListener('input', () => {
    fontSizeValue.textContent = fontSizeSlider.value;
    if (displayArea.classList.contains('active')) {
        updateDisplay();
    }
});

// Mode buttons
function setMode(mode) {
    currentMode = mode;
    [staticBtn, scrollBtn, slideshowBtn].forEach(btn => btn.classList.remove('active'));

    if (mode === 'static') {
        staticBtn.classList.add('active');
        speedControl.style.display = 'none';
        scalingModeControl.style.display = 'none';
        perLetterScalingControl.style.display = 'none';
        independentScalingControl.style.display = 'none';
        displayArea.classList.remove('slideshow');
    } else if (mode === 'scroll') {
        scrollBtn.classList.add('active');
        speedControl.style.display = 'block';
        scalingModeControl.style.display = 'none';
        perLetterScalingControl.style.display = 'none';
        independentScalingControl.style.display = 'none';
        displayArea.classList.remove('slideshow');
    } else if (mode === 'slideshow') {
        slideshowBtn.classList.add('active');
        speedControl.style.display = 'block';
        scalingModeControl.style.display = 'block';
        perLetterScalingControl.style.display = 'block';
        independentScalingControl.style.display = 'block';
        displayArea.classList.add('slideshow');
    }

    if (displayArea.classList.contains('active')) {
        updateDisplay();
    }
}

staticBtn.addEventListener('click', () => setMode('static'));
scrollBtn.addEventListener('click', () => setMode('scroll'));
slideshowBtn.addEventListener('click', () => setMode('slideshow'));

// Scaling mode buttons
function setScalingMode(mode) {
    scalingMode = mode;
    [fitBtn, fillBtn, balancedBtn].forEach(btn => btn.classList.remove('active'));
    
    if (mode === 'fit') {
        fitBtn.classList.add('active');
    } else if (mode === 'fill') {
        fillBtn.classList.add('active');
    } else if (mode === 'balanced') {
        balancedBtn.classList.add('active');
    }
    
    // Recalculate if in slideshow mode and display is active
    if (currentMode === 'slideshow' && displayArea.classList.contains('active')) {
        const message = messageInput.value || 'OMELET';
        optimalFontSize = calculateOptimalFontSize(message);
        renderSlideshow();
    }
}

fitBtn.addEventListener('click', () => setScalingMode('fit'));
fillBtn.addEventListener('click', () => setScalingMode('fill'));
balancedBtn.addEventListener('click', () => setScalingMode('balanced'));

// Per-letter scaling checkbox
perLetterScaling.addEventListener('change', () => {
    if (currentMode === 'slideshow' && displayArea.classList.contains('active')) {
        // Recalculate and re-render current letter
        renderSlideshow();
    }
});

// Independent scaling checkbox
independentScaling.addEventListener('change', () => {
    if (currentMode === 'slideshow' && displayArea.classList.contains('active')) {
        // Re-render current letter with independent scaling
        renderSlideshow();
    }
});

// Color controls
textColorInput.addEventListener('input', () => {
    if (displayArea.classList.contains('active')) {
        // Re-render current mode
        if (currentMode === 'static') {
            renderStatic(messageInput.value || 'OMELET');
        } else if (currentMode === 'slideshow') {
            renderSlideshow();
        }
        // Scroll mode continuously redraws, so no action needed
    }
});

bgColorInput.addEventListener('input', () => {
    if (displayArea.classList.contains('active')) {
        // Re-render current mode
        if (currentMode === 'static') {
            renderStatic(messageInput.value || 'OMELET');
        } else if (currentMode === 'slideshow') {
            renderSlideshow();
        }
        // Scroll mode continuously redraws, so no action needed
    }
});

// Show/hide display
showBtn.addEventListener('click', () => {
    if (displayArea.classList.contains('active')) {
        hideDisplay();
    } else {
        showDisplay();
    }
});

closeBtn.addEventListener('click', hideDisplay);

function showDisplay() {
    displayArea.classList.add('active');
    controls.style.display = 'none';
    showBtn.textContent = 'Hide Display';
    updateDisplay();
}

function hideDisplay() {
    displayArea.classList.remove('active');
    controls.style.display = 'block';
    showBtn.textContent = 'Show Display';

    // Stop all animations
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
    if (scrollAnimationId) {
        cancelAnimationFrame(scrollAnimationId);
        scrollAnimationId = null;
    }
}

function updateDisplay() {
    const message = messageInput.value || 'OMELET';

    // Stop any ongoing animations
    if (scrollAnimationId) {
        cancelAnimationFrame(scrollAnimationId);
        scrollAnimationId = null;
    }
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }

    setupCanvas();

    if (currentMode === 'static') {
        renderStatic(message);
    } else if (currentMode === 'scroll') {
        scrollOffset = 0;
        renderScroll();
    } else if (currentMode === 'slideshow') {
        optimalFontSize = calculateOptimalFontSize(message);
        currentLetterIndex = 0;
        renderSlideshow();
        startSlideshow();
    }
}

function renderStatic(message) {
    const fontSizeMultiplier = fontSizeSlider.value / 100;
    const baseFontSize = calculateBaseFontSize(message);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const vmin = Math.min(vw, vh);

    const fontSizePx = (baseFontSize * vmin * fontSizeMultiplier * 2.5) / 100;
    const fontFamily = '-apple-system, "system-ui", "Segoe UI", Arial, sans-serif';
    const fontWeight = 'bold';

    renderCanvas(message, fontSizePx, fontFamily, fontWeight);
}

function calculateBaseFontSize(text) {
    const length = text.length;
    if (length <= 3) return 35;
    if (length <= 6) return 25;
    if (length <= 10) return 18;
    if (length <= 15) return 12;
    if (length <= 25) return 10;
    if (length <= 40) return 7;
    return 5;
}

function renderScroll() {
    const message = messageInput.value || 'OMELET';
    const fontSizeMultiplier = fontSizeSlider.value / 100;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const vmin = Math.min(vw, vh);
    const fontSizePx = (15 * vmin * fontSizeMultiplier * 2.5) / 100;
    const fontFamily = '-apple-system, "system-ui", "Segoe UI", Arial, sans-serif';
    const fontWeight = 'bold';

    const rect = displayCanvas.getBoundingClientRect();
    const bgColor = bgColorInput.value;
    const textColor = textColorInput.value;

    // Clear canvas
    displayCtx.fillStyle = bgColor;
    displayCtx.fillRect(0, 0, rect.width, rect.height);

    // Set font and measure text
    displayCtx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
    displayCtx.fillStyle = textColor;
    displayCtx.textBaseline = 'middle';

    const metrics = displayCtx.measureText(message);
    const textWidth = metrics.width;

    // Calculate scroll speed based on slider
    const speed = speedSlider.value;
    const pixelsPerFrame = speed * 0.5; // Adjust speed multiplier as needed

    // Draw text scrolling from right to left
    const x = rect.width - scrollOffset;
    const y = rect.height / 2;

    displayCtx.fillText(message, x, y);

    // Update scroll offset
    scrollOffset += pixelsPerFrame;

    // Reset when text has completely scrolled off screen
    if (scrollOffset > rect.width + textWidth) {
        scrollOffset = 0;
    }

    // Continue animation
    scrollAnimationId = requestAnimationFrame(renderScroll);
}

function renderSlideshow() {
    const message = messageInput.value || 'OMELET';
    if (message.length === 0) return;

    const characters = Array.from(message);
    const letter = characters[currentLetterIndex];
    const fontSizeMultiplier = fontSizeSlider.value / 100;
    const fontFamily = '-apple-system, "system-ui", "Segoe UI", Arial, sans-serif';
    const fontWeight = 'bold';

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const vmin = Math.min(vw, vh);
    const vmax = Math.max(vw, vh);

    // Determine base size: per-letter or message-wide
    let letterOptimalSize, letterOptimalUnit;
    if (perLetterScaling.checked) {
        // Calculate optimal size for just this letter
        letterOptimalSize = calculateOptimalFontSize(letter);
        letterOptimalUnit = optimalFontUnit; // Set by calculateOptimalFontSize
        log(`Per-letter scaling: "${letter}" gets its own calculation`);
    } else {
        // Use the pre-calculated size for the whole message
        letterOptimalSize = optimalFontSize;
        letterOptimalUnit = optimalFontUnit;
    }

    const finalSize = letterOptimalSize * fontSizeMultiplier;
    const fontSizePx = letterOptimalUnit === 'vmax'
        ? (finalSize * vmax) / 100
        : (finalSize * vmin) / 100;

    // Check if independent scaling is enabled
    if (independentScaling.checked) {
        log(`Independent H/V scaling enabled for "${letter}" (base: ${finalSize.toFixed(2)}${letterOptimalUnit}, per-letter: ${perLetterScaling.checked})`);
        renderCanvasWithIndependentScale(letter, fontSizePx, fontFamily, fontWeight, fontSizeMultiplier);
    } else {
        log(`Displaying "${letter}": ${finalSize.toFixed(2)}${letterOptimalUnit} = ${fontSizePx.toFixed(2)}px (optimal: ${letterOptimalSize.toFixed(2)}, multiplier: ${fontSizeMultiplier})`);
        renderCanvas(letter, fontSizePx, fontFamily, fontWeight);
    }
}

function startSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
    }

    const speed = speedSlider.value;
    const interval = 2000 - (speed * 150); // 500ms to 1850ms

    slideshowInterval = setInterval(() => {
        const message = messageInput.value || 'OMELET';
        const characters = Array.from(message);
        currentLetterIndex = (currentLetterIndex + 1) % characters.length;
        renderSlideshow();
    }, interval);
}

// Update display when message changes
messageInput.addEventListener('input', () => {
    if (displayArea.classList.contains('active')) {
        if (currentMode === 'slideshow') {
            const message = messageInput.value || 'OMELET';
            const characters = Array.from(message);
            if (currentLetterIndex >= characters.length) {
                currentLetterIndex = 0;
            }
            // Recalculate optimal size for new message
            optimalFontSize = calculateOptimalFontSize(message);
        }
        updateDisplay();
    }
});

// Initialize with static mode
setMode('static');

// Debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
    if (displayArea.classList.contains('active')) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            log('Window resized, recalculating display');
            updateDisplay();
        }, 250);
    }
});