// ============================================================================
// STRING SECTION POSITION TEMPLATES
// ============================================================================
// This file defines master positioning templates for all string sections:
//
// VIOLIN TEMPLATES:
// -----------------
// 1. REGULAR MASTER (violinPositionTemplates['12-12'])
//    - Used when concert grand piano is NOT on stage
//    - Positions for up to 12 violin 1 and 12 violin 2
//    - All configurations use the first N positions from this master template
//
// 2. CONCERT GRAND MASTER (concertGrandViolinTemplates['12-12'])
//    - Used when concert grand piano IS on stage
//    - Optimized positioning to accommodate the piano
//    - All "piano out" configurations use the first N positions from this template
//
// VIOLA, CELLO, BASS TEMPLATES:
// ------------------------------
// - Single master template for each section (violaPositionTemplates, celloPositionTemplates, bassPositionTemplates)
// - All configurations use first N positions from these arrays
// - Auto-shifts 45px upstage when concert grand is enabled
//
// HOW IT WORKS:
// =============
// - 6 violas → uses first 6 positions from violaPositionTemplates
// - 8 cellos → uses first 8 positions from celloPositionTemplates
// - 4 basses → uses first 4 positions from bassPositionTemplates
// - 10 violin 1, 10 violin 2 → uses first 10 from each violin array
//
// TO UPDATE POSITIONS:
// ====================
// Step 1: Build your desired configuration (with or without concert grand)
// Step 2: Position all players manually in that section
// Step 3: Enable Debug Mode (checkbox in UI) to see all positions
// Step 4: Copy the position data from the debug readout
// Step 5: Update the appropriate master template below
// ============================================================================

// Concert Grand Piano Templates (used when piano is enabled)
// ============================================================
// MASTER "PIANO OUT" TEMPLATE: All configurations use first N positions from this 12-12 template
// ============================================================
const concertGrandViolinTemplates = {
    '12-12': {
        violin1: [
            { x: 376.4, y: 591.3 },  // violin1-1
            { x: 386.8, y: 546.5 },  // violin1-2
            { x: 324.9, y: 588.0 },  // violin1-3
            { x: 335.8, y: 544.8 },  // violin1-4
            { x: 273.2, y: 588.4 },  // violin1-5
            { x: 284.5, y: 544.3 },  // violin1-6
            { x: 221.3, y: 586.4 },  // violin1-7
            { x: 233.0, y: 543.4 },  // violin1-8
            { x: 297.2, y: 501.8 },  // violin1-9
            { x: 323.5, y: 465.9 },  // violin1-10
            { x: 244.3, y: 500.5 },  // violin1-11
            { x: 266.6, y: 462.1 }   // violin1-12
        ],
        violin2: [
            { x: 426.9, y: 520.0 },  // violin2-1
            { x: 468.5, y: 503.4 },  // violin2-2
            { x: 356.0, y: 505.2 },  // violin2-3
            { x: 385.0, y: 471.5 },  // violin2-4
            { x: 427.0, y: 456.1 },  // violin2-5
            { x: 471.6, y: 452.8 },  // violin2-6
            { x: 350.8, y: 430.9 },  // violin2-7
            { x: 390.7, y: 411.0 },  // violin2-8
            { x: 434.2, y: 401.5 },  // violin2-9
            { x: 478.2, y: 395.2 },  // violin2-10
            { x: 313.6, y: 395.0 },  // violin2-11
            { x: 356.5, y: 372.7 }   // violin2-12
        ]
    }
};

// Regular Templates (used when piano is NOT on stage)
// ============================================================
// MASTER TEMPLATE: All violin counts use first N positions from this 12-12 template
// ============================================================
const violinPositionTemplates = {
    '12-12': {
        violin1: [
            { x: 394.6, y: 614.6 },  // violin1-1
            { x: 398.5, y: 570.1 },  // violin1-2
            { x: 342.9, y: 613.9 },  // violin1-3
            { x: 347.9, y: 569.7 },  // violin1-4
            { x: 290.6, y: 608.0 },  // violin1-5
            { x: 296.8, y: 564.0 },  // violin1-6
            { x: 239.8, y: 599.4 },  // violin1-7
            { x: 245.9, y: 554.7 },  // violin1-8
            { x: 298.0, y: 519.0 },  // violin1-9
            { x: 320.4, y: 478.6 },  // violin1-10
            { x: 247.0, y: 509.9 },  // violin1-11
            { x: 270.0, y: 472.0 }   // violin1-12
        ],
        violin2: [
            { x: 436.4, y: 544.7 },  // violin2-1
            { x: 478.3, y: 529.2 },  // violin2-2
            { x: 361.9, y: 527.5 },  // violin2-3
            { x: 391.4, y: 493.7 },  // violin2-4
            { x: 433.9, y: 479.8 },  // violin2-5
            { x: 477.3, y: 470.3 },  // violin2-6
            { x: 356.9, y: 453.2 },  // violin2-7
            { x: 394.3, y: 429.3 },  // violin2-8
            { x: 435.7, y: 413.3 },  // violin2-9
            { x: 479.4, y: 405.8 },  // violin2-10
            { x: 325.0, y: 410.4 },  // violin2-11
            { x: 364.0, y: 387.1 }   // violin2-12
        ]
    }
};

// Viola, Cello, and Bass Templates
// ============================================================
// Master templates for viola, cello, and bass sections
// All configurations use first N positions from these arrays
// ============================================================

const violaPositionTemplates = [
    { x: 523.3, y: 517.5 },  // viola-1
    { x: 566.6, y: 528.7 },  // viola-2
    { x: 522.5, y: 460.0 },  // viola-3
    { x: 565.2, y: 472.5 },  // viola-4
    { x: 605.1, y: 491.9 },  // viola-5
    { x: 641.2, y: 518.2 },  // viola-6
    { x: 523.9, y: 398.0 },  // viola-7
    { x: 566.9, y: 408.9 },  // viola-8
    { x: 606.0, y: 430.1 },  // viola-9
    { x: 642.2, y: 455.7 },  // viola-10
    { x: 634.2, y: 386.8 },  // viola-11
    { x: 673.0, y: 411.6 }   // viola-12
];

const celloPositionTemplates = [
    { x: 598.8, y: 633.8 },  // cello-1
    { x: 598.2, y: 570.3 },  // cello-2
    { x: 657.4, y: 635.3 },  // cello-3
    { x: 656.9, y: 570.3 },  // cello-4
    { x: 716.0, y: 634.3 },  // cello-5
    { x: 715.5, y: 570.6 },  // cello-6
    { x: 774.6, y: 634.8 },  // cello-7
    { x: 774.1, y: 569.8 }   // cello-8
];

const bassPositionTemplates = [
    { x: 766.5, y: 506.7 },  // bass-1
    { x: 760.3, y: 448.4 },  // bass-2
    { x: 755.2, y: 390.0 },  // bass-3
    { x: 737.9, y: 333.9 },  // bass-4
    { x: 702.5, y: 287.2 },  // bass-5
    { x: 655.3, y: 252.4 }   // bass-6
];

// Note: getViolinPositions() is defined in players.js
// Template data objects above are used directly by that function.
