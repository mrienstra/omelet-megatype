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
const letterSpacingControl = document.getElementById('letterSpacingControl');
const letterSpacingSlider = document.getElementById('letterSpacingSlider');
const letterSpacingValue = document.getElementById('letterSpacingValue');
const fontSelect = document.getElementById('fontSelect');
const measurementCanvas = document.createElement('canvas');
const measurementCtx = measurementCanvas.getContext('2d');
const scrollCanvas = document.createElement('canvas');
const scrollCtx = scrollCanvas.getContext('2d');
const scalingModeControl = document.getElementById('scalingModeControl');
const fitBtn = document.getElementById('fitBtn');
const fillBtn = document.getElementById('fillBtn');
const perLetterScalingControl = document.getElementById('perLetterScalingControl');
const perLetterScaling = document.getElementById('perLetterScaling');
const independentScalingControl = document.getElementById('independentScalingControl');
const independentScaling = document.getElementById('independentScaling');
const debugLogging = document.getElementById('debugLogging');

// Config flags
const DEBUG_SETTINGS_PERSISTENCE = false; // Set to true to debug localStorage save/load

let currentMode = 'static';
let currentLetterIndex = 0;
let slideshowInterval = null;
let scrollAnimationId = null;
let scrollOffset = 0;
let optimalFontSize = 100; // vmin value where largest char fits perfectly
let optimalFontUnit = 'vmin'; // unit to use for optimal font size
let scalingMode = 'fit'; // 'fit', 'fill', or 'balanced'
let messageWideScaleFactors = { scaleX: 1, scaleY: 1 }; // For independent scaling without per-letter
let isLoadingSettings = false; // Flag to prevent saving during initial load

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
// If sharedScaleFactors is provided, use those instead of calculating per-letter
function renderCanvasWithIndependentScale(text, fontSizePx, fontFamily, fontWeight, scaleMultiplier, sharedScaleFactors = null) {
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

    let scaleX, scaleY;

    if (sharedScaleFactors) {
        // Use pre-calculated scale factors (message-wide mode)
        scaleX = sharedScaleFactors.scaleX * scaleMultiplier;
        scaleY = sharedScaleFactors.scaleY * scaleMultiplier;
        log(`Using shared scale factors: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)} (multiplier: ${scaleMultiplier.toFixed(2)})`);
    } else {
        // Calculate scale factors for this specific letter (per-letter mode)
        const baseScaleX = rect.width / textWidth;
        const baseScaleY = rect.height / textHeight;
        scaleX = baseScaleX * scaleMultiplier;
        scaleY = baseScaleY * scaleMultiplier;
        log(`Independent scaling: text bbox ${textWidth.toFixed(2)}x${textHeight.toFixed(2)}px -> viewport ${rect.width.toFixed(2)}x${rect.height.toFixed(2)}px`);
        log(`Scale factors: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)} (multiplier: ${scaleMultiplier.toFixed(2)})`);
    }

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

    // Use selected font with bold weight
    const fontFamily = fontSelect.value;
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
    } else { // 'fill'
        // Fill: constrained by whichever dimension hits the edge last (the smaller ratio)
        constraintRatio = Math.min(widthRatio, heightRatio);
        unit = 'vmax';
        log(`FILL mode: constrained by ${widthRatio < heightRatio ? 'WIDTH' : 'HEIGHT'}`);
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
    saveSettings();
});

// Update font size display
fontSizeSlider.addEventListener('input', () => {
    fontSizeValue.textContent = fontSizeSlider.value;
    if (displayArea.classList.contains('active')) {
        updateDisplay();
    }
    saveSettings();
});

// Update letter spacing display
letterSpacingSlider.addEventListener('input', () => {
    letterSpacingValue.textContent = letterSpacingSlider.value;
    if (displayArea.classList.contains('active') && currentMode === 'scroll') {
        prepareScrollCanvas();
    }
    saveSettings();
});

// Font selection
fontSelect.addEventListener('change', () => {
    if (DEBUG_SETTINGS_PERSISTENCE) console.log('Font changed to:', fontSelect.value);
    if (displayArea.classList.contains('active')) {
        // Recalculate optimal size for new font
        const message = messageInput.value || 'OMELET';
        optimalFontSize = calculateOptimalFontSize(message);
        updateDisplay();
    }
    saveSettings();
});

// Mode buttons
function setMode(mode) {
    currentMode = mode;
    [staticBtn, scrollBtn, slideshowBtn].forEach(btn => btn.classList.remove('active'));

    if (mode === 'static') {
        staticBtn.classList.add('active');
        speedControl.style.display = 'none';
        letterSpacingControl.style.display = 'none';
        scalingModeControl.style.display = 'none';
        perLetterScalingControl.style.display = 'none';
        independentScalingControl.style.display = 'none';
        displayArea.classList.remove('slideshow');
    } else if (mode === 'scroll') {
        scrollBtn.classList.add('active');
        speedControl.style.display = 'block';
        letterSpacingControl.style.display = 'block';
        scalingModeControl.style.display = 'block';
        perLetterScalingControl.style.display = 'block';
        independentScalingControl.style.display = 'block';
        displayArea.classList.remove('slideshow');
    } else if (mode === 'slideshow') {
        slideshowBtn.classList.add('active');
        speedControl.style.display = 'block';
        letterSpacingControl.style.display = 'none';
        scalingModeControl.style.display = 'block';
        perLetterScalingControl.style.display = 'block';
        independentScalingControl.style.display = 'block';
        displayArea.classList.add('slideshow');
    }

    if (displayArea.classList.contains('active')) {
        updateDisplay();
    }
    saveSettings();
}

staticBtn.addEventListener('click', () => setMode('static'));
scrollBtn.addEventListener('click', () => setMode('scroll'));
slideshowBtn.addEventListener('click', () => setMode('slideshow'));

// Scaling mode buttons
function setScalingMode(mode) {
    scalingMode = mode;
    [fitBtn, fillBtn].forEach(btn => btn.classList.remove('active'));

    if (mode === 'fit') {
        fitBtn.classList.add('active');
    } else if (mode === 'fill') {
        fillBtn.classList.add('active');
    }

    // Recalculate if display is active and in a mode that uses scaling
    if (displayArea.classList.contains('active') && (currentMode === 'slideshow' || currentMode === 'scroll')) {
        const message = messageInput.value || 'OMELET';
        optimalFontSize = calculateOptimalFontSize(message);
        if (currentMode === 'slideshow') {
            renderSlideshow();
        } else if (currentMode === 'scroll') {
            prepareScrollCanvas();
        }
    }
    saveSettings();
}

fitBtn.addEventListener('click', () => setScalingMode('fit'));
fillBtn.addEventListener('click', () => setScalingMode('fill'));

// Per-letter scaling checkbox
perLetterScaling.addEventListener('change', () => {
    if (displayArea.classList.contains('active') && (currentMode === 'slideshow' || currentMode === 'scroll')) {
        if (currentMode === 'slideshow') {
            renderSlideshow();
        } else if (currentMode === 'scroll') {
            prepareScrollCanvas();
        }
    }
    saveSettings();
});

// Independent scaling checkbox
independentScaling.addEventListener('change', () => {
    if (displayArea.classList.contains('active') && (currentMode === 'slideshow' || currentMode === 'scroll')) {
        if (currentMode === 'slideshow') {
            renderSlideshow();
        } else if (currentMode === 'scroll') {
            prepareScrollCanvas();
        }
    }
    saveSettings();
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
    saveSettings();
});

bgColorInput.addEventListener('input', () => {
    // Update theme color for status bar
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', bgColorInput.value);
    }

    if (displayArea.classList.contains('active')) {
        // Re-render current mode
        if (currentMode === 'static') {
            renderStatic(messageInput.value || 'OMELET');
        } else if (currentMode === 'slideshow') {
            renderSlideshow();
        }
        // Scroll mode continuously redraws, so no action needed
    }
    saveSettings();
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

// Click anywhere on display area to return to controls
displayArea.addEventListener('click', (e) => {
    // Only hide if clicking the display area itself, not its children
    if (e.target === displayArea || e.target === displayCanvas) {
        hideDisplay();
    }
});

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
        optimalFontSize = calculateOptimalFontSize(message);
        scrollOffset = 0;
        prepareScrollCanvas();
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
    const fontFamily = fontSelect.value;
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

// Prepare scroll canvas with all letters rendered
function prepareScrollCanvas() {
    const message = messageInput.value || 'OMELET';
    const fontSizeMultiplier = fontSizeSlider.value / 100;
    const fontFamily = fontSelect.value;
    const fontWeight = 'bold';
    const letterSpacing = parseInt(letterSpacingSlider.value);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const vmin = Math.min(vw, vh);
    const vmax = Math.max(vw, vh);
    const rect = displayCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Calculate message-wide scale factors if needed (for independent scaling without per-letter)
    let sharedScaleFactors = null;
    if (independentScaling.checked && !perLetterScaling.checked) {
        const baseFontSizePx = optimalFontUnit === 'vmax'
            ? (optimalFontSize * vmax) / 100
            : (optimalFontSize * vmin) / 100;

        const uniqueChars = [...new Set(Array.from(message))];
        measurementCtx.font = `${fontWeight} ${baseFontSizePx}px ${fontFamily}`;

        let maxWidth = 0;
        let maxHeight = 0;

        uniqueChars.forEach(char => {
            const metrics = measurementCtx.measureText(char);
            const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
            const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
            maxWidth = Math.max(maxWidth, width);
            maxHeight = Math.max(maxHeight, height);
        });

        const baseScaleX = rect.width / maxWidth;
        const baseScaleY = rect.height / maxHeight;
        sharedScaleFactors = { scaleX: baseScaleX, scaleY: baseScaleY };
    }

    // Calculate total width needed for all characters
    const characters = Array.from(message);
    let totalWidth = 0;
    const charData = [];

    characters.forEach(char => {
        // Determine size for this character
        let charFontSizePx;
        let charOptimalUnit = optimalFontUnit;

        if (perLetterScaling.checked) {
            const charOptimalSize = calculateOptimalFontSize(char);
            charOptimalUnit = optimalFontUnit;
            charFontSizePx = charOptimalUnit === 'vmax'
                ? (charOptimalSize * vmax) / 100
                : (charOptimalSize * vmin) / 100;
        } else {
            charFontSizePx = optimalFontUnit === 'vmax'
                ? (optimalFontSize * vmax) / 100
                : (optimalFontSize * vmin) / 100;
        }

        // Measure character at its font size
        measurementCtx.font = `${fontWeight} ${charFontSizePx}px ${fontFamily}`;
        const metrics = measurementCtx.measureText(char);
        const charWidth = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
        const charHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

        // Calculate scale factors
        let scaleX, scaleY;
        if (independentScaling.checked) {
            if (sharedScaleFactors) {
                scaleX = sharedScaleFactors.scaleX * fontSizeMultiplier;
                scaleY = sharedScaleFactors.scaleY * fontSizeMultiplier;
            } else {
                scaleX = (rect.width / charWidth) * fontSizeMultiplier;
                scaleY = (rect.height / charHeight) * fontSizeMultiplier;
            }
        } else {
            // For uniform scaling, the optimal font size already accounts for fit/fill constraints
            // We just apply the font size multiplier, no additional scaling needed
            scaleX = fontSizeMultiplier;
            scaleY = fontSizeMultiplier;
        }

        const scaledWidth = charWidth * scaleX;
        const scaledHeight = charHeight * scaleY;

        charData.push({
            char,
            fontSizePx: charFontSizePx,
            charWidth,
            charHeight,
            scaleX,
            scaleY,
            scaledWidth,
            scaledHeight,
            metrics,
            x: totalWidth
        });

        totalWidth += scaledWidth + letterSpacing;
    });

    // Set up scroll canvas size
    scrollCanvas.width = (totalWidth + rect.width) * dpr;
    scrollCanvas.height = rect.height * dpr;

    // Reset transform and apply DPR scaling
    scrollCtx.setTransform(1, 0, 0, 1, 0, 0); // Reset to identity
    scrollCtx.scale(dpr, dpr);

    // Clear scroll canvas
    scrollCtx.clearRect(0, 0, totalWidth + rect.width, rect.height);

    // Render all characters to scroll canvas
    charData.forEach(data => {
        scrollCtx.save();

        const translateY = rect.height / 2;
        scrollCtx.translate(data.x, translateY);
        scrollCtx.scale(data.scaleX, data.scaleY);

        scrollCtx.font = `${fontWeight} ${data.fontSizePx}px ${fontFamily}`;
        scrollCtx.fillStyle = textColorInput.value;
        scrollCtx.textBaseline = 'alphabetic';

        // Position text: left edge at x=0, vertically centered at y=0
        // For x: we want the left edge of the bounding box at 0
        const x = data.metrics.actualBoundingBoxLeft;

        // For y: we've already translated to the vertical center, so we need the baseline position
        // that centers the text at y=0
        // Top of text: y - ascent, Bottom: y + descent
        // For center at 0: (y - ascent + y + descent) / 2 = 0
        // So: y = (ascent - descent) / 2
        const y = (data.metrics.actualBoundingBoxAscent - data.metrics.actualBoundingBoxDescent) / 2;

        scrollCtx.fillText(data.char, x, y);

        scrollCtx.restore();
    });

    return totalWidth;
}

function renderScroll() {
    const rect = displayCanvas.getBoundingClientRect();
    const bgColor = bgColorInput.value;
    const dpr = window.devicePixelRatio || 1;

    // Clear display canvas
    displayCtx.fillStyle = bgColor;
    displayCtx.fillRect(0, 0, rect.width, rect.height);

    // Draw scroll canvas at offset
    // Start text from the right side of the screen and scroll left
    // Specify destination dimensions in CSS pixels to account for DPR scaling on displayCtx
    const scrollCanvasWidthCSS = scrollCanvas.width / dpr;
    const scrollCanvasHeightCSS = scrollCanvas.height / dpr;
    displayCtx.drawImage(
        scrollCanvas,
        rect.width - scrollOffset, 0,  // destination x, y in CSS space
        scrollCanvasWidthCSS, scrollCanvasHeightCSS  // destination width, height in CSS space
    );

    // Calculate scroll speed based on slider
    const speed = speedSlider.value;
    const pixelsPerFrame = speed * 2; // Increased from 0.5 to 2 for faster scrolling

    // Update scroll offset
    scrollOffset += pixelsPerFrame;

    // Reset when text has scrolled off screen
    const totalWidth = scrollCanvas.width / (window.devicePixelRatio || 1);
    if (scrollOffset > totalWidth) {
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
    const fontFamily = fontSelect.value;
    const fontWeight = 'bold';

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const vmin = Math.min(vw, vh);
    const vmax = Math.max(vw, vh);
    const rect = displayCanvas.getBoundingClientRect();

    // Check if independent scaling is enabled
    if (independentScaling.checked) {
        // Independent scaling uses a different approach:
        // Calculate base size per-letter or message-wide, but render with independent X/Y scaling
        let baseFontSizePx;
        let sharedScaleFactors = null;

        if (perLetterScaling.checked) {
            // Calculate optimal size for just this letter, then use that as base for independent scaling
            const letterOptimalSize = calculateOptimalFontSize(letter);
            const letterOptimalUnit = optimalFontUnit;
            log(`Independent H/V + Per-letter: "${letter}" gets its own calculation (${letterOptimalSize.toFixed(2)}${letterOptimalUnit})`);
            baseFontSizePx = letterOptimalUnit === 'vmax'
                ? (letterOptimalSize * vmax) / 100
                : (letterOptimalSize * vmin) / 100;
            // No shared scale factors - each letter calculates its own
        } else {
            // Use the message-wide optimal size as base
            log(`Independent H/V only: "${letter}" uses message-wide size (${optimalFontSize.toFixed(2)}${optimalFontUnit})`);
            baseFontSizePx = optimalFontUnit === 'vmax'
                ? (optimalFontSize * vmax) / 100
                : (optimalFontSize * vmin) / 100;

            // Calculate shared scale factors based on the largest characters in the message
            // Measure all unique characters at the base font size
            const uniqueChars = [...new Set(Array.from(message))];
            measurementCtx.font = `${fontWeight} ${baseFontSizePx}px ${fontFamily}`;

            let maxWidth = 0;
            let maxHeight = 0;

            uniqueChars.forEach(char => {
                const metrics = measurementCtx.measureText(char);
                const width = metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight;
                const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
                maxWidth = Math.max(maxWidth, width);
                maxHeight = Math.max(maxHeight, height);
            });

            // Calculate scale factors based on largest dimensions
            const baseScaleX = rect.width / maxWidth;
            const baseScaleY = rect.height / maxHeight;
            sharedScaleFactors = { scaleX: baseScaleX, scaleY: baseScaleY };

            log(`Message-wide scale factors calculated: X=${baseScaleX.toFixed(4)} (viewport ${rect.width.toFixed(2)} / max width ${maxWidth.toFixed(2)}), Y=${baseScaleY.toFixed(4)} (viewport ${rect.height.toFixed(2)} / max height ${maxHeight.toFixed(2)})`);
        }

        renderCanvasWithIndependentScale(letter, baseFontSizePx, fontFamily, fontWeight, fontSizeMultiplier, sharedScaleFactors);
    } else {
        // Normal uniform scaling
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
        } else if (currentMode === 'scroll') {
            const message = messageInput.value || 'OMELET';
            // Recalculate optimal size for new message
            optimalFontSize = calculateOptimalFontSize(message);
        }
        updateDisplay();
    }
    saveSettings();
});

// Debug logging checkbox
debugLogging.addEventListener('change', () => {
    saveSettings();
});

// Load settings on startup (must be before setMode to avoid overwriting saved settings)
loadSettings();

// Initialize theme color to match background color
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
if (themeColorMeta) {
    themeColorMeta.setAttribute('content', bgColorInput.value);
}

// Initialize with static mode (only if no saved mode was loaded)
if (!localStorage.getItem('omeletSettings')) {
    setMode('static');
}

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

// LocalStorage persistence
function saveSettings() {
    if (isLoadingSettings) {
        if (DEBUG_SETTINGS_PERSISTENCE) console.log('Skipping save - currently loading settings');
        return; // Don't save while loading
    }

    const settings = {
        message: messageInput.value,
        mode: currentMode,
        textColor: textColorInput.value,
        bgColor: bgColorInput.value,
        speed: speedSlider.value,
        fontSize: fontSizeSlider.value,
        letterSpacing: letterSpacingSlider.value,
        font: fontSelect.value,
        scalingMode: scalingMode,
        perLetterScaling: perLetterScaling.checked,
        independentScaling: independentScaling.checked,
        debugLogging: debugLogging.checked
    };
    if (DEBUG_SETTINGS_PERSISTENCE) console.log('Saving settings to localStorage:', settings);
    localStorage.setItem('omeletSettings', JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem('omeletSettings');
    if (!savedSettings) {
        console.log('No saved settings found in localStorage');
        return;
    }

    try {
        isLoadingSettings = true; // Prevent saving during load

        const settings = JSON.parse(savedSettings);
        console.log('Loading settings from localStorage:', settings);

        // Restore values
        if (settings.message) {
            messageInput.value = settings.message;
            console.log('Restored message:', settings.message);
        }
        if (settings.textColor) {
            textColorInput.value = settings.textColor;
            console.log('Restored text color:', settings.textColor);
        }
        if (settings.bgColor) {
            bgColorInput.value = settings.bgColor;
            // Update theme color for status bar
            const themeColorMeta = document.querySelector('meta[name="theme-color"]');
            if (themeColorMeta) {
                themeColorMeta.setAttribute('content', settings.bgColor);
            }
            console.log('Restored bg color:', settings.bgColor);
        }
        if (settings.speed) {
            speedSlider.value = settings.speed;
            speedValue.textContent = settings.speed;
            console.log('Restored speed:', settings.speed);
        }
        if (settings.fontSize) {
            fontSizeSlider.value = settings.fontSize;
            fontSizeValue.textContent = settings.fontSize;
            console.log('Restored font size:', settings.fontSize);
        }
        if (settings.letterSpacing !== undefined) {
            letterSpacingSlider.value = settings.letterSpacing;
            letterSpacingValue.textContent = settings.letterSpacing;
            console.log('Restored letter spacing:', settings.letterSpacing);
        }
        if (settings.font) {
            fontSelect.value = settings.font;
            console.log('Restored font:', settings.font);
        }
        if (settings.scalingMode) {
            console.log('Restoring scaling mode:', settings.scalingMode);
            setScalingMode(settings.scalingMode);
        }
        if (settings.perLetterScaling !== undefined) {
            perLetterScaling.checked = settings.perLetterScaling;
            console.log('Restored per-letter scaling:', settings.perLetterScaling);
        }
        if (settings.independentScaling !== undefined) {
            independentScaling.checked = settings.independentScaling;
            console.log('Restored independent scaling:', settings.independentScaling);
        }
        if (settings.debugLogging !== undefined) {
            debugLogging.checked = settings.debugLogging;
            console.log('Restored debug logging:', settings.debugLogging);
        }
        if (settings.mode) {
            console.log('Restoring mode:', settings.mode);
            setMode(settings.mode);
        }

        console.log('Settings loaded successfully');
    } catch (e) {
        console.error('Failed to load settings:', e);
    } finally {
        isLoadingSettings = false; // Re-enable saving
        console.log('Finished loading settings, isLoadingSettings =', isLoadingSettings);
    }
}

// Register service worker for offline support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered successfully:', registration.scope);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}