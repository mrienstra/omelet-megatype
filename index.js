const messageInput = document.getElementById('messageInput');
const displayArea = document.getElementById('displayArea');
const displayText = document.getElementById('displayText');
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
const debugLogging = document.getElementById('debugLogging');

let currentMode = 'static';
let currentLetterIndex = 0;
let slideshowInterval = null;
let optimalFontSize = 100; // vmin value where largest char fits perfectly
let optimalFontUnit = 'vmin'; // unit to use for optimal font size
let scalingMode = 'fit'; // 'fit', 'fill', or 'balanced'

// Helper function for conditional logging
function log(...args) {
    if (debugLogging.checked) {
        console.log(...args);
    }
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

    // Get computed font family from the display element
    const computedStyle = window.getComputedStyle(displayText);
    const fontFamily = computedStyle.fontFamily || 'sans-serif';
    const fontWeight = computedStyle.fontWeight || 'bold';

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
    if (currentMode === 'scroll') {
        updateScrollSpeed();
    } else if (currentMode === 'slideshow' && displayArea.classList.contains('active')) {
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
        displayArea.classList.remove('slideshow');
    } else if (mode === 'scroll') {
        scrollBtn.classList.add('active');
        speedControl.style.display = 'block';
        scalingModeControl.style.display = 'none';
        displayArea.classList.remove('slideshow');
    } else if (mode === 'slideshow') {
        slideshowBtn.classList.add('active');
        speedControl.style.display = 'block';
        scalingModeControl.style.display = 'block';
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
        updateSlideshowLetter(message);
    }
}

fitBtn.addEventListener('click', () => setScalingMode('fit'));
fillBtn.addEventListener('click', () => setScalingMode('fill'));
balancedBtn.addEventListener('click', () => setScalingMode('balanced'));

// Color controls
textColorInput.addEventListener('input', updateColors);
bgColorInput.addEventListener('input', updateColors);

function updateColors() {
    displayArea.style.color = textColorInput.value;
    displayArea.style.background = bgColorInput.value;
}

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
    updateColors();
}

function hideDisplay() {
    displayArea.classList.remove('active');
    controls.style.display = 'block';
    showBtn.textContent = 'Show Display';
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
}

function updateDisplay() {
    const message = messageInput.value || 'OMELET';
    const fontSizeMultiplier = fontSizeSlider.value / 100; // 0.01 to 2.0
    
    if (currentMode === 'static') {
        displayText.innerHTML = message;
        const baseFontSize = calculateBaseFontSize(message);
        displayText.style.fontSize = `calc(${baseFontSize} * ${fontSizeMultiplier * 2.5})`;
        displayText.className = 'display-text';
    } else if (currentMode === 'scroll') {
        displayText.innerHTML = `<div class="scrolling-container"><div class="scrolling-text">${message}</div></div>`;
        displayText.style.fontSize = `calc(15vmin * ${fontSizeMultiplier * 2.5})`;
        displayText.className = 'display-text';
        updateScrollSpeed();
    } else if (currentMode === 'slideshow') {
        // Calculate optimal size for this message
        optimalFontSize = calculateOptimalFontSize(message);
        currentLetterIndex = 0;
        updateSlideshowLetter(message);
        startSlideshow(); // Auto-start slideshow
    }
}

function calculateBaseFontSize(text) {
    const length = text.length;
    if (length <= 3) return '35vmin';
    if (length <= 6) return '25vmin';
    if (length <= 10) return '18vmin';
    if (length <= 15) return '12vmin';
    if (length <= 25) return '10vmin';
    if (length <= 40) return '7vmin';
    return '5vmin';
}

function updateScrollSpeed() {
    const speed = speedSlider.value;
    const duration = 20 - (speed * 1.5); // 5s to 20s
    const scrollingText = document.querySelector('.scrolling-text');
    if (scrollingText) {
        scrollingText.style.animationDuration = `${duration}s`;
    }
}

function updateSlideshowLetter(message) {
    if (message.length === 0) return;
    
    const characters = Array.from(message); // Properly handle emojis and multi-byte chars
    const letter = characters[currentLetterIndex];
    const fontSizeMultiplier = fontSizeSlider.value / 100; // Slider value 100 = perfect fit, 200 = 2x
    
    const finalSize = optimalFontSize * fontSizeMultiplier;
    
    log(`Displaying "${letter}": ${finalSize.toFixed(2)}${optimalFontUnit} (optimal: ${optimalFontSize.toFixed(2)}, multiplier: ${fontSizeMultiplier})`);
    
    displayText.innerHTML = letter;
    displayText.style.fontSize = `${finalSize}${optimalFontUnit}`;
    displayText.className = 'display-text';
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
        updateSlideshowLetter(message);
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