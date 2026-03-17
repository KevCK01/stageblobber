// ============================================
// SELECTION - Multi-select, keyboard navigation
// ============================================

// --- Multi-Select ---

function initializeMultiSelect() {
    const svg = document.querySelector('.stage-plot');
    if (!svg) return;

    svg.addEventListener('mousedown', handleSelectionStart);
    svg.addEventListener('mousemove', handleSelectionMove);
    svg.addEventListener('mouseup', handleSelectionEnd);

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') clearSelection();
    });
}

function handleSelectionStart(e) {
    if ((e.target.tagName === 'circle' || e.target.tagName === 'ellipse') && e.target.hasAttribute('data-player-id')) return;
    if (e.target.classList.contains('riser-draggable')) return;

    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) clearSelection();

    isSelecting = true;

    const mouse = getSvgMousePosition(e);
    selectionStart.x = mouse.x;
    selectionStart.y = mouse.y;

    selectionRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    selectionRect.setAttribute('class', 'selection-rectangle');
    selectionRect.setAttribute('x', selectionStart.x);
    selectionRect.setAttribute('y', selectionStart.y);
    selectionRect.setAttribute('width', 0);
    selectionRect.setAttribute('height', 0);
    document.querySelector('.stage-plot').appendChild(selectionRect);

    e.preventDefault();
}

function handleSelectionMove(e) {
    if (!isSelecting || !selectionRect) return;

    const mouse = getSvgMousePosition(e);
    const x = Math.min(selectionStart.x, mouse.x);
    const y = Math.min(selectionStart.y, mouse.y);
    const width = Math.abs(mouse.x - selectionStart.x);
    const height = Math.abs(mouse.y - selectionStart.y);

    selectionRect.setAttribute('x', x);
    selectionRect.setAttribute('y', y);
    selectionRect.setAttribute('width', width);
    selectionRect.setAttribute('height', height);

    updateSelectionFromRectangle(x, y, width, height);
}

function handleSelectionEnd(e) {
    if (!isSelecting) return;
    isSelecting = false;
    if (selectionRect) { selectionRect.remove(); selectionRect = null; }
}

function updateSelectionFromRectangle(x, y, width, height) {
    // Players
    document.querySelectorAll('.stage-plot circle[data-player-id], .stage-plot ellipse[data-player-id]').forEach(player => {
        const cx = parseFloat(player.getAttribute('cx'));
        const cy = parseFloat(player.getAttribute('cy'));
        let rx, ry;
        if (player.tagName === 'ellipse') {
            rx = parseFloat(player.getAttribute('rx'));
            ry = parseFloat(player.getAttribute('ry'));
        } else {
            rx = ry = parseFloat(player.getAttribute('r'));
        }

        const isInside = (cx + rx >= x && cx - rx <= x + width && cy + ry >= y && cy - ry <= y + height);
        const playerId = player.getAttribute('data-player-id');
        if (isInside) addToSelection(playerId, player);
        else removeFromSelection(playerId, player);
    });

    // Singers
    document.querySelectorAll('.stage-plot rect[data-singer-id]').forEach(singer => {
        const singerData = chorusSingers.find(s => s.id === singer.getAttribute('data-singer-id'));
        if (!singerData) return;
        const halfSize = singerData.size / 2;
        const isInside = (singerData.x + halfSize >= x && singerData.x - halfSize <= x + width &&
                          singerData.y + halfSize >= y && singerData.y - halfSize <= y + height);
        const singerId = singer.getAttribute('data-singer-id');
        if (isInside) addToSelection(singerId, singer);
        else removeFromSelection(singerId, singer);
    });

    // Risers
    document.querySelectorAll('.stage-plot .riser-draggable').forEach(riser => {
        const riserId = riser.getAttribute('id');
        if (!riserId) return;
        if (riser.style.display === 'none') { removeRiserFromSelection(riserId, riser); return; }
        const riserX = parseFloat(riser.getAttribute('x'));
        const riserY = parseFloat(riser.getAttribute('y'));
        const riserWidth = parseFloat(riser.getAttribute('width'));
        const riserHeight = parseFloat(riser.getAttribute('height'));

        const isInside = (riserX < x + width && riserX + riserWidth > x &&
                          riserY < y + height && riserY + riserHeight > y);
        if (isInside) addRiserToSelection(riserId, riser);
        else removeRiserFromSelection(riserId, riser);
    });
}

// --- Selection Helpers ---

function addToSelection(playerId, playerElement) {
    selectedPlayers.add(playerId);
    playerElement.classList.add('player-selected');
}

function removeFromSelection(playerId, playerElement) {
    selectedPlayers.delete(playerId);
    playerElement.classList.remove('player-selected');
}

function addRiserToSelection(riserId, riserElement) {
    selectedRisers.add(riserId);
    riserElement.classList.add('selected');
    if (typeof addRiserSelectionIndicator === 'function') {
        addRiserSelectionIndicator(riserId);
    }
}

function removeRiserFromSelection(riserId, riserElement) {
    selectedRisers.delete(riserId);
    riserElement.classList.remove('selected');
    if (typeof removeRiserSelectionIndicator === 'function') {
        removeRiserSelectionIndicator(riserId);
    }
}

function clearSelection() {
    selectedPlayers.forEach(id => {
        const element = document.querySelector(`[data-player-id="${id}"], [data-singer-id="${id}"]`);
        if (element) element.classList.remove('player-selected');
    });
    selectedPlayers.clear();

    selectedRisers.forEach(riserId => {
        const riser = document.getElementById(riserId);
        if (riser) riser.classList.remove('selected');
        if (typeof removeRiserSelectionIndicator === 'function') {
            removeRiserSelectionIndicator(riserId);
        }
    });
    selectedRisers.clear();
}

function togglePlayerSelection(playerId, playerElement) {
    if (selectedPlayers.has(playerId)) removeFromSelection(playerId, playerElement);
    else addToSelection(playerId, playerElement);
}

function deleteSelectedPlayers() {
    if (selectedPlayers.size === 0) return;
    
    // Capture pre-deletion state for undo
    if (typeof pushUndoState === 'function') {
        pushUndoState();
    }
    
    // Group players by instrument type and track which player numbers to delete
    const instrumentDeletes = {};
    const hasSingers = Array.from(selectedPlayers).some(id => id.startsWith('singer-'));
    
    selectedPlayers.forEach(playerId => {
        // Handle chorus singers separately
        if (playerId.startsWith('singer-')) {
            // Singers always use default positioning - we'll delete them differently
            return;
        }
        
        // Parse instrument type and player number from player ID (e.g., "flute-3" -> {type: "flute", num: 3})
        const match = playerId.match(/^(.+?)-(\d+)$/);
        if (match) {
            const instrumentType = match[1];
            const playerNum = parseInt(match[2]);
            if (!instrumentDeletes[instrumentType]) {
                instrumentDeletes[instrumentType] = [];
            }
            instrumentDeletes[instrumentType].push(playerNum);
        }
    });
    
    // Define instrument categories for default seating checks
    // ONLY woodwinds and brass recalculate spacing on delete (they space evenly across risers)
    // Strings use fixed template positions so they always preserve/renumber
    // Chorus singers are handled separately below (always recalculate)
    const woodwindInstruments = ['flute', 'oboe', 'clarinet', 'bassoon'];
    const brassInstruments = ['horn', 'trumpet', 'trombone', 'tuba'];
    
    // Process each instrument type
    Object.keys(instrumentDeletes).forEach(instrumentType => {
        const inputElement = document.getElementById(instrumentType);
        if (!inputElement) return;
        
        const currentValue = parseInt(inputElement.value) || 0;
        const deletedNumbers = instrumentDeletes[instrumentType].sort((a, b) => a - b);
        const deleteCount = deletedNumbers.length;
        const newValue = Math.max(0, currentValue - deleteCount);
        
        // Only woodwinds and brass with default seating should recalculate even spacing
        // Strings and everything else always preserve and renumber positions
        const isWoodwind = woodwindInstruments.includes(instrumentType);
        const isBrass = brassInstruments.includes(instrumentType);
        const shouldRecalculate = 
            (isWoodwind && useDefaultWoodwindSeating) || 
            (isBrass && useDefaultBrassSeating);
        
        if (shouldRecalculate) {
            // Woodwind/Brass with default seating ON: clear all custom positions
            // so the redraw recalculates even spacing with the new count
            for (let i = 1; i <= currentValue; i++) {
                delete customPositions[`${instrumentType}-${i}`];
            }
        } else {
            // Default seating is OFF: preserve and renumber positions
            // Capture current positions of all players BEFORE any changes
            const currentPositions = {};
            for (let i = 1; i <= currentValue; i++) {
                const oldId = `${instrumentType}-${i}`;
                const playerElement = document.querySelector(`[data-player-id="${oldId}"]`);
                if (playerElement) {
                    currentPositions[i] = {
                        x: parseFloat(playerElement.getAttribute('cx')),
                        y: parseFloat(playerElement.getAttribute('cy'))
                    };
                } else if (customPositions[oldId]) {
                    currentPositions[i] = { ...customPositions[oldId] };
                }
            }
            
            // Clear all old positions for this instrument
            for (let i = 1; i <= currentValue; i++) {
                delete customPositions[`${instrumentType}-${i}`];
            }
            
            // Renumber remaining players and preserve their positions
            let newPlayerIndex = 1;
            for (let oldNum = 1; oldNum <= currentValue; oldNum++) {
                // If this player is NOT being deleted
                if (!deletedNumbers.includes(oldNum)) {
                    const newId = `${instrumentType}-${newPlayerIndex}`;
                    // Preserve the position under the new number
                    if (currentPositions[oldNum]) {
                        customPositions[newId] = { ...currentPositions[oldNum] };
                    }
                    newPlayerIndex++;
                }
            }
        }
        
        // Update the input value (without triggering event yet)
        inputElement.value = newValue;
    });
    
    // Handle chorus singers deletion
    if (hasSingers && typeof chorusSingers !== 'undefined') {
        const singersToDelete = Array.from(selectedPlayers).filter(id => id.startsWith('singer-'));
        
        // Group deleted singers by row
        const rowDeletions = {};
        singersToDelete.forEach(singerId => {
            const singerData = chorusSingers.find(s => s.id === singerId);
            if (singerData) {
                const rowIndex = singerData.rowIndex;
                if (!rowDeletions[rowIndex]) {
                    rowDeletions[rowIndex] = [];
                }
                rowDeletions[rowIndex].push(singerId);
            }
        });
        
        // For each affected row, delete singers and recalculate
        Object.keys(rowDeletions).forEach(rowIndex => {
            const rowIdx = parseInt(rowIndex);
            
            // Remove singers from the array
            rowDeletions[rowIndex].forEach(singerId => {
                const index = chorusSingers.findIndex(s => s.id === singerId);
                if (index !== -1) {
                    // Remove from DOM
                    const el = document.getElementById(singerId);
                    if (el) el.remove();
                    // Remove from array
                    chorusSingers.splice(index, 1);
                }
            });
            
            // Update the count for this row
            const remainingSingersInRow = chorusSingers.filter(s => s.rowIndex === rowIdx).length;
            if (typeof chorusSingersPerRow !== 'undefined') {
                chorusSingersPerRow[rowIdx] = remainingSingersInRow;
            }
            
            // Update the input field for this row
            const rowInput = document.getElementById(`chorus-row-${rowIdx + 1}-singers`);
            if (rowInput) {
                rowInput.value = remainingSingersInRow;
            }
            
            // Recalculate positions for remaining singers in this row
            if (typeof updateChorusSingersForRow === 'function') {
                updateChorusSingersForRow(rowIdx, remainingSingersInRow);
            }
        });
        
        // Update total count display
        if (typeof updateTotalSingersCount === 'function') {
            updateTotalSingersCount();
        }
    }
    
    // Clear the selection
    clearSelection();
    
    // Now trigger a single stage update (customPositions were already renumbered above)
    if (typeof updateStagePlot === 'function') {
        updateStagePlot();
    }
}

// --- Keyboard Navigation ---

// Registered in DOMContentLoaded, but defined here
function setupKeyboardNavigation() {
    let keyboardMoveTimeout = null;
    
    document.addEventListener('keydown', function(event) {
        // Delete key for players
        if (event.key === 'Delete' || event.key === 'Backspace') {
            if (selectedPlayers.size > 0) {
                event.preventDefault();
                deleteSelectedPlayers();
                return;
            }
            
            // Delete key for risers
            if (selectedRisers.size > 0 ||
                (selectedObject && (selectedObjectType === 'timpani-riser' ||
                 selectedObjectType === 'brass-riser' || selectedObjectType === 'woodwind-riser' ||
                 (selectedObject && selectedObject.startsWith('extra-riser-'))))) {
                event.preventDefault();
                deleteSelectedRisers();
                return;
            }
        }

        // Arrow keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
            let deltaX = 0, deltaY = 0;
            switch (event.key) {
                case 'ArrowUp': deltaY = -1; break;
                case 'ArrowDown': deltaY = 1; break;
                case 'ArrowLeft': deltaX = -1; break;
                case 'ArrowRight': deltaX = 1; break;
            }
            if (event.shiftKey) { deltaX *= 10; deltaY *= 10; }

            if (selectedPlayers.size > 0) moveSelectedPlayers(deltaX, deltaY);
            else if (selectedRisers.size > 0) moveSelectedRisers(deltaX, deltaY);
            else if (selectedObject) moveSelectedObject(deltaX, deltaY);
            
            // Debounce undo state capture - only save after 500ms of no arrow key presses
            if (keyboardMoveTimeout) clearTimeout(keyboardMoveTimeout);
            keyboardMoveTimeout = setTimeout(() => {
                if (typeof pushUndoState === 'function') {
                    pushUndoState();
                }
            }, 500);
        }
    });
}

// --- Group Movement ---

function moveSelectedPlayers(deltaX, deltaY) {
    selectedPlayers.forEach(id => {
        if (id.startsWith('singer-')) moveSinger(id, deltaX, deltaY);
        else movePlayer(id, deltaX, deltaY);
    });
}

function moveSelectedRisers(deltaX, deltaY) {
    selectedRisers.forEach(riserId => {
        if (riserId === 'timpani-riser') moveTimpaniRiser(deltaX, deltaY);
        else if (riserId.startsWith('brass-riser-')) moveBrassRiser(riserId, deltaX, deltaY);
        else if (riserId.startsWith('woodwind-riser-')) moveWoodwindRiser(riserId, deltaX, deltaY);
        else if (riserId.startsWith('extra-riser-')) moveExtraRiser(riserId, deltaX, deltaY);
        else if (riserId.startsWith('chorus-riser-')) moveChorusRiser(riserId, deltaX, deltaY);
    });
}

function moveSelectedObject(deltaX, deltaY) {
    if (!selectedObject) return;
    switch (selectedObjectType) {
        case 'player': movePlayer(selectedObject, deltaX, deltaY); break;
        case 'singer': moveSinger(selectedObject, deltaX, deltaY); break;
        case 'podium': movePodium(deltaX, deltaY); break;
        case 'concert-grand': moveConcertGrand(deltaX, deltaY); break;
        case 'timpani-riser': moveTimpaniRiser(deltaX, deltaY); break;
        case 'brass-riser': moveBrassRiser(selectedObject, deltaX, deltaY); break;
        case 'woodwind-riser': moveWoodwindRiser(selectedObject, deltaX, deltaY); break;
        default:
            if (selectedObject.startsWith('extra-riser-')) moveExtraRiser(selectedObject, deltaX, deltaY);
            else if (selectedObject.startsWith('chorus-riser-')) moveChorusRiser(selectedObject, deltaX, deltaY);
            break;
    }
}

// --- Individual Movement ---

function movePlayer(playerId, deltaX, deltaY) {
    const player = document.querySelector(`[data-player-id="${playerId}"]`);
    if (!player) return;

    const currentX = parseFloat(player.getAttribute('cx'));
    const currentY = parseFloat(player.getAttribute('cy'));
    let newX = currentX + deltaX;
    let newY = currentY + deltaY;

    let finalPos;
    if (collisionDetectionEnabled) {
        finalPos = findClosestValidPosition(playerId, currentX, currentY, newX, newY, new Set());
    } else {
        finalPos = { x: newX, y: newY };
    }

    if (isInsideStage(finalPos.x, finalPos.y, 15)) {
        player.setAttribute('cx', finalPos.x);
        player.setAttribute('cy', finalPos.y);
        updatePlayerOrientation(player, finalPos.x, finalPos.y);

        const label = player.nextElementSibling;
        if (label && label.tagName === 'text') {
            label.setAttribute('x', finalPos.x);
            label.setAttribute('y', finalPos.y);
        }

        customPositions[playerId] = { x: finalPos.x, y: finalPos.y };
        if (debugMode) updateDebugInfo();
    }
}

function moveSinger(singerId, deltaX, deltaY) {
    const singerData = chorusSingers.find(s => s.id === singerId);
    if (!singerData) return;

    singerData.x = Math.max(0, Math.min(SVG_WIDTH, singerData.x + deltaX));
    singerData.y = Math.max(0, Math.min(SVG_HEIGHT, singerData.y + deltaY));

    const el = document.getElementById(singerId);
    if (el) {
        el.setAttribute('x', singerData.x - singerData.size / 2);
        el.setAttribute('y', singerData.y - singerData.size / 2);
    }
    if (debugMode) updateDebugInfo();
}

function movePodium(deltaX, deltaY) {
    let newX = podiumPosition.x + deltaX;
    let newY = podiumPosition.y + deltaY;

    if (isInsideStage(newX, newY, 10)) {
        podiumPosition = { x: newX, y: newY };
        updatePodiumPosition();
        updateAllPlayerOrientations();
        if (debugMode) updateDebugInfo();
    }
}

function moveTimpaniRiser(deltaX, deltaY) {
    const bounds = { left: 195, right: 685, top: 90, bottom: 535 };
    let newX = Math.max(bounds.left, Math.min(bounds.right, timpaniRiserPosition.x + deltaX));
    let newY = Math.max(bounds.top, Math.min(bounds.bottom, timpaniRiserPosition.y + deltaY));
    timpaniRiserPosition = { x: newX, y: newY };
    updateTimpaniRiserPosition();
    if (debugMode) updateDebugInfo();
}

function moveBrassRiser(riserId, deltaX, deltaY) {
    const bounds = { left: 195, right: 685, top: 90, bottom: 595 };
    let newX = Math.max(bounds.left, Math.min(bounds.right, brassRiserPositions[riserId].x + deltaX));
    let newY = Math.max(bounds.top, Math.min(bounds.bottom, brassRiserPositions[riserId].y + deltaY));
    brassRiserPositions[riserId] = { x: newX, y: newY };
    updateBrassRiserPosition(riserId);
    if (debugMode) updateDebugInfo();
}

function moveWoodwindRiser(riserId, deltaX, deltaY) {
    const bounds = { left: 195, right: 685, top: 90, bottom: 595 };
    let newX = Math.max(bounds.left, Math.min(bounds.right, woodwindRiserPositions[riserId].x + deltaX));
    let newY = Math.max(bounds.top, Math.min(bounds.bottom, woodwindRiserPositions[riserId].y + deltaY));
    woodwindRiserPositions[riserId] = { x: newX, y: newY };
    updateWoodwindRiserPosition(riserId);
    if (debugMode) updateDebugInfo();
}

function moveExtraRiser(riserId, deltaX, deltaY) {
    const rd = extraRisers.find(r => r.id === riserId);
    if (!rd) return;
    rd.x = Math.max(0, Math.min(SVG_WIDTH - rd.config.width, rd.x + deltaX));
    rd.y = Math.max(0, Math.min(SVG_HEIGHT - rd.config.height, rd.y + deltaY));
    updateExtraRiserPosition(rd);
    if (debugMode) updateDebugInfo();
}

// --- Object Selection ---

function selectObject(objectId, objectType) {
    clearKeyboardSelection();
    selectedObject = objectId;
    selectedObjectType = objectType;

    const element = document.getElementById(objectId);
    if (element) {
        element.classList.add(objectType === 'player' ? 'keyboard-selected-player' : 'keyboard-selected');
    }

    const info = document.getElementById('keyboard-nav-info');
    const nameSpan = document.getElementById('selected-object-name');
    if (info && nameSpan) {
        let displayName = objectId;
        if (objectType === 'player') displayName = `Player ${objectId}`;
        else if (objectType === 'podium') displayName = 'Podium';
        else if (objectType === 'concert-grand') displayName = 'Concert Grand';
        else if (objectType === 'timpani-riser') displayName = 'Timpani Riser';
        else if (objectType === 'brass-riser' || objectType === 'woodwind-riser') {
            displayName = objectId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else if (objectId.startsWith('chorus-riser-')) {
            displayName = objectId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        nameSpan.textContent = displayName;
        info.style.display = 'block';
    }
}

function clearKeyboardSelection() {
    if (selectedObject) {
        const element = document.getElementById(selectedObject);
        if (element) element.classList.remove('keyboard-selected', 'keyboard-selected-player');
    }
    selectedObject = null;
    selectedObjectType = null;

    const info = document.getElementById('keyboard-nav-info');
    if (info) info.style.display = 'none';
}
