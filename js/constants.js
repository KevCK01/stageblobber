// ============================================
// CONSTANTS - Scale, dimensions, and configs
// ============================================

// Scale Constants for Real-World Measurements
const PIXELS_PER_FOOT = 15;                    // 15 pixels = 1 foot
const STAGE_DOWNSTAGE_WIDTH_FEET = 42;         // 42 feet wide downstage
const STAGE_UPSTAGE_WIDTH_FEET = 35;           // 35 feet wide upstage
const STAGE_DEPTH_FEET = 39;                   // 39 feet deep stage

// Podium dimensions and space calculation
const PODIUM_MAIN_SQFT = (50 * 50) / 144;      // 50" x 50" main podium = 17.36 sq ft
const PODIUM_STEP_SQFT = (27 * 13) / 144;      // 27" x 13" step = 2.44 sq ft
const PODIUM_TOTAL_SQFT = PODIUM_MAIN_SQFT + PODIUM_STEP_SQFT;  // 19.8 sq ft

const TOTAL_STAGE_SPACE = ((STAGE_DOWNSTAGE_WIDTH_FEET + STAGE_UPSTAGE_WIDTH_FEET) * STAGE_DEPTH_FEET / 2) - PODIUM_TOTAL_SQFT;

// SVG canvas dimensions
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 940;

// Snap-to functionality for risers
const SNAP_DISTANCE = 15;   // pixels - distance within which risers will snap (15px = 1 foot)
const SNAP_TOLERANCE = 15;  // pixels - how close alignment needs to be

// Riser size configurations (15 pixels = 1 foot)
const riserConfigs = {
    '8x4': { width: 120, height: 60, fill: '#4a5568', stroke: '#2d3748', name: 'RISER' },
    '4x4': { width: 60, height: 60, fill: '#4a5568', stroke: '#2d3748', name: 'RISER' },
    '8x3': { width: 120, height: 45, fill: '#4a5568', stroke: '#2d3748', name: 'RISER' }
};

// Instrument category lists
const staticInstruments = ['violin1', 'violin2', 'viola', 'cello', 'bass', 'flute', 'oboe', 'clarinet', 'bassoon', 'horn', 'trumpet', 'trombone', 'tuba'];
const WOODWIND_INSTRUMENTS = ['flute', 'oboe', 'clarinet', 'bassoon', 'saxophone'];
const BRASS_INSTRUMENTS = ['horn', 'trumpet', 'cornet', 'trombone', 'tuba'];
const PERCUSSION_INSTRUMENTS = ['timpani', 'snare', 'xylophone', 'marimba', 'cymbals', 'vibraphone', 'glockenspiel', 'chimes', 'bassDrum', 'cymbal', 'hihat'];
const KEYBOARD_INSTRUMENTS = ['piano', 'celeste', 'harpsichord', 'keyboard', 'harp'];

// Percussion blob constants
const BLOB_MIN_POINTS = 6;
const BLOB_DEFAULT_POINTS = 8;
const BLOB_AREA_TOLERANCE = 2;
const PIXELS_PER_SQFT = PIXELS_PER_FOOT * PIXELS_PER_FOOT; // 225 sq pixels per sq ft

// Utility functions for scale conversion
function feetToPixels(feet) {
    return feet * PIXELS_PER_FOOT;
}

function pixelsToFeet(pixels) {
    return pixels / PIXELS_PER_FOOT;
}

function sqftToRadius(sqft) {
    const areaInPixels = sqft * PIXELS_PER_FOOT * PIXELS_PER_FOOT;
    const radius = Math.sqrt(areaInPixels / Math.PI);
    return Math.max(6, Math.min(120, radius));
}

function calculatePlayerRadius(instrumentType) {
    const sqftElement = document.getElementById(instrumentType + '_sqft');
    if (!sqftElement) return 12;
    const sqft = parseFloat(sqftElement.value) || 8;
    return sqftToRadius(sqft);
}

function getAllInstruments() {
    return [...staticInstruments, ...dynamicInstruments];
}
