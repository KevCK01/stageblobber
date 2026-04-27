// ============================================
// PLAYERS - Creation, dragging, section layout
// ============================================

// --- Player Orientation ---

function updatePlayerOrientation(player, playerX, playerY) {
    if (!player || player.tagName !== 'ellipse') return;

    // Explicit override takes priority (set by Additional Players orientation dropdown)
    const override = player.getAttribute('data-orientation-override');
    if (override === 'straight') {
        player.setAttribute('transform', `rotate(0 ${playerX} ${playerY})`);
        return;
    }
    if (override !== 'podium') {
        // No override — fall back to instrument-type rules
        const instrumentType = player.getAttribute('data-instrument-type');
        if (WOODWIND_INSTRUMENTS.includes(instrumentType) || BRASS_INSTRUMENTS.includes(instrumentType)) {
            player.setAttribute('transform', `rotate(0 ${playerX} ${playerY})`);
            return;
        }
    }

    const dx = podiumPosition.x - playerX;
    const dy = podiumPosition.y - playerY;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * 180 / Math.PI;
    const rotationAngle = angleDeg + 90;
    player.setAttribute('transform', `rotate(${rotationAngle} ${playerX} ${playerY})`);
}

function updateAllPlayerOrientations() {
    const allPlayers = document.querySelectorAll('.stage-plot ellipse[data-player-id]');
    allPlayers.forEach(player => {
        const cx = parseFloat(player.getAttribute('cx'));
        const cy = parseFloat(player.getAttribute('cy'));
        updatePlayerOrientation(player, cx, cy);
    });
}

// --- Player Creation ---

function createPlayer(section, className, playerId, pos, label, instrumentType, orientationOverride = null) {
    const radius = calculatePlayerRadius(instrumentType);
    const originalPos = { x: pos.x, y: pos.y };
    originalPositions[playerId] = originalPos;

    const customPos = customPositions[playerId];
    const finalPos = customPos || originalPos;

    // Cellos and basses are circles; all others are ellipses (6:7 width:height ratio)
    const useCircle = (instrumentType === 'cello' || instrumentType === 'bass');

    let player;
    if (useCircle) {
        player = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        player.setAttribute('cx', finalPos.x);
        player.setAttribute('cy', finalPos.y);
        player.setAttribute('r', radius);
    } else {
        // Same area as circle: pi*rx*ry = pi*r^2, with rx/ry = 6/7
        const rx = radius * Math.sqrt(6 / 7);
        const ry = radius * Math.sqrt(7 / 6);

        player = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        player.setAttribute('cx', finalPos.x);
        player.setAttribute('cy', finalPos.y);
        player.setAttribute('rx', rx);
        player.setAttribute('ry', ry);
        updatePlayerOrientation(player, finalPos.x, finalPos.y);
    }

    player.setAttribute('class', className);
    player.setAttribute('data-player-id', playerId);
    player.setAttribute('data-instrument-type', instrumentType);
    if (orientationOverride) {
        player.setAttribute('data-orientation-override', orientationOverride);
    }

    // Debug position highlight
    const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    highlight.setAttribute('class', 'position-highlight');
    highlight.setAttribute('cx', originalPos.x);
    highlight.setAttribute('cy', originalPos.y);
    highlight.setAttribute('r', radius + 3);
    section.appendChild(highlight);

    // Label
    const playerLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    playerLabel.setAttribute('id', `${playerId}-label`);
    playerLabel.setAttribute('class', 'player-label');
    playerLabel.setAttribute('x', finalPos.x);
    playerLabel.setAttribute('y', finalPos.y);
    playerLabel.textContent = label;

    makeDraggable(player, playerLabel, playerId);

    player.addEventListener('click', function(e) {
        if (!isDragging) {
            e.stopPropagation();
            selectObject(playerId, 'player');
        }
    });

    section.appendChild(player);
    section.appendChild(playerLabel);

    if (debugMode) updateDebugInfo();
}

// --- Player Drag ---

function makeDraggable(player, label, playerId) {
    player.addEventListener('mousedown', function(e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            togglePlayerSelection(playerId, player);
            e.preventDefault();
            return;
        }
        if (!selectedPlayers.has(playerId)) {
            clearSelection();
            addToSelection(playerId, player);
        }
        startDrag(e, player, label, playerId);
    });

    player.addEventListener('touchstart', function(e) {
        e.preventDefault();
        if (!selectedPlayers.has(playerId)) {
            clearSelection();
            addToSelection(playerId, player);
        }
        startDrag(e.touches[0], player, label, playerId);
    });
}

function startDrag(e, player, label, playerId) {
    isDragging = true;
    draggedElement = player;
    draggedLabel = label;
    isGroupDragging = selectedPlayers.size > 1;
    
    // Store positions before drag starts (for undo)
    preDragPositions = {};
    if (isGroupDragging) {
        selectedPlayers.forEach(id => {
            const p = document.querySelector(`[data-player-id="${id}"]`);
            if (p) {
                preDragPositions[id] = {
                    x: parseFloat(p.getAttribute('cx')),
                    y: parseFloat(p.getAttribute('cy'))
                };
            }
        });
    } else {
        preDragPositions[playerId] = {
            x: parseFloat(player.getAttribute('cx')),
            y: parseFloat(player.getAttribute('cy'))
        };
    }

    if (isGroupDragging) {
        selectedPlayers.forEach(id => {
            const p = document.querySelector(`[data-player-id="${id}"]`);
            if (p) p.classList.add('dragging');
        });
    } else {
        player.classList.add('dragging');
    }

    const mouse = getSvgMousePosition(e);
    const cx = parseFloat(player.getAttribute('cx'));
    const cy = parseFloat(player.getAttribute('cy'));

    dragOffset = { x: mouse.x - cx, y: mouse.y - cy };

    if (isGroupDragging) {
        groupDragOffsets.clear();
        groupDragLabels.clear();
        selectedPlayers.forEach(id => {
            const p = document.querySelector(`[data-player-id="${id}"]`);
            if (p) {
                const pcx = parseFloat(p.getAttribute('cx'));
                const pcy = parseFloat(p.getAttribute('cy'));
                groupDragOffsets.set(id, { x: mouse.x - pcx, y: mouse.y - pcy });

                const labels = document.querySelectorAll('text.player-label');
                for (let lbl of labels) {
                    const lx = parseFloat(lbl.getAttribute('x'));
                    const ly = parseFloat(lbl.getAttribute('y'));
                    if (Math.abs(lx - pcx) < 1 && Math.abs(ly - pcy) < 1) {
                        groupDragLabels.set(id, lbl);
                        break;
                    }
                }
            }
        });
    }

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
}

function handleDragMove(e) {
    if (!isDragging || !draggedElement) return;
    e.preventDefault();

    const mouse = getSvgMousePosition(e);

    if (isGroupDragging) {
        const newPositions = new Map();
        const currentPositions = new Map();
        const targetPositions = new Map();

        selectedPlayers.forEach(id => {
            const player = document.querySelector(`[data-player-id="${id}"]`);
            const offset = groupDragOffsets.get(id);
            if (player && offset) {
                const currentX = parseFloat(player.getAttribute('cx'));
                const currentY = parseFloat(player.getAttribute('cy'));
                currentPositions.set(id, { x: currentX, y: currentY });

                let targetX = Math.max(0, Math.min(SVG_WIDTH, mouse.x - offset.x));
                let targetY = Math.max(0, Math.min(SVG_HEIGHT, mouse.y - offset.y));
                targetPositions.set(id, { x: targetX, y: targetY });
            }
        });

        let groupCanMove = true;
        if (collisionDetectionEnabled) {
            for (const id of selectedPlayers) {
                const targetPos = targetPositions.get(id);
                if (targetPos && wouldCollide(id, targetPos.x, targetPos.y, selectedPlayers)) {
                    groupCanMove = false;
                    break;
                }
            }
        }

        selectedPlayers.forEach(id => {
            const player = document.querySelector(`[data-player-id="${id}"]`);
            const currentPos = currentPositions.get(id);
            const targetPos = targetPositions.get(id);
            if (player && currentPos && targetPos) {
                const finalPos = (groupCanMove || !collisionDetectionEnabled) ? targetPos : currentPos;
                player.setAttribute('cx', finalPos.x);
                player.setAttribute('cy', finalPos.y);
                updatePlayerOrientation(player, finalPos.x, finalPos.y);

                const playerLabel = groupDragLabels.get(id);
                if (playerLabel) {
                    playerLabel.setAttribute('x', finalPos.x);
                    playerLabel.setAttribute('y', finalPos.y);
                }
            }
        });
    } else {
        let newX = Math.max(0, Math.min(SVG_WIDTH, mouse.x - dragOffset.x));
        let newY = Math.max(0, Math.min(SVG_HEIGHT, mouse.y - dragOffset.y));

        const currentX = parseFloat(draggedElement.getAttribute('cx'));
        const currentY = parseFloat(draggedElement.getAttribute('cy'));
        const playerId = draggedElement.getAttribute('data-player-id');
        const validPos = findClosestValidPosition(playerId, currentX, currentY, newX, newY, new Set());

        draggedElement.setAttribute('cx', validPos.x);
        draggedElement.setAttribute('cy', validPos.y);
        updatePlayerOrientation(draggedElement, validPos.x, validPos.y);

        if (draggedLabel) {
            draggedLabel.setAttribute('x', validPos.x);
            draggedLabel.setAttribute('y', validPos.y);
        }
    }
}

function handleDragEnd(e) {
    if (isDragging && draggedElement) {
        // Store pre-drag positions before clearing
        const savedPreDragPositions = { ...preDragPositions };
        
        // Check if player actually moved (more than 2 pixels)
        let playerMoved = false;
        const playerId = draggedElement.getAttribute('data-player-id');
        if (playerId && savedPreDragPositions[playerId]) {
            const currentX = parseFloat(draggedElement.getAttribute('cx'));
            const currentY = parseFloat(draggedElement.getAttribute('cy'));
            const distance = Math.sqrt(
                Math.pow(currentX - savedPreDragPositions[playerId].x, 2) + 
                Math.pow(currentY - savedPreDragPositions[playerId].y, 2)
            );
            playerMoved = distance > 2;
        }
        
        if (isGroupDragging) {
            selectedPlayers.forEach(id => {
                const p = document.querySelector(`[data-player-id="${id}"]`);
                if (p) p.classList.remove('dragging');
            });
            selectedPlayers.forEach(id => {
                const player = document.querySelector(`[data-player-id="${id}"]`);
                if (player) {
                    customPositions[id] = {
                        x: parseFloat(player.getAttribute('cx')),
                        y: parseFloat(player.getAttribute('cy'))
                    };
                }
            });
            
            // Separate overlapping players if collision detection is enabled
            if (collisionDetectionEnabled && typeof separateOverlappingPlayers === 'function') {
                const playerIdArray = Array.from(selectedPlayers);
                separateOverlappingPlayers(playerIdArray);
            }
        } else {
            draggedElement.classList.remove('dragging');
            if (playerId) {
                customPositions[playerId] = {
                    x: parseFloat(draggedElement.getAttribute('cx')),
                    y: parseFloat(draggedElement.getAttribute('cy'))
                };
            }
        }
        
        // Push pre-drag state to undo stack AFTER updating customPositions (only if moved)
        if (playerMoved && typeof pushUndoStateWithPositions === 'function' && Object.keys(savedPreDragPositions).length > 0) {
            pushUndoStateWithPositions(savedPreDragPositions);
        }

        if (debugMode) updateDebugInfo();
        checkForOverlapWarning(); // Update overlap warning after drag
        
        // Clear selection only if player actually moved
        if (playerMoved && typeof clearSelection === 'function') {
            clearSelection();
        }
        
        preDragPositions = {}; // Clear after use
        isDragging = false;
        isGroupDragging = false;
        draggedElement = null;
        draggedLabel = null;
        dragOffset = { x: 0, y: 0 };
        groupDragOffsets.clear();
        groupDragLabels.clear();
    }

    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('touchend', handleDragEnd);
}

function resetPlayerPositions() {
    customPositions = {};
    originalPositions = {};
    clearSelection();
    resetPodiumPosition();
    resetTimpaniRiserPosition();
    resetBrassRiserPositions();
    resetWoodwindRiserPositions();
    updateStagePlot();
    if (debugMode) updateDebugInfo();
}

// --- Stage Plot Update ---
//
// IMPORTANT: updateStagePlot() is a PURE REDRAW function.
// It does NOT modify customPositions - it only reads from it.
// Each section update function checks customPositions[playerId]:
//   - If found → uses the custom position (player was manually moved)
//   - If not found → uses default/template position
//
// customPositions is managed ONLY by:
//   - handleDragEnd(): saves position when a player is dragged
//   - separateOverlappingPlayers(): saves after resolving overlaps
//   - deleteSelectedPlayers(): renumbers positions after deletion
//   - "Snap to Default" buttons: clears positions for their section
//   - Default seating checkbox toggles: saves/clears for their section
//   - resetPlayerPositions(): clears all positions
//
function updateStagePlot() {
    clearStagePlot();
    updateViolin1Section();
    updateViolin2Section();
    updateViolaSection();
    updateCelloSection();
    updateBassSection();
    updateDynamicInstruments();
    updateAllPlayerOrientations();
    checkForOverlapWarning();
}

// Check if any players overlap after redraw and show/hide warning
function checkForOverlapWarning() {
    const warningEl = document.getElementById('overlap-warning');
    if (!warningEl) return;
    
    // Only show warning when "Prevent Player Overlap" is checked
    if (!collisionDetectionEnabled) {
        warningEl.style.display = 'none';
        return;
    }
    
    const allPlayers = document.querySelectorAll('.stage-plot circle[data-player-id], .stage-plot ellipse[data-player-id]');
    const playerArray = Array.from(allPlayers);
    let hasOverlap = false;
    
    // Tolerance: ignore overlaps smaller than 3px (players just touching)
    const overlapTolerance = 3;
    
    for (let i = 0; i < playerArray.length && !hasOverlap; i++) {
        for (let j = i + 1; j < playerArray.length && !hasOverlap; j++) {
            const p1 = playerArray[i];
            const p2 = playerArray[j];
            const x1 = parseFloat(p1.getAttribute('cx'));
            const y1 = parseFloat(p1.getAttribute('cy'));
            const x2 = parseFloat(p2.getAttribute('cx'));
            const y2 = parseFloat(p2.getAttribute('cy'));
            
            const dx = x2 - x1;
            const dy = y2 - y1;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance === 0) { hasOverlap = true; continue; }
            
            const angleBetween = Math.atan2(dy, dx);
            let r1, r2;
            if (p1.tagName === 'ellipse') {
                r1 = getEllipseRadiusAtAngle(parseFloat(p1.getAttribute('rx')), parseFloat(p1.getAttribute('ry')), angleBetween - getRotationAngle(p1));
            } else {
                r1 = parseFloat(p1.getAttribute('r'));
            }
            if (p2.tagName === 'ellipse') {
                r2 = getEllipseRadiusAtAngle(parseFloat(p2.getAttribute('rx')), parseFloat(p2.getAttribute('ry')), (angleBetween + Math.PI) - getRotationAngle(p2));
            } else {
                r2 = parseFloat(p2.getAttribute('r'));
            }
            
            // Only flag if overlap exceeds the tolerance
            if (distance < (r1 + r2 - overlapTolerance)) {
                hasOverlap = true;
            }
        }
    }
    
    warningEl.style.display = hasOverlap ? 'block' : 'none';
}

function clearStagePlot() {
    ['violin1-section', 'violin2-section', 'viola-section', 'cello-section', 'bass-section', 'woodwinds-section', 'keyboard-section'].forEach(id => {
        const section = document.getElementById(id);
        if (section) section.innerHTML = '';
    });

    const percussionSection = document.getElementById('percussion-section');
    if (percussionSection) {
        Array.from(percussionSection.children).forEach(child => {
            if (child.id !== 'percussion-blob-group') child.remove();
        });
    }
}

// --- Violin Position Template Lookup ---

function getViolinPositions(v1Count, v2Count, useConcertGrand) {
    // Choose the appropriate master template based on concert grand status
    let masterTemplate;
    
    if (useConcertGrand && typeof concertGrandViolinTemplates !== 'undefined' && concertGrandViolinTemplates['12-12']) {
        // Use concert grand "piano out" master template
        masterTemplate = concertGrandViolinTemplates['12-12'];
    } else if (typeof violinPositionTemplates !== 'undefined' && violinPositionTemplates['12-12']) {
        // Use regular master template
        masterTemplate = violinPositionTemplates['12-12'];
    } else {
        // Fallback empty template
        masterTemplate = { violin1: [], violin2: [] };
    }

    // Return first N positions from the chosen master template
    const v1Positions = masterTemplate.violin1.slice(0, v1Count);
    const v2Positions = masterTemplate.violin2.slice(0, v2Count);

    return { violin1: v1Positions, violin2: v2Positions };
}

// --- Section Update Functions ---

function updateViolin1Section() {
    const section = document.getElementById('violin1-section');
    const v1Count = parseInt(document.getElementById('violin1').value) || 0;
    const v2Count = parseInt(document.getElementById('violin2').value) || 0;

    let positions = [];
    if (useDefaultSeating) {
        const templatePositions = getViolinPositions(v1Count, v2Count, concertGrandEnabled).violin1;
        for (let i = 0; i < v1Count; i++) {
            const playerId = `violin1-${i + 1}`;
            // Use custom position if it exists, otherwise use template, or offstage for excess
            if (customPositions[playerId]) {
                positions.push(customPositions[playerId]);
            } else if (i < templatePositions.length) {
                positions.push(templatePositions[i]);
            } else {
                // Place excess players offstage
                positions.push({ x: 45.6, y: 111.7 + ((i - templatePositions.length) * 35) });
            }
        }
    } else {
        for (let i = 0; i < v1Count; i++) {
            const playerId = `violin1-${i + 1}`;
            if (customPositions[playerId]) {
                positions.push(customPositions[playerId]);
            } else {
                const col = Math.floor((i * 30 + 150) / 900);
                positions.push({ x: 100 + col * 50, y: 150 + (i * 30) % 750 });
            }
        }
    }

    for (let i = 0; i < v1Count && i < positions.length; i++) {
        createPlayer(section, 'violin1-player', `violin1-${i + 1}`, positions[i], `V1-${i + 1}`, 'violin1');
    }
}

function updateViolin2Section() {
    const section = document.getElementById('violin2-section');
    const v1Count = parseInt(document.getElementById('violin1').value) || 0;
    const v2Count = parseInt(document.getElementById('violin2').value) || 0;

    let positions = [];
    if (useDefaultSeating) {
        const templatePositions = getViolinPositions(v1Count, v2Count, concertGrandEnabled).violin2;
        for (let i = 0; i < v2Count; i++) {
            const playerId = `violin2-${i + 1}`;
            // Use custom position if it exists, otherwise use template, or offstage for excess
            if (customPositions[playerId]) {
                positions.push(customPositions[playerId]);
            } else if (i < templatePositions.length) {
                positions.push(templatePositions[i]);
            } else {
                // Place excess players offstage
                positions.push({ x: 91.8, y: 112.7 + ((i - templatePositions.length) * 35) });
            }
        }
    } else {
        for (let i = 0; i < v2Count; i++) {
            const playerId = `violin2-${i + 1}`;
            if (customPositions[playerId]) {
                positions.push(customPositions[playerId]);
            } else {
                const col = Math.floor((i * 30 + 150) / 900);
                positions.push({ x: 250 + col * 50, y: 150 + (i * 30) % 750 });
            }
        }
    }

    for (let i = 0; i < v2Count && i < positions.length; i++) {
        createPlayer(section, 'violin2-player', `violin2-${i + 1}`, positions[i], `V2-${i + 1}`, 'violin2');
    }
}

function updateViolaSection() {
    const section = document.getElementById('viola-section');
    const count = parseInt(document.getElementById('viola').value) || 0;

    let positions = [];
    if (useDefaultSeating) {
        // Use master template, but check for custom positions first
        const masterTemplate = (typeof violaPositionTemplates !== 'undefined') ? violaPositionTemplates : [];
        for (let i = 0; i < count; i++) {
            const playerId = `viola-${i + 1}`;
            // Use custom position if it exists, otherwise use template, or offstage for excess
            if (customPositions[playerId]) {
                positions.push(customPositions[playerId]);
            } else if (i < masterTemplate.length) {
                let pos = masterTemplate[i];
                if (concertGrandEnabled) pos = { x: pos.x, y: pos.y - 45 };
                positions.push(pos);
            } else {
                // Place excess players offstage
                positions.push({ x: 137.6, y: 113.5 + ((i - masterTemplate.length) * 35) });
            }
        }
    } else {
        // Use saved customPositions or default for new players
        for (let i = 0; i < count; i++) {
            const playerId = `viola-${i + 1}`;
            if (customPositions[playerId]) {
                positions.push(customPositions[playerId]);
            } else {
                positions.push({ x: 300, y: 350 + (i * 35) });
            }
        }
    }
    
    for (let i = 0; i < positions.length; i++) {
        createPlayer(section, 'viola-player', `viola-${i + 1}`, positions[i], `Va-${i + 1}`, 'viola');
    }
}

function updateCelloSection() {
    const section = document.getElementById('cello-section');
    const count = parseInt(document.getElementById('cello').value) || 0;

    let positions = [];
    if (useDefaultSeating) {
        // Use master template, but check for custom positions first
        const masterTemplate = (typeof celloPositionTemplates !== 'undefined') ? celloPositionTemplates : [];
        for (let i = 0; i < count; i++) {
            const playerId = `cello-${i + 1}`;
            // Use custom position if it exists, otherwise use template, or offstage for excess
            if (customPositions[playerId]) {
                positions.push(customPositions[playerId]);
            } else if (i < masterTemplate.length) {
                let pos = masterTemplate[i];
                if (concertGrandEnabled) pos = { x: pos.x, y: pos.y - 45 };
                positions.push(pos);
            } else {
                // Place excess players offstage
                positions.push({ x: 188.7, y: 116.9 + ((i - masterTemplate.length) * 35) });
            }
        }
    } else {
        // Use saved customPositions or default for new players
        for (let i = 0; i < count; i++) {
            const playerId = `cello-${i + 1}`;
            if (customPositions[playerId]) {
                positions.push(customPositions[playerId]);
            } else {
                positions.push({ x: 350, y: 500 + (i * 35) });
            }
        }
    }
    
    for (let i = 0; i < positions.length; i++) {
        createPlayer(section, 'cello-player', `cello-${i + 1}`, positions[i], `Vc-${i + 1}`, 'cello');
    }
}

function updateBassSection() {
    const section = document.getElementById('bass-section');
    const count = parseInt(document.getElementById('bass').value) || 0;

    let positions = [];
    if (useDefaultSeating) {
        // Use master template, but check for custom positions first
        const masterTemplate = (typeof bassPositionTemplates !== 'undefined') ? bassPositionTemplates : [];
        for (let i = 0; i < count; i++) {
            const playerId = `bass-${i + 1}`;
            // Use custom position if it exists, otherwise use template, or offstage for excess
            if (customPositions[playerId]) {
                positions.push(customPositions[playerId]);
            } else if (i < masterTemplate.length) {
                let pos = masterTemplate[i];
                if (concertGrandEnabled) pos = { x: pos.x, y: pos.y - 45 };
                positions.push(pos);
            } else {
                // Place excess players offstage
                positions.push({ x: 811.9, y: 117.8 + ((i - masterTemplate.length) * 35) });
            }
        }
    } else {
        // Use saved customPositions or default for new players
        for (let i = 0; i < count; i++) {
            const playerId = `bass-${i + 1}`;
            if (customPositions[playerId]) {
                positions.push(customPositions[playerId]);
            } else {
                positions.push({ x: 400, y: 650 + (i * 35) });
            }
        }
    }
    
    for (let i = 0; i < positions.length; i++) {
        createPlayer(section, 'bass-player', `bass-${i + 1}`, positions[i], `Cb-${i + 1}`, 'bass');
    }
}

// --- Dynamic Instruments ---

function updateDynamicInstruments() {
    updateWoodwindsSection();
    updatePercussionSection();
    updateKeyboardSection();
}

function updateWoodwindsSection() {
    const section = document.getElementById('woodwinds-section');

    // Get actual current riser positions (updated when risers are moved)
    // Woodwind riser #1 (for clarinets)
    const woodwindRiser1 = {
        x: woodwindRiserPositions['woodwind-riser-1'].x,
        y: woodwindRiserPositions['woodwind-riser-1'].y,
        width: 120,
        height: 60
    };
    const clarinetRiserCenterY = woodwindRiser1.y + woodwindRiser1.height / 2;
    
    // Woodwind riser #2 (for bassoons)
    const woodwindRiser2 = {
        x: woodwindRiserPositions['woodwind-riser-2'].x,
        y: woodwindRiserPositions['woodwind-riser-2'].y,
        width: 120,
        height: 60
    };
    const bassoonRiserCenterY = woodwindRiser2.y + woodwindRiser2.height / 2;
    
    // Woodwind riser #3 (for flutes)
    const woodwindRiser3 = {
        x: woodwindRiserPositions['woodwind-riser-3'].x,
        y: woodwindRiserPositions['woodwind-riser-3'].y,
        width: 120,
        height: 60
    };
    const fluteRiserCenterY = woodwindRiser3.y + woodwindRiser3.height / 2;
    
    // Woodwind riser #4 (for oboes)
    const woodwindRiser4 = {
        x: woodwindRiserPositions['woodwind-riser-4'].x,
        y: woodwindRiserPositions['woodwind-riser-4'].y,
        width: 120,
        height: 60
    };
    const oboeRiserCenterY = woodwindRiser4.y + woodwindRiser4.height / 2;

    const specificPositions = {};

    const fallbackPositions = [
        { x: 300, y: 150 }, { x: 320, y: 170 }, { x: 340, y: 190 }, { x: 360, y: 210 },
        { x: 380, y: 230 }, { x: 400, y: 250 }, { x: 420, y: 270 }, { x: 440, y: 290 },
        { x: 460, y: 310 }, { x: 480, y: 330 }, { x: 280, y: 200 }, { x: 260, y: 220 },
        { x: 240, y: 240 }, { x: 220, y: 260 }, { x: 200, y: 280 }, { x: 180, y: 300 },
        { x: 160, y: 320 }, { x: 140, y: 340 }, { x: 120, y: 360 }, { x: 100, y: 380 }
    ];

    let positionIndex = 0;

    // Static woodwinds
    ['flute', 'oboe', 'clarinet', 'bassoon'].forEach(instrumentType => {
        const count = parseInt(document.getElementById(instrumentType).value) || 0;
        
        // If not using default woodwind seating, keep existing positions or place offstage
        if (!useDefaultWoodwindSeating) {
            for (let i = 0; i < count; i++) {
                const playerId = `${instrumentType}-${i + 1}`;
                const label = `${instrumentType.charAt(0).toUpperCase() + instrumentType.slice(1)}-${i + 1}`;
                // Use saved custom position if exists, otherwise place offstage
                const pos = customPositions[playerId] || { x: 100, y: 150 + (positionIndex++ * 35) };
                createPlayer(section, 'woodwind-player', playerId, pos, label, instrumentType);
            }
            return;
        }
        
        // Special handling for flutes - first 3 always on woodwind riser #3
        if (instrumentType === 'flute' && count > 0) {
            const fluteRadius = calculatePlayerRadius('flute');
            const fluteWidth = fluteRadius * Math.sqrt(6 / 7) * 2; // Full width of ellipse
            
            // Calculate positions for first 3 flutes on the riser
            // Flute 1 is towards center (rightmost), 2 to its left, 3 furthest left
            const firstThree = Math.min(count, 3);
            let positions = [];
            if (firstThree === 1) {
                // Center single flute
                positions.push(woodwindRiser3.x + woodwindRiser3.width / 2);
            } else if (firstThree === 2) {
                // Two flutes with even spacing - rightmost first
                const spacing = (woodwindRiser3.width - (2 * fluteWidth)) / 3;
                positions.push(woodwindRiser3.x + (2 * spacing) + (1.5 * fluteWidth)); // Player 1 (right)
                positions.push(woodwindRiser3.x + spacing + fluteWidth / 2);           // Player 2 (left)
            } else if (firstThree === 3) {
                // Three flutes evenly spaced to fit the riser width - rightmost first
                const spacing = (woodwindRiser3.width - (3 * fluteWidth)) / 4;
                positions.push(woodwindRiser3.x + spacing * 3 + fluteWidth * 2.5); // Player 1 (right)
                positions.push(woodwindRiser3.x + spacing * 2 + fluteWidth * 1.5); // Player 2 (middle)
                positions.push(woodwindRiser3.x + spacing * 1 + fluteWidth * 0.5); // Player 3 (left)
            }
            
            // Position first 3 flutes on the riser
            for (let i = 0; i < firstThree; i++) {
                const playerId = `flute-${i + 1}`;
                const label = `Fl.${i + 1}`;
                // Use custom position if exists, otherwise use template
                const pos = customPositions[playerId] || {
                    x: positions[i],
                    y: fluteRiserCenterY
                };
                createPlayer(section, 'woodwind-player', playerId, pos, label, instrumentType);
            }
            
            // Position any additional flutes (4+) in offstage area
            for (let i = 3; i < count; i++) {
                const playerId = `flute-${i + 1}`;
                const label = `Fl.${i + 1}`;
                // Use custom position if exists, otherwise position offstage, vertically spaced
                const pos = customPositions[playerId] || {
                    x: 45.6,
                    y: 111.7 + ((i - 3) * 35)
                };
                createPlayer(section, 'woodwind-player', playerId, pos, label, instrumentType);
            }
            return; // Skip to next instrument
        }
        
        // Special handling for oboes - first 3 always on woodwind riser #4
        if (instrumentType === 'oboe' && count > 0) {
            const oboeRadius = calculatePlayerRadius('oboe');
            const oboeWidth = oboeRadius * Math.sqrt(6 / 7) * 2; // Full width of ellipse
            
            // Calculate positions for first 3 oboes on the riser
            // Oboe 1 is towards center (leftmost on this side), 2 to its right, 3 furthest right
            const firstThree = Math.min(count, 3);
            let positions = [];
            if (firstThree === 1) {
                // Center single oboe
                positions.push(woodwindRiser4.x + woodwindRiser4.width / 2);
            } else if (firstThree === 2) {
                // Two oboes with even spacing - leftmost first (mirrored from flutes)
                const spacing = (woodwindRiser4.width - (2 * oboeWidth)) / 3;
                positions.push(woodwindRiser4.x + spacing + oboeWidth / 2);           // Player 1 (left)
                positions.push(woodwindRiser4.x + (2 * spacing) + (1.5 * oboeWidth)); // Player 2 (right)
            } else if (firstThree === 3) {
                // Three oboes evenly spaced to fit the riser width - leftmost first (mirrored from flutes)
                const spacing = (woodwindRiser4.width - (3 * oboeWidth)) / 4;
                positions.push(woodwindRiser4.x + spacing * 1 + oboeWidth * 0.5); // Player 1 (left)
                positions.push(woodwindRiser4.x + spacing * 2 + oboeWidth * 1.5); // Player 2 (middle)
                positions.push(woodwindRiser4.x + spacing * 3 + oboeWidth * 2.5); // Player 3 (right)
            }
            
            // Position first 3 oboes on the riser
            for (let i = 0; i < firstThree; i++) {
                const playerId = `oboe-${i + 1}`;
                const label = `Ob.${i + 1}`;
                // Use custom position if exists, otherwise use template
                const pos = customPositions[playerId] || {
                    x: positions[i],
                    y: oboeRiserCenterY
                };
                createPlayer(section, 'woodwind-player', playerId, pos, label, instrumentType);
            }
            
            // Position any additional oboes (4+) in offstage area
            for (let i = 3; i < count; i++) {
                const playerId = `oboe-${i + 1}`;
                const label = `Ob.${i + 1}`;
                // Use custom position if exists, otherwise position offstage, vertically spaced
                const pos = customPositions[playerId] || {
                    x: 91.8,
                    y: 112.7 + ((i - 3) * 35)
                };
                createPlayer(section, 'woodwind-player', playerId, pos, label, instrumentType);
            }
            return; // Skip to next instrument
        }
        
        // Special handling for clarinets - first 3 always on woodwind riser #1
        if (instrumentType === 'clarinet' && count > 0) {
            const clarinetRadius = calculatePlayerRadius('clarinet');
            const clarinetWidth = clarinetRadius * Math.sqrt(6 / 7) * 2; // Full width of ellipse
            
            // Calculate positions for first 3 clarinets on the riser
            // Clarinet 1 is towards center (rightmost), 2 to its left, 3 furthest left
            const firstThree = Math.min(count, 3);
            let positions = [];
            if (firstThree === 1) {
                // Center single clarinet
                positions.push(woodwindRiser1.x + woodwindRiser1.width / 2);
            } else if (firstThree === 2) {
                // Two clarinets with even spacing - rightmost first
                const spacing = (woodwindRiser1.width - (2 * clarinetWidth)) / 3;
                positions.push(woodwindRiser1.x + (2 * spacing) + (1.5 * clarinetWidth)); // Player 1 (right)
                positions.push(woodwindRiser1.x + spacing + clarinetWidth / 2);           // Player 2 (left)
            } else if (firstThree === 3) {
                // Three clarinets evenly spaced to fit the riser width - rightmost first
                const spacing = (woodwindRiser1.width - (3 * clarinetWidth)) / 4;
                positions.push(woodwindRiser1.x + spacing * 3 + clarinetWidth * 2.5); // Player 1 (right)
                positions.push(woodwindRiser1.x + spacing * 2 + clarinetWidth * 1.5); // Player 2 (middle)
                positions.push(woodwindRiser1.x + spacing * 1 + clarinetWidth * 0.5); // Player 3 (left)
            }
            
            // Position first 3 clarinets on the riser
            for (let i = 0; i < firstThree; i++) {
                const playerId = `clarinet-${i + 1}`;
                const label = `Cl.${i + 1}`;
                // Use custom position if exists, otherwise use template
                const pos = customPositions[playerId] || {
                    x: positions[i],
                    y: clarinetRiserCenterY
                };
                createPlayer(section, 'woodwind-player', playerId, pos, label, instrumentType);
            }
            
            // Position any additional clarinets (4+) in offstage area
            for (let i = 3; i < count; i++) {
                const playerId = `clarinet-${i + 1}`;
                const label = `Cl.${i + 1}`;
                // Use custom position if exists, otherwise position offstage, vertically spaced
                const pos = customPositions[playerId] || {
                    x: 137.6,
                    y: 113.5 + ((i - 3) * 35)
                };
                createPlayer(section, 'woodwind-player', playerId, pos, label, instrumentType);
            }
            return; // Skip to next instrument
        }
        
        // Special handling for bassoons - first 3 always on woodwind riser #2
        if (instrumentType === 'bassoon' && count > 0) {
            const bassoonRadius = calculatePlayerRadius('bassoon');
            const bassoonWidth = bassoonRadius * Math.sqrt(6 / 7) * 2; // Full width of ellipse
            
            // Calculate positions for first 3 bassoons on the riser
            // Bassoon 1 is towards center (leftmost on this side), 2 to its right, 3 furthest right
            const firstThree = Math.min(count, 3);
            let positions = [];
            if (firstThree === 1) {
                // Center single bassoon
                positions.push(woodwindRiser2.x + woodwindRiser2.width / 2);
            } else if (firstThree === 2) {
                // Two bassoons with even spacing - leftmost first (mirrored)
                const spacing = (woodwindRiser2.width - (2 * bassoonWidth)) / 3;
                positions.push(woodwindRiser2.x + spacing + bassoonWidth / 2);           // Player 1 (left)
                positions.push(woodwindRiser2.x + (2 * spacing) + (1.5 * bassoonWidth)); // Player 2 (right)
            } else if (firstThree === 3) {
                // Three bassoons evenly spaced to fit the riser width - leftmost first (mirrored)
                const spacing = (woodwindRiser2.width - (3 * bassoonWidth)) / 4;
                positions.push(woodwindRiser2.x + spacing * 1 + bassoonWidth * 0.5); // Player 1 (left)
                positions.push(woodwindRiser2.x + spacing * 2 + bassoonWidth * 1.5); // Player 2 (middle)
                positions.push(woodwindRiser2.x + spacing * 3 + bassoonWidth * 2.5); // Player 3 (right)
            }
            
            // Position first 3 bassoons on the riser
            for (let i = 0; i < firstThree; i++) {
                const playerId = `bassoon-${i + 1}`;
                const label = `Bsn.${i + 1}`;
                // Use custom position if exists, otherwise use template
                const pos = customPositions[playerId] || {
                    x: positions[i],
                    y: bassoonRiserCenterY
                };
                createPlayer(section, 'woodwind-player', playerId, pos, label, instrumentType);
            }
            
            // Position any additional bassoons (4+) in offstage area
            for (let i = 3; i < count; i++) {
                const playerId = `bassoon-${i + 1}`;
                const label = `Bsn.${i + 1}`;
                // Use custom position if exists, otherwise position offstage, vertically spaced
                const pos = customPositions[playerId] || {
                    x: 188.7,
                    y: 116.9 + ((i - 3) * 35)
                };
                createPlayer(section, 'woodwind-player', playerId, pos, label, instrumentType);
            }
            return; // Skip to next instrument
        }
        
        // Default positioning for other instruments
        for (let i = 0; i < count; i++) {
            const playerId = `${instrumentType}-${i + 1}`;
            const label = `${instrumentType.charAt(0).toUpperCase() + instrumentType.slice(1)}-${i + 1}`;
            let pos;
            if (specificPositions[playerId]) {
                pos = specificPositions[playerId];
            } else if (positionIndex < fallbackPositions.length) {
                pos = fallbackPositions[positionIndex++];
            } else {
                pos = { x: 300 + (positionIndex++ * 30), y: 400 };
            }
            createPlayer(section, 'woodwind-player', playerId, pos, label, instrumentType);
        }
    });

    // Brass instruments - special positioning across risers 1-2-3 (or 4-5 for horns when crowded)
    const hornCount = parseInt(document.getElementById('horn').value) || 0;
    const trumpetCount = parseInt(document.getElementById('trumpet').value) || 0;
    const tromboneCount = parseInt(document.getElementById('trombone').value) || 0;
    const tubaCount = parseInt(document.getElementById('tuba').value) || 0;
    const totalBrass = hornCount + trumpetCount + tromboneCount + tubaCount;
    
    // Brass risers 1-2-3 form continuous 24' space
    const brassRisers123 = { x: 380, y: 95, width: 360, height: 60 }; // 3 risers × 120px
    const brassRisers123CenterY = brassRisers123.y + brassRisers123.height / 2;
    
    // Brass risers 4-5 form continuous 16' space (for overflow horns)
    const brassRisers45 = { x: 380, y: 155, width: 240, height: 60 }; // 2 risers × 120px
    const brassRisers45CenterY = brassRisers45.y + brassRisers45.height / 2;
    
    const brassPlayerRadius = calculatePlayerRadius('horn'); // All brass same size
    const brassPlayerWidth = brassPlayerRadius * Math.sqrt(6 / 7) * 2;
    
    if (totalBrass > 0) {
        // If not using default brass seating, keep existing positions or place offstage
        if (!useDefaultBrassSeating) {
            const offstagePositions = {
                'horn': { x: 45.6, y: 111.7 },
                'trumpet': { x: 91.8, y: 112.7 },
                'trombone': { x: 137.6, y: 113.5 },
                'tuba': { x: 188.7, y: 116.9 }
            };
            
            ['horn', 'trumpet', 'trombone', 'tuba'].forEach(instrumentType => {
                const count = parseInt(document.getElementById(instrumentType).value) || 0;
                const startPos = offstagePositions[instrumentType];
                for (let i = 0; i < count; i++) {
                    const playerId = `${instrumentType}-${i + 1}`;
                const label = `${instrumentType.charAt(0).toUpperCase() + instrumentType.slice(1)}-${i + 1}`;
                // Use saved custom position if exists, otherwise place offstage
                const pos = customPositions[playerId] || { x: startPos.x, y: startPos.y + (i * 35) };
                createPlayer(section, 'brass-player', playerId, pos, label, instrumentType);
                }
            });
            return;
        }
        
        const offstagePositions = {
            'horn': { x: 45.6, y: 111.7 },
            'trumpet': { x: 91.8, y: 112.7 },
            'trombone': { x: 137.6, y: 113.5 },
            'tuba': { x: 188.7, y: 116.9 }
        };
        
        if (totalBrass <= 9) {
            // All brass players fit on risers 1-2-3
            // Order: Horns → Trumpets → Trombones → Tubas (left to right)
            const allBrassPlayers = [];
            
            for (let i = 0; i < hornCount; i++) {
                allBrassPlayers.push({ type: 'horn', num: i + 1, label: `Hn.${i + 1}` });
            }
            for (let i = 0; i < trumpetCount; i++) {
                allBrassPlayers.push({ type: 'trumpet', num: i + 1, label: `Tpt.${i + 1}` });
            }
            for (let i = 0; i < tromboneCount; i++) {
                allBrassPlayers.push({ type: 'trombone', num: i + 1, label: `Tbn.${i + 1}` });
            }
            for (let i = 0; i < tubaCount; i++) {
                allBrassPlayers.push({ type: 'tuba', num: i + 1, label: `Tba.${i + 1}` });
            }
            
            const totalPlayersWidth = totalBrass * brassPlayerWidth;
            const spacing = (brassRisers123.width - totalPlayersWidth) / (totalBrass + 1);
            
            allBrassPlayers.forEach((player, index) => {
                const playerId = `${player.type}-${player.num}`;
                // Use custom position if exists, otherwise use template
                const pos = customPositions[playerId] || {
                    x: brassRisers123.x + spacing * (index + 1) + brassPlayerWidth * (index + 0.5),
                    y: brassRisers123CenterY
                };
                createPlayer(section, 'brass-player', playerId, pos, player.label, player.type);
            });
        } else {
            // More than 9 brass players - priority system
            // Priority: Trumpets, Trombones, Tubas have priority on risers 1-2-3
            // Horns get bumped to risers 4-5 or offstage
            
            const priorityCount = trumpetCount + tromboneCount + tubaCount;
            const hornsOn123 = Math.min(hornCount, Math.max(0, 9 - priorityCount));
            
            // Build players for risers 1-2-3 (max 9) - Horns (if fit) → Trumpets → Trombones → Tubas
            const playersOn123 = [];
            
            for (let i = 0; i < hornsOn123; i++) {
                playersOn123.push({ type: 'horn', num: i + 1, label: `Hn.${i + 1}` });
            }
            for (let i = 0; i < trumpetCount; i++) {
                playersOn123.push({ type: 'trumpet', num: i + 1, label: `Tpt.${i + 1}` });
            }
            for (let i = 0; i < tromboneCount; i++) {
                playersOn123.push({ type: 'trombone', num: i + 1, label: `Tbn.${i + 1}` });
            }
            for (let i = 0; i < tubaCount; i++) {
                playersOn123.push({ type: 'tuba', num: i + 1, label: `Tba.${i + 1}` });
            }
            
            // Position players on risers 1-2-3
            const totalPlayersWidth = playersOn123.length * brassPlayerWidth;
            const spacing = (brassRisers123.width - totalPlayersWidth) / (playersOn123.length + 1);
            
            playersOn123.forEach((player, index) => {
                const playerId = `${player.type}-${player.num}`;
                const pos = customPositions[playerId] || {
                    x: brassRisers123.x + spacing * (index + 1) + brassPlayerWidth * (index + 0.5),
                    y: brassRisers123CenterY
                };
                createPlayer(section, 'brass-player', playerId, pos, player.label, player.type);
            });
            
            // Handle horns that didn't fit on risers 1-2-3
            const hornsOn45 = hornCount - hornsOn123;
            if (hornsOn45 > 0) {
                const maxHornsOn45 = 6; // Pack from left on risers 4-5
                
                // Place horns on risers 4-5 (packed from left)
                for (let i = 0; i < Math.min(hornsOn45, maxHornsOn45); i++) {
                    const hornNum = hornsOn123 + i + 1;
                    const playerId = `horn-${hornNum}`;
                    const pos = customPositions[playerId] || {
                        x: brassRisers45.x + (i * brassPlayerWidth) + (brassPlayerWidth / 2),
                        y: brassRisers45CenterY
                    };
                    createPlayer(section, 'brass-player', playerId, pos, `Hn.${hornNum}`, 'horn');
                }
                
                // Any horns beyond risers 4-5 go offstage
                for (let i = maxHornsOn45; i < hornsOn45; i++) {
                    const hornNum = hornsOn123 + i + 1;
                    const playerId = `horn-${hornNum}`;
                    const startPos = offstagePositions['horn'];
                    const pos = customPositions[playerId] || {
                        x: startPos.x,
                        y: startPos.y + (i - maxHornsOn45) * 35
                    };
                    createPlayer(section, 'brass-player', playerId, pos, `Hn.${hornNum}`, 'horn');
                }
            }
            
            // Handle any excess trumpets, trombones, tubas that didn't fit on risers 1-2-3 (if > 9 total)
            const excessByType = {
                trumpet: trumpetCount - playersOn123.filter(p => p.type === 'trumpet').length,
                trombone: tromboneCount - playersOn123.filter(p => p.type === 'trombone').length,
                tuba: tubaCount - playersOn123.filter(p => p.type === 'tuba').length
            };
            
            ['trumpet', 'trombone', 'tuba'].forEach(type => {
                const excessCount = excessByType[type];
                const onRisers123 = playersOn123.filter(p => p.type === type).length;
                for (let i = 0; i < excessCount; i++) {
                    const playerNum = onRisers123 + i + 1;
                    const playerId = `${type}-${playerNum}`;
                    const startPos = offstagePositions[type];
                    const label = type === 'trumpet' ? `Tpt.${playerNum}` : 
                                  type === 'trombone' ? `Tbn.${playerNum}` : `Tba.${playerNum}`;
                    const pos = customPositions[playerId] || {
                        x: startPos.x,
                        y: startPos.y + (i * 35)
                    };
                    createPlayer(section, 'brass-player', playerId, pos, label, type);
                }
            });
        }
    }

    // Dynamic woodwinds & brass (from dropdowns), including custom instruments
    const woodwindsContainer = document.getElementById('woodwindsInstruments');
    dynamicInstruments.forEach(instrumentId => {
        const countEl = document.getElementById(instrumentId);
        if (countEl && woodwindsContainer && woodwindsContainer.contains(countEl)) {
            const count = parseInt(countEl.value) || 0;
            const labelEl = countEl.closest('.input-group') && countEl.closest('.input-group').querySelector('label');
            const instrumentName = labelEl ? labelEl.textContent.replace(':', '').trim() : instrumentId;
            for (let i = 0; i < count; i++) {
                const playerId = `${instrumentId}-${i + 1}`;
                const label = `${instrumentName}-${i + 1}`;
                let pos;
                if (positionIndex < fallbackPositions.length) {
                    pos = fallbackPositions[positionIndex++];
                } else {
                    pos = { x: 300 + (positionIndex++ * 30), y: 400 };
                }
                const orientation = customInstrumentOrientations[instrumentId] || 'straight';
                createPlayer(section, 'brass-player', playerId, pos, label, instrumentId, orientation);
            }
        }
    });
}

function updatePercussionSection() {
    const section = document.getElementById('percussion-section');
    if (section) {
        const elementsToRemove = section.querySelectorAll('circle[data-player-id], text.player-label');
        elementsToRemove.forEach(el => {
            if (!el.classList.contains('blob-control-point')) el.remove();
        });
    }
    updatePercussionBlob();
}

function updateKeyboardSection() {
    const section = document.getElementById('keyboard-section');

    const keyboardPositions = [
        { x: 750, y: 300 }, { x: 700, y: 200 }, { x: 800, y: 200 }, { x: 650, y: 250 },
        { x: 850, y: 250 }, { x: 720, y: 350 }, { x: 780, y: 350 }, { x: 600, y: 300 },
        { x: 900, y: 300 }, { x: 650, y: 400 }, { x: 800, y: 400 }, { x: 550, y: 350 },
        { x: 920, y: 350 }, { x: 580, y: 200 }, { x: 880, y: 200 }, { x: 520, y: 250 },
        { x: 950, y: 250 }, { x: 600, y: 450 }, { x: 800, y: 450 }, { x: 500, y: 400 }
    ];

    let positionIndex = 0;
    const keyboardContainer = document.getElementById('keyboardInstruments');

    dynamicInstruments.forEach(instrumentId => {
        const countEl2 = document.getElementById(instrumentId);
        if (countEl2 && keyboardContainer && keyboardContainer.contains(countEl2)) {
            const count = parseInt(countEl2.value) || 0;
            const labelEl2 = countEl2.closest('.input-group') && countEl2.closest('.input-group').querySelector('label');
            const instrumentName2 = labelEl2 ? labelEl2.textContent.replace(':', '').trim() : instrumentId;
            for (let i = 0; i < count && positionIndex < keyboardPositions.length; i++) {
                const pos = keyboardPositions[positionIndex++];
                const playerId = `${instrumentId}-${i + 1}`;
                const label = `${instrumentName2}-${i + 1}`;
                createPlayer(section, 'keyboard-player', playerId, pos, label, instrumentId);
            }
        }
    });
}
