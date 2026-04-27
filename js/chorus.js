// ============================================
// CHORUS - Singers, risers, row management
// ============================================

function toggleChorus() {
    const checkbox = document.getElementById('chorus-toggle');
    chorusEnabled = checkbox.checked;
    const chorusControls = document.getElementById('chorus-controls');

    if (chorusEnabled) {
        chorusControls.style.display = 'block';
        saveRiserStates(); // Save current state before hiding
        hideBrassWoodwindTimpaniRisers();
        chorusRows = 1;
        chorusSingersPerRow = [0];
        createChorusRisers();
        updateChorusRowInputs();
        updateChorusRowCount();
    } else {
        chorusControls.style.display = 'none';
        clearChorusRisers();
        clearAllChorusSingers();
        chorusRows = 1;
        chorusSingersPerRow = [];
        restoreRiserStates(); // Restore saved state
    }

    if (debugMode) updateDebugInfo();
}

function saveRiserStates() {
    savedRiserStates = {
        timpani: false,
        brass: [],
        woodwind: []
    };

    const timpaniCb = document.getElementById('timpani-riser-checkbox');
    if (timpaniCb) {
        savedRiserStates.timpani = timpaniCb.checked;
    }

    for (let i = 1; i <= 5; i++) {
        const cb = document.getElementById(`brass-riser-${i}-checkbox`);
        savedRiserStates.brass[i - 1] = cb ? cb.checked : false;
    }

    for (let i = 1; i <= 4; i++) {
        const cb = document.getElementById(`woodwind-riser-${i}-checkbox`);
        savedRiserStates.woodwind[i - 1] = cb ? cb.checked : false;
    }
}

function restoreRiserStates() {
    if (!savedRiserStates) {
        // If no saved state, just show them as they are
        showBrassWoodwindTimpaniRisers();
        return;
    }

    // Restore timpani
    const timpaniCb = document.getElementById('timpani-riser-checkbox');
    if (timpaniCb) {
        timpaniCb.checked = savedRiserStates.timpani;
        const r = document.getElementById('timpani-riser');
        const l = document.getElementById('timpani-riser-label');
        if (r && l) {
            r.style.display = timpaniCb.checked ? 'block' : 'none';
            l.style.display = timpaniCb.checked ? 'block' : 'none';
        }
    }

    // Restore brass risers
    for (let i = 1; i <= 5; i++) {
        const cb = document.getElementById(`brass-riser-${i}-checkbox`);
        if (cb && savedRiserStates.brass[i - 1] !== undefined) {
            cb.checked = savedRiserStates.brass[i - 1];
            const r = document.getElementById(`brass-riser-${i}`);
            const l = document.getElementById(`brass-riser-${i}-label`);
            if (r && l) {
                r.style.display = cb.checked ? 'block' : 'none';
                l.style.display = cb.checked ? 'block' : 'none';
            }
        }
    }

    // Restore woodwind risers
    for (let i = 1; i <= 4; i++) {
        const cb = document.getElementById(`woodwind-riser-${i}-checkbox`);
        if (cb && savedRiserStates.woodwind[i - 1] !== undefined) {
            cb.checked = savedRiserStates.woodwind[i - 1];
            const r = document.getElementById(`woodwind-riser-${i}`);
            const l = document.getElementById(`woodwind-riser-${i}-label`);
            if (r && l) {
                r.style.display = cb.checked ? 'block' : 'none';
                l.style.display = cb.checked ? 'block' : 'none';
            }
        }
    }
}

function hideBrassWoodwindTimpaniRisers() {
    const timpani = document.getElementById('timpani-riser');
    const timpaniLabel = document.getElementById('timpani-riser-label');
    const timpaniCb = document.getElementById('timpani-riser-checkbox');
    if (timpani) timpani.style.display = 'none';
    if (timpaniLabel) timpaniLabel.style.display = 'none';
    if (timpaniCb) timpaniCb.checked = false;

    for (let i = 1; i <= 5; i++) {
        const r = document.getElementById(`brass-riser-${i}`);
        const l = document.getElementById(`brass-riser-${i}-label`);
        const cb = document.getElementById(`brass-riser-${i}-checkbox`);
        if (r) r.style.display = 'none';
        if (l) l.style.display = 'none';
        if (cb) cb.checked = false;
    }

    for (let i = 1; i <= 4; i++) {
        const r = document.getElementById(`woodwind-riser-${i}`);
        const l = document.getElementById(`woodwind-riser-${i}-label`);
        const cb = document.getElementById(`woodwind-riser-${i}-checkbox`);
        if (r) r.style.display = 'none';
        if (l) l.style.display = 'none';
        if (cb) cb.checked = false;
    }
}

function showBrassWoodwindTimpaniRisers() {
    const timpaniCb = document.getElementById('timpani-riser-checkbox');
    if (timpaniCb && timpaniCb.checked) {
        const r = document.getElementById('timpani-riser');
        const l = document.getElementById('timpani-riser-label');
        if (r) r.style.display = 'block';
        if (l) l.style.display = 'block';
    }

    for (let i = 1; i <= 5; i++) {
        const cb = document.getElementById(`brass-riser-${i}-checkbox`);
        if (cb && cb.checked) {
            const r = document.getElementById(`brass-riser-${i}`);
            const l = document.getElementById(`brass-riser-${i}-label`);
            if (r) r.style.display = 'block';
            if (l) l.style.display = 'block';
        }
    }

    for (let i = 1; i <= 4; i++) {
        const cb = document.getElementById(`woodwind-riser-${i}-checkbox`);
        if (cb && cb.checked) {
            const r = document.getElementById(`woodwind-riser-${i}`);
            const l = document.getElementById(`woodwind-riser-${i}-label`);
            if (r) r.style.display = 'block';
            if (l) l.style.display = 'block';
        }
    }
}

// --- Chorus Risers ---

function createChorusRisers() {
    const config = riserConfigs['8x4'];
    const baseY = 95;
    const rowSpacing = 60;
    const startingXPositions = [260, 380, 500, 620];

    for (let row = 0; row < chorusRows; row++) {
        const y = baseY + (row * rowSpacing);
        for (let i = 0; i < 4; i++) {
            const riserNumber = (row * 4) + (i + 1);
            const riserId = `chorus-riser-${riserNumber}`;
            const riserData = {
                id: riserId, size: '8x4', config: config,
                x: startingXPositions[i], y: y,
                dragging: false, dragOffset: { x: 0, y: 0 },
                number: riserNumber, rowIndex: row
            };
            chorusRisers.push(riserData);
            createChorusRiserElements(riserData);
            initializeChorusRiser(riserId);
        }
    }
}

function createChorusRiserElements(riserData) {
    const svg = document.querySelector('#extra-risers-section');

    // Get current theme colors
    const riserColors = (typeof getCurrentRiserColors === 'function') 
        ? getCurrentRiserColors() 
        : { fill: '#9333ea', stroke: '#7e22ce' };

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('id', riserData.id);
    rect.setAttribute('x', riserData.x);
    rect.setAttribute('y', riserData.y);
    rect.setAttribute('width', riserData.config.width);
    rect.setAttribute('height', riserData.config.height);
    rect.setAttribute('fill', riserColors.fill);
    rect.setAttribute('stroke', riserColors.stroke);
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('data-riser-type', 'chorus');
    rect.classList.add('riser-draggable');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('id', riserData.id + '-label');
    text.setAttribute('x', riserData.x + riserData.config.width / 2);
    text.setAttribute('y', riserData.y + riserData.config.height / 2 + 5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-weight', 'bold');
    text.classList.add('riser-label');
    text.textContent = `CHORUS #${riserData.number}`;

    svg.appendChild(rect);
    svg.appendChild(text);
}

function initializeChorusRiser(riserId) {
    const riser = document.getElementById(riserId);
    if (!riser) return;

    riser.addEventListener('mousedown', function(e) { startChorusRiserDrag(e, riserId); });
    riser.addEventListener('touchstart', function(e) { e.preventDefault(); startChorusRiserDrag(e.touches[0], riserId); });
    riser.addEventListener('click', function(e) {
        const rd = chorusRisers.find(r => r.id === riserId);
        if ((!rd || !rd.dragging) && !justFinishedDrag) {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
                toggleRiserSelection(riserId);
            } else {
                selectObject(riserId, riserId);
            }
        }
    });
}

function startChorusRiserDrag(e, riserId) {
    if (e.ctrlKey || e.metaKey || e.shiftKey) { toggleRiserSelection(riserId); return; }
    if (!selectedRisers.has(riserId)) { clearRiserSelection(); selectRiser(riserId); }

    const rd = chorusRisers.find(r => r.id === riserId);
    if (!rd) return;
    
    // Check if group dragging
    const isGroupDrag = selectedRisers.size > 1;
    
    // Capture pre-drag state for undo (riser + singers)
    preDragState = { 
        risers: { chorus: [] },
        chorusSingers: chorusSingers.map(s => ({ id: s.id, x: s.x, y: s.y }))
    };
    if (isGroupDrag) {
        selectedRisers.forEach(id => {
            if (id.startsWith('chorus-riser-')) {
                const r = chorusRisers.find(r => r.id === id);
                if (r) preDragState.risers.chorus.push({ id: r.id, x: r.x, y: r.y });
            }
        });
    } else {
        preDragState.risers.chorus.push({ id: rd.id, x: rd.x, y: rd.y });
    }
    
    rd.dragging = true;
    rd.isGroupDrag = isGroupDrag;
    document.getElementById(riserId).classList.add('dragging');
    
    // Store initial positions for all selected chorus risers
    if (isGroupDrag) {
        const mouse = getSvgMousePosition(e);
        selectedRisers.forEach(id => {
            if (id.startsWith('chorus-riser-')) {
                const r = chorusRisers.find(r => r.id === id);
                if (r) {
                    r.groupDragOffset = { x: mouse.x - r.x, y: mouse.y - r.y };
                    document.getElementById(id).classList.add('dragging');
                }
            }
        });
    }

    const mouse = getSvgMousePosition(e);
    rd.dragOffset = { x: mouse.x - rd.x, y: mouse.y - rd.y };

    document.addEventListener('mousemove', handleChorusRiserDragMove);
    document.addEventListener('mouseup', handleChorusRiserDragEnd);
    document.addEventListener('touchmove', handleChorusRiserDragMove);
    document.addEventListener('touchend', handleChorusRiserDragEnd);
}

function handleChorusRiserDragMove(e) {
    const rd = chorusRisers.find(r => r.dragging);
    if (!rd) return;
    e.preventDefault();

    const mouse = getSvgMousePosition(e);
    let newX = mouse.x - rd.dragOffset.x;
    let newY = mouse.y - rd.dragOffset.y;

    newX = Math.max(0, Math.min(SVG_WIDTH - rd.config.width, newX));
    newY = Math.max(0, Math.min(SVG_HEIGHT - rd.config.height, newY));

    // Always apply snap to the primary riser
    const snap = getSnapPosition(rd.id, newX, newY, rd.config.width, rd.config.height);
    const snapDeltaX = snap.x - newX;
    const snapDeltaY = snap.y - newY;
    const deltaX = snap.x - rd.x;
    const deltaY = snap.y - rd.y;

    rd.x = snap.x;
    rd.y = snap.y;
    updateChorusRiserPosition(rd);
    moveSingersWithRiser(rd.id, deltaX, deltaY);
    
    // Move all other selected chorus risers - each one checks for snapping individually
    if (rd.isGroupDrag) {
        selectedRisers.forEach(id => {
            if (id !== rd.id && id.startsWith('chorus-riser-')) {
                const r = chorusRisers.find(r => r.id === id);
                if (r && r.groupDragOffset) {
                    let rx = mouse.x - r.groupDragOffset.x;
                    let ry = mouse.y - r.groupDragOffset.y;
                    rx = Math.max(0, Math.min(SVG_WIDTH - r.config.width, rx));
                    ry = Math.max(0, Math.min(SVG_HEIGHT - r.config.height, ry));
                    
                    // Apply the primary snap delta first to maintain group alignment
                    rx += snapDeltaX;
                    ry += snapDeltaY;
                    
                    // Then check if THIS riser can snap to something nearby
                    const individualSnap = getSnapPosition(r.id, rx, ry, r.config.width, r.config.height);
                    
                    // Only apply individual snap if it's significant (within snap tolerance)
                    const individualSnapDeltaX = individualSnap.x - rx;
                    const individualSnapDeltaY = individualSnap.y - ry;
                    
                    let finalX, finalY;
                    // If this riser found a snap point very close by, use it
                    if (Math.abs(individualSnapDeltaX) < SNAP_TOLERANCE && Math.abs(individualSnapDeltaY) < SNAP_TOLERANCE) {
                        finalX = individualSnap.x;
                        finalY = individualSnap.y;
                    } else {
                        // Otherwise just use the group delta
                        finalX = rx;
                        finalY = ry;
                    }
                    
                    const rdx = finalX - r.x;
                    const rdy = finalY - r.y;
                    r.x = finalX;
                    r.y = finalY;
                    updateChorusRiserPosition(r);
                    moveSingersWithRiser(r.id, rdx, rdy);
                }
            }
        });
    }
}

function handleChorusRiserDragEnd(e) {
    const rd = chorusRisers.find(r => r.dragging);
    if (!rd) return;
    
    // Check if riser actually moved (more than 2 pixels)
    let riserMoved = false;
    if (preDragState && preDragState.risers && preDragState.risers.chorus && preDragState.risers.chorus.length > 0) {
        const preDragPos = preDragState.risers.chorus.find(r => r.id === rd.id);
        if (preDragPos) {
            const distance = Math.sqrt(
                Math.pow(rd.x - preDragPos.x, 2) + 
                Math.pow(rd.y - preDragPos.y, 2)
            );
            riserMoved = distance > 2;
        }
    }
    
    rd.dragging = false;
    document.getElementById(rd.id).classList.remove('dragging');
    
    // Clean up group drag state
    if (rd.isGroupDrag) {
        selectedRisers.forEach(id => {
            if (id.startsWith('chorus-riser-')) {
                const r = chorusRisers.find(r => r.id === id);
                if (r) {
                    delete r.groupDragOffset;
                    document.getElementById(id).classList.remove('dragging');
                }
            }
        });
        rd.isGroupDrag = false;
    }

    // Push pre-drag state to undo stack (only if moved)
    if (riserMoved && typeof pushUndoStateWithPreDragState === 'function' && preDragState) {
        pushUndoStateWithPreDragState(preDragState);
    }
    preDragState = null;
    
    // Clear selection only if riser actually moved
    if (riserMoved) {
        if (typeof clearRiserSelection === 'function') {
            clearRiserSelection();
        }
        if (typeof clearKeyboardSelection === 'function') {
            clearKeyboardSelection();
        }
        // Set flag to prevent click handler from re-selecting
        justFinishedDrag = true;
        setTimeout(() => { justFinishedDrag = false; }, 100);
    }

    document.removeEventListener('mousemove', handleChorusRiserDragMove);
    document.removeEventListener('mouseup', handleChorusRiserDragEnd);
    document.removeEventListener('touchmove', handleChorusRiserDragMove);
    document.removeEventListener('touchend', handleChorusRiserDragEnd);
}

function updateChorusRiserPosition(riserData) {
    const el = document.getElementById(riserData.id);
    const label = document.getElementById(riserData.id + '-label');
    if (el) { el.setAttribute('x', riserData.x); el.setAttribute('y', riserData.y); }
    if (label) {
        label.setAttribute('x', riserData.x + riserData.config.width / 2);
        label.setAttribute('y', riserData.y + riserData.config.height / 2 + 5);
    }
    
    // Update selection indicator if selected
    const indicator = document.getElementById(`${riserData.id}-selection`);
    if (indicator) {
        indicator.setAttribute('x', riserData.x + 1.5);
        indicator.setAttribute('y', riserData.y + 1.5);
        indicator.setAttribute('width', riserData.config.width - 3);
        indicator.setAttribute('height', riserData.config.height - 3);
    }
}

function moveChorusRiser(riserId, deltaX, deltaY) {
    const rd = chorusRisers.find(r => r.id === riserId);
    if (!rd) return;

    let newX = Math.max(0, Math.min(SVG_WIDTH - rd.config.width, rd.x + deltaX));
    let newY = Math.max(0, Math.min(SVG_HEIGHT - rd.config.height, rd.y + deltaY));

    const actualDeltaX = newX - rd.x;
    const actualDeltaY = newY - rd.y;
    rd.x = newX;
    rd.y = newY;
    updateChorusRiserPosition(rd);
    moveSingersWithRiser(riserId, actualDeltaX, actualDeltaY);
    if (debugMode) updateDebugInfo();
}

function moveSingersWithRiser(riserId, deltaX, deltaY) {
    const rd = chorusRisers.find(r => r.id === riserId);
    if (!rd) return;
    const rowIndex = rd.rowIndex;

    chorusSingers.filter(s => s.rowIndex === rowIndex).forEach(singerData => {
        singerData.x += deltaX;
        singerData.y += deltaY;
        const el = document.getElementById(singerData.id);
        if (el) {
            el.setAttribute('x', singerData.x - singerData.size / 2);
            el.setAttribute('y', singerData.y - singerData.size / 2);
        }
    });
}

function clearChorusRisers() {
    chorusRisers.forEach(rd => {
        const r = document.getElementById(rd.id);
        const l = document.getElementById(rd.id + '-label');
        if (r) r.remove();
        if (l) l.remove();
    });
    chorusRisers = [];
}

function renumberChorusRisers() {
    // Sort visually: top rows first (smallest y), then left to right (smallest x)
    const sorted = [...chorusRisers].sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x);
    sorted.forEach((rd, i) => {
        rd.number = i + 1;
        const label = document.getElementById(rd.id + '-label');
        if (label) label.textContent = `CHORUS #${rd.number}`;
    });
}

// --- Row Management ---

function addChorusRow() {
    if (!chorusEnabled) return;
    chorusRows++;
    chorusSingersPerRow.push(0);
    clearChorusRisers();
    createChorusRisers();
    updateChorusRowInputs();
    updateChorusRowCount();
    if (debugMode) updateDebugInfo();
}

function removeChorusRow() {
    if (!chorusEnabled || chorusRows <= 1) return;
    clearChorusSingersForRow(chorusRows - 1);
    chorusRows--;
    chorusSingersPerRow.pop();
    clearChorusRisers();
    createChorusRisers();
    updateChorusRowInputs();
    updateChorusRowCount();
    updateTotalSingersCount();
    if (debugMode) updateDebugInfo();
}

function updateChorusRowCount() {
    const el = document.getElementById('chorus-row-count');
    if (el) el.textContent = `Rows: ${chorusRows}`;
}

function updateChorusRowInputs() {
    const container = document.getElementById('chorus-row-inputs');
    if (!container) return;
    container.innerHTML = '';

    while (chorusSingersPerRow.length < chorusRows) chorusSingersPerRow.push(0);
    if (chorusSingersPerRow.length > chorusRows) chorusSingersPerRow = chorusSingersPerRow.slice(0, chorusRows);

    for (let i = 0; i < chorusRows; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'input-group';
        rowDiv.style.marginBottom = '8px';

        const label = document.createElement('label');
        label.textContent = `Row ${i + 1} Singers:`;
        label.style.minWidth = '110px';

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `chorus-row-${i + 1}-singers`;
        input.min = '0';
        input.max = '19';
        input.value = chorusSingersPerRow[i] || 0;
        input.style.width = '60px';
        input.onchange = function() { updateChorusSingersForRow(i, parseInt(this.value) || 0); };

        rowDiv.appendChild(label);
        rowDiv.appendChild(input);
        container.appendChild(rowDiv);
    }
}

// --- Singers ---

function updateChorusSingersForRow(rowIndex, singerCount) {
    chorusSingersPerRow[rowIndex] = singerCount;
    clearChorusSingersForRow(rowIndex);
    if (singerCount > 0) createSingersForRow(rowIndex, singerCount);
    updateTotalSingersCount();
    if (debugMode) updateDebugInfo();
}

function createSingersForRow(rowIndex, singerCount) {
    const section = document.getElementById('chorus-singers-section');
    if (!section) return;

    const rowRisers = chorusRisers.filter(riser => riser.rowIndex === rowIndex).sort((a, b) => a.x - b.x);

    if (rowRisers.length === 0) return;

    const firstRiserLeft = rowRisers[0].x;
    const lastRiserRight = rowRisers[rowRisers.length - 1].x + rowRisers[rowRisers.length - 1].config.width;
    const totalWidth = lastRiserRight - firstRiserLeft;
    const singerSize = 1.7 * PIXELS_PER_FOOT;
    const singerCenterY = rowRisers[0].y + rowRisers[0].config.height / 2;
    const spacing = (totalWidth - (singerCount * singerSize)) / (singerCount + 1);

    for (let i = 0; i < singerCount; i++) {
        const singerX = firstRiserLeft + spacing + (i * (singerSize + spacing)) + singerSize / 2;
        const singerData = {
            id: `singer-row${rowIndex + 1}-${i + 1}`,
            rowIndex: rowIndex, x: singerX, y: singerCenterY, size: singerSize
        };
        chorusSingers.push(singerData);
        createSingerElement(singerData);
    }
}

function createSingerElement(singerData) {
    const section = document.getElementById('chorus-singers-section');
    if (!section) return;

    // Get current theme's chorus singer colors (read from body since theme classes are applied there)
    const styles = getComputedStyle(document.body);
    let fill = styles.getPropertyValue('--chorus-singer').trim();
    let stroke = styles.getPropertyValue('--chorus-singer-stroke').trim();
    
    // Fallback colors if CSS variables aren't loaded
    if (!fill) fill = '#ef4444';
    if (!stroke) stroke = '#dc2626';

    const singer = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    singer.setAttribute('id', singerData.id);
    singer.setAttribute('x', singerData.x - singerData.size / 2);
    singer.setAttribute('y', singerData.y - singerData.size / 2);
    singer.setAttribute('width', singerData.size);
    singer.setAttribute('height', singerData.size);
    singer.setAttribute('fill', fill);
    singer.setAttribute('stroke', stroke);
    singer.setAttribute('stroke-width', '1');
    singer.setAttribute('data-singer-id', singerData.id);
    singer.setAttribute('data-row-index', singerData.rowIndex);
    singer.classList.add('chorus-singer');
    singer.style.cursor = 'move';

    section.appendChild(singer);
    makeSingerDraggable(singer, singerData.id);
}

function makeSingerDraggable(singer, singerId) {
    singer.addEventListener('mousedown', function(e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            togglePlayerSelection(singerId, singer);
            e.preventDefault();
            return;
        }
        if (!selectedPlayers.has(singerId)) {
            clearSelection();
            addToSelection(singerId, singer);
        }
        startSingerDrag(e, singer, singerId);
    });

    singer.addEventListener('click', function(e) {
        if (!isDragging) { e.stopPropagation(); selectObject(singerId, 'singer'); }
    });
}

function startSingerDrag(e, singer, singerId) {
    isDragging = true;
    draggedElement = singer;
    draggedLabel = null;
    isGroupDragging = selectedPlayers.size > 1;

    // Capture pre-drag state for undo
    preDragState = { chorusSingers: [] };
    if (isGroupDragging) {
        selectedPlayers.forEach(id => {
            const sData = chorusSingers.find(s => s.id === id);
            if (sData) {
                preDragState.chorusSingers.push({ id: sData.id, x: sData.x, y: sData.y });
            }
        });
    } else {
        const sData = chorusSingers.find(s => s.id === singerId);
        if (sData) {
            preDragState.chorusSingers.push({ id: sData.id, x: sData.x, y: sData.y });
        }
    }

    if (isGroupDragging) {
        selectedPlayers.forEach(id => {
            const p = document.querySelector(`[data-player-id="${id}"], [data-singer-id="${id}"]`);
            if (p) p.classList.add('dragging');
        });
    } else {
        singer.classList.add('dragging');
    }

    const mouse = getSvgMousePosition(e);
    const singerData = chorusSingers.find(s => s.id === singerId);
    if (!singerData) return;
    dragOffset = { x: mouse.x - singerData.x, y: mouse.y - singerData.y };

    if (isGroupDragging) {
        groupDragOffsets.clear();
        groupDragLabels.clear();
        selectedPlayers.forEach(id => {
            const element = document.querySelector(`[data-player-id="${id}"], [data-singer-id="${id}"]`);
            if (element) {
                let elemX, elemY;
                if (element.hasAttribute('data-singer-id')) {
                    const sData = chorusSingers.find(s => s.id === id);
                    if (sData) { elemX = sData.x; elemY = sData.y; }
                } else {
                    elemX = parseFloat(element.getAttribute('cx'));
                    elemY = parseFloat(element.getAttribute('cy'));
                }
                if (elemX !== undefined && elemY !== undefined) {
                    groupDragOffsets.set(id, { x: mouse.x - elemX, y: mouse.y - elemY });
                }
            }
        });
    }

    document.addEventListener('mousemove', handleSingerDragMove);
    document.addEventListener('mouseup', handleSingerDragEnd);
}

function handleSingerDragMove(e) {
    if (!isDragging || !draggedElement) return;
    e.preventDefault();

    const mouse = getSvgMousePosition(e);

    if (isGroupDragging) {
        selectedPlayers.forEach(id => {
            const offset = groupDragOffsets.get(id);
            if (!offset) return;
            let newX = Math.max(0, Math.min(SVG_WIDTH, mouse.x - offset.x));
            let newY = Math.max(0, Math.min(SVG_HEIGHT, mouse.y - offset.y));

            const element = document.querySelector(`[data-player-id="${id}"], [data-singer-id="${id}"]`);
            if (element) {
                if (element.hasAttribute('data-singer-id')) {
                    const sData = chorusSingers.find(s => s.id === id);
                    if (sData) {
                        sData.x = newX;
                        sData.y = newY;
                        element.setAttribute('x', newX - sData.size / 2);
                        element.setAttribute('y', newY - sData.size / 2);
                    }
                } else {
                    element.setAttribute('cx', newX);
                    element.setAttribute('cy', newY);
                    updatePlayerOrientation(element, newX, newY);
                }
            }
        });
    } else {
        let newX = Math.max(0, Math.min(SVG_WIDTH, mouse.x - dragOffset.x));
        let newY = Math.max(0, Math.min(SVG_HEIGHT, mouse.y - dragOffset.y));

        const singerId = draggedElement.getAttribute('data-singer-id');
        const singerData = chorusSingers.find(s => s.id === singerId);
        if (singerData) {
            singerData.x = newX;
            singerData.y = newY;
            draggedElement.setAttribute('x', newX - singerData.size / 2);
            draggedElement.setAttribute('y', newY - singerData.size / 2);
        }
    }
}

function handleSingerDragEnd(e) {
    if (isDragging && draggedElement) {
        // Check if singer actually moved (more than 2 pixels)
        let singerMoved = false;
        const singerId = draggedElement.getAttribute('data-singer-id');
        if (singerId && preDragState && preDragState.chorusSingers) {
            const preDragSinger = preDragState.chorusSingers.find(s => s.id === singerId);
            const currentSinger = chorusSingers.find(s => s.id === singerId);
            if (preDragSinger && currentSinger) {
                const distance = Math.sqrt(
                    Math.pow(currentSinger.x - preDragSinger.x, 2) + 
                    Math.pow(currentSinger.y - preDragSinger.y, 2)
                );
                singerMoved = distance > 2;
            }
        }
        
        if (isGroupDragging) {
            selectedPlayers.forEach(id => {
                const p = document.querySelector(`[data-player-id="${id}"], [data-singer-id="${id}"]`);
                if (p) p.classList.remove('dragging');
            });
        } else {
            draggedElement.classList.remove('dragging');
        }
        
        // Push pre-drag state to undo stack (only if moved)
        if (singerMoved && typeof pushUndoStateWithPreDragState === 'function' && preDragState) {
            pushUndoStateWithPreDragState(preDragState);
        }
        preDragState = null;
        
        // Clear selection only if singer actually moved
        if (singerMoved && typeof clearSelection === 'function') {
            clearSelection();
        }
        
        isDragging = false;
        isGroupDragging = false;
        draggedElement = null;
        draggedLabel = null;
        dragOffset = { x: 0, y: 0 };
        groupDragOffsets.clear();
        groupDragLabels.clear();
    }

    document.removeEventListener('mousemove', handleSingerDragMove);
    document.removeEventListener('mouseup', handleSingerDragEnd);
}

function clearChorusSingersForRow(rowIndex) {
    chorusSingers.filter(s => s.rowIndex === rowIndex).forEach(sd => {
        const el = document.getElementById(sd.id);
        if (el) el.remove();
    });
    chorusSingers = chorusSingers.filter(s => s.rowIndex !== rowIndex);
}

function clearAllChorusSingers() {
    chorusSingers.forEach(sd => {
        const el = document.getElementById(sd.id);
        if (el) el.remove();
    });
    chorusSingers = [];
}

function updateTotalSingersCount() {
    const totalCount = chorusSingersPerRow.reduce((sum, count) => sum + count, 0);
    const el = document.getElementById('total-singers-count');
    if (el) el.textContent = totalCount;
}
