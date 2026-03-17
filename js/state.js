// ============================================
// STATE - All global application state
// ============================================

// Instrument management
let dynamicInstruments = [];
let nextInstrumentId = 1;
let customInstrumentContainers = {};

// Drag and drop
let isDragging = false;
let draggedElement = null;
let draggedLabel = null;
let dragOffset = { x: 0, y: 0 };
let customPositions = {};
let originalPositions = {};
let preDragPositions = {}; // Store player positions before drag for undo
let preDragState = null; // Store any object state before drag for undo
let justFinishedDrag = false; // Flag to prevent click after drag
let debugMode = false;
let collisionDetectionEnabled = true;
let useDefaultSeating = true;
let useDefaultWoodwindSeating = true;
let useDefaultBrassSeating = true;

// Multi-select
let selectedPlayers = new Set();
let selectedRisers = new Set();
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionRect = null;
let isGroupDragging = false;
let isGroupDraggingRisers = false;
let groupDragOffsets = new Map();
let groupDragLabels = new Map();
let groupRiserDragOffsets = new Map();

// Keyboard navigation
let selectedObject = null;
let selectedObjectType = null; // 'player', 'podium', 'timpani-riser', 'brass-riser', etc.

// Podium
let podiumPosition = { x: 500, y: 633.75 };
let podiumOriginalY = 633.75;
let podiumDragging = false;
let podiumDragOffset = { x: 0, y: 0 };

// Concert Grand Piano
let concertGrandEnabled = false;
let concertGrandPosition = { x: 500, y: 705 };
let concertGrandDragging = false;
let concertGrandDragOffset = { x: 0, y: 0 };

// Chorus
let chorusEnabled = false;
let chorusRows = 1;
let chorusRisers = [];
let chorusSingers = [];
let chorusSingersPerRow = [];
let savedRiserStates = null; // Store riser states before chorus mode

// Timpani riser
let timpaniRiserPosition = { x: 260, y: 95 };
let timpaniRiserDragging = false;
let timpaniRiserDragOffset = { x: 0, y: 0 };

// Brass risers
let brassRiserPositions = {
    'brass-riser-1': { x: 380, y: 95 },
    'brass-riser-2': { x: 500, y: 95 },
    'brass-riser-3': { x: 620, y: 95 },
    'brass-riser-4': { x: 380, y: 155 },
    'brass-riser-5': { x: 500, y: 155 }
};
let brassRiserDragging = false;
let currentBrassRiser = null;
let brassRiserDragOffset = { x: 0, y: 0 };

// Woodwind risers
let woodwindRiserPositions = {
    'woodwind-riser-1': { x: 380, y: 245 },
    'woodwind-riser-2': { x: 500, y: 245 },
    'woodwind-riser-3': { x: 380, y: 305 },
    'woodwind-riser-4': { x: 500, y: 305 }
};
let woodwindRiserDragging = false;
let currentWoodwindRiser = null;
let woodwindRiserDragOffset = { x: 0, y: 0 };

// Extra risers (user-added)
let extraRisers = [];

// Percussion blob
let percussionBlob = {
    enabled: true,
    targetArea: 0,
    actualArea: 0,
    center: { x: 200, y: 200 },
    controlPoints: [],
    isDragging: false,
    dragPointIndex: -1,
    dragOffset: { x: 0, y: 0 }
};
let blobMoveStart = null;
