// ============================================
// RISERS - Snap, toggle, drag, position management
// ============================================

// --- Riser Selection ---

function addRiserSelectionIndicator(riserId) {
    const riser = document.getElementById(riserId);
    if (!riser) return;
    
    // Remove any existing indicator
    removeRiserSelectionIndicator(riserId);
    
    // Get riser dimensions
    const x = parseFloat(riser.getAttribute('x'));
    const y = parseFloat(riser.getAttribute('y'));
    const width = parseFloat(riser.getAttribute('width'));
    const height = parseFloat(riser.getAttribute('height'));
    
    // Create inner rectangle (inset by 1.5px to account for 3px stroke)
    const indicator = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    indicator.setAttribute('id', `${riserId}-selection`);
    indicator.setAttribute('class', 'riser-selection-indicator');
    indicator.setAttribute('x', x + 1.5);
    indicator.setAttribute('y', y + 1.5);
    indicator.setAttribute('width', width - 3);
    indicator.setAttribute('height', height - 3);
    
    // Insert after the riser so it appears on top
    riser.parentNode.insertBefore(indicator, riser.nextSibling);
}

function removeRiserSelectionIndicator(riserId) {
    const indicator = document.getElementById(`${riserId}-selection`);
    if (indicator) indicator.remove();
}

function selectRiser(riserId) {
    selectedRisers.add(riserId);
    addRiserSelectionIndicator(riserId);
}

function deselectRiser(riserId) {
    selectedRisers.delete(riserId);
    removeRiserSelectionIndicator(riserId);
}

function clearRiserSelection() {
    selectedRisers.forEach(riserId => {
        removeRiserSelectionIndicator(riserId);
    });
    selectedRisers.clear();
}

function toggleRiserSelection(riserId) {
    if (selectedRisers.has(riserId)) {
        deselectRiser(riserId);
    } else {
        selectRiser(riserId);
    }
}

// --- Visible Risers ---

function getAllVisibleRisers() {
    const risers = [];

    // Timpani riser
    const timpaniRiser = document.getElementById('timpani-riser');
    if (timpaniRiser && timpaniRiser.style.display !== 'none') {
        risers.push({
            id: 'timpani-riser', type: 'timpani',
            x: parseFloat(timpaniRiser.getAttribute('x')),
            y: parseFloat(timpaniRiser.getAttribute('y')),
            width: parseFloat(timpaniRiser.getAttribute('width')),
            height: parseFloat(timpaniRiser.getAttribute('height'))
        });
    }

    for (let i = 1; i <= 5; i++) {
        const r = document.getElementById(`brass-riser-${i}`);
        if (r && r.style.display !== 'none') {
            risers.push({
                id: `brass-riser-${i}`, type: 'brass',
                x: parseFloat(r.getAttribute('x')), y: parseFloat(r.getAttribute('y')),
                width: parseFloat(r.getAttribute('width')), height: parseFloat(r.getAttribute('height'))
            });
        }
    }

    for (let i = 1; i <= 4; i++) {
        const r = document.getElementById(`woodwind-riser-${i}`);
        if (r && r.style.display !== 'none') {
            risers.push({
                id: `woodwind-riser-${i}`, type: 'woodwind',
                x: parseFloat(r.getAttribute('x')), y: parseFloat(r.getAttribute('y')),
                width: parseFloat(r.getAttribute('width')), height: parseFloat(r.getAttribute('height'))
            });
        }
    }

    extraRisers.forEach(rd => {
        risers.push({ id: rd.id, type: 'extra', x: rd.x, y: rd.y, width: rd.config.width, height: rd.config.height });
    });

    chorusRisers.forEach(rd => {
        risers.push({ id: rd.id, type: 'chorus', x: rd.x, y: rd.y, width: rd.config.width, height: rd.config.height });
    });

    return risers;
}

// --- Snap-to Logic ---

function getSnapPosition(currentRiserId, newX, newY, riserWidth, riserHeight) {
    const allRisers = getAllVisibleRisers();
    const otherRisers = allRisers.filter(r => r.id !== currentRiserId);

    let snapX = newX;
    let snapY = newY;
    let closestSnapDistance = Infinity;
    let bestSnapX = newX;
    let bestSnapY = newY;

    // Snap to stage center line
    const stageCenterX = 500;
    const riserCenterX = snapX + riserWidth / 2;
    if (Math.abs(riserCenterX - stageCenterX) < SNAP_DISTANCE) {
        snapX = stageCenterX - riserWidth / 2;
    }

    for (const otherRiser of otherRisers) {
        // Use ORIGINAL positions for calculations to avoid interdependencies
        const currentLeft = newX;
        const currentRight = newX + riserWidth;
        const currentTop = newY;
        const currentBottom = newY + riserHeight;
        const currentCenterX = newX + riserWidth / 2;
        const currentCenterY = newY + riserHeight / 2;

        const otherLeft = otherRiser.x;
        const otherRight = otherRiser.x + otherRiser.width;
        const otherTop = otherRiser.y;
        const otherBottom = otherRiser.y + otherRiser.height;
        const otherCenterX = otherRiser.x + otherRiser.width / 2;
        const otherCenterY = otherRiser.y + otherRiser.height / 2;

        const originalLeft = newX;
        const originalRight = newX + riserWidth;

        // Horizontal proximity snapping
        if (Math.abs(originalRight - otherLeft) < SNAP_DISTANCE) {
            snapX = otherLeft - riserWidth;
        } else if (Math.abs(originalLeft - otherRight) < SNAP_DISTANCE) {
            snapX = otherRight;
        }

        // Horizontal edge snapping (Y-axis alignment)
        if (Math.abs(newY - otherRiser.y) < SNAP_TOLERANCE) {
            if (Math.abs(originalRight - otherLeft) < SNAP_DISTANCE) {
                snapX = otherLeft - riserWidth;
            } else if (Math.abs(originalLeft - otherRight) < SNAP_DISTANCE) {
                snapX = otherRight;
            }
        }

        // Brick pattern snapping - horizontal offset
        const halfHeightOffset = Math.abs((newY + riserHeight / 2) - (otherRiser.y + otherRiser.height / 2));
        if (halfHeightOffset < SNAP_TOLERANCE) {
            if (Math.abs(currentRight - otherLeft) < SNAP_DISTANCE) {
                snapX = otherLeft - riserWidth;
                const distance = Math.abs(newY - otherRiser.y);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherRiser.y;
                }
            } else if (Math.abs(currentLeft - otherRight) < SNAP_DISTANCE) {
                snapX = otherRight;
                const distance = Math.abs(newY - otherRiser.y);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherRiser.y;
                }
            }
        }

        // Brick pattern snapping - vertical offset
        const halfWidthOffsetCheck = Math.abs((newX + riserWidth / 2) - (otherRiser.x + otherRiser.width / 2));
        if (halfWidthOffsetCheck < SNAP_TOLERANCE) {
            if (Math.abs(currentBottom - otherTop) < SNAP_DISTANCE) {
                const distance = Math.abs(currentBottom - otherTop);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherTop - riserHeight;
                }
                snapX = otherRiser.x;
            } else if (Math.abs(currentTop - otherBottom) < SNAP_DISTANCE) {
                const distance = Math.abs(currentTop - otherBottom);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherBottom;
                }
                snapX = otherRiser.x;
            }
        }

        // Center-to-center snapping (horizontal brick)
        const halfWidthOffset = riserWidth / 2;
        if (Math.abs(currentCenterX - (otherCenterX + halfWidthOffset)) < SNAP_TOLERANCE ||
            Math.abs(currentCenterX - (otherCenterX - halfWidthOffset)) < SNAP_TOLERANCE) {
            if (Math.abs(currentBottom - otherTop) < SNAP_DISTANCE) {
                const distance = Math.abs(currentBottom - otherTop);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherTop - riserHeight;
                }
                snapX = (Math.abs(currentCenterX - (otherCenterX + halfWidthOffset)) < SNAP_TOLERANCE)
                    ? otherCenterX + halfWidthOffset - riserWidth / 2
                    : otherCenterX - halfWidthOffset - riserWidth / 2;
            } else if (Math.abs(currentTop - otherBottom) < SNAP_DISTANCE) {
                const distance = Math.abs(currentTop - otherBottom);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherBottom;
                }
                snapX = (Math.abs(currentCenterX - (otherCenterX + halfWidthOffset)) < SNAP_TOLERANCE)
                    ? otherCenterX + halfWidthOffset - riserWidth / 2
                    : otherCenterX - halfWidthOffset - riserWidth / 2;
            }
        }

        // Center-to-center snapping (vertical brick) - skip Y snap here, let closest-distance handle it
        const halfHeightOffsetSnap = riserHeight / 2;
        if (Math.abs(currentCenterY - (otherCenterY + halfHeightOffsetSnap)) < SNAP_TOLERANCE ||
            Math.abs(currentCenterY - (otherCenterY - halfHeightOffsetSnap)) < SNAP_TOLERANCE) {
            if (Math.abs(currentRight - otherLeft) < SNAP_DISTANCE) {
                snapX = otherLeft - riserWidth;
            } else if (Math.abs(currentLeft - otherRight) < SNAP_DISTANCE) {
                snapX = otherRight;
            }
        }

        // Bottom edge alignment
        if (Math.abs(currentBottom - otherBottom) < SNAP_TOLERANCE) {
            const distance = Math.abs(currentBottom - otherBottom);
            if (distance < closestSnapDistance) {
                closestSnapDistance = distance;
                bestSnapY = otherBottom - riserHeight;
            }
            if (Math.abs(currentRight - otherLeft) < SNAP_DISTANCE) snapX = otherLeft - riserWidth;
            else if (Math.abs(currentLeft - otherRight) < SNAP_DISTANCE) snapX = otherRight;
        }

        // Top edge alignment
        if (Math.abs(currentTop - otherTop) < SNAP_TOLERANCE) {
            const distance = Math.abs(currentTop - otherTop);
            if (distance < closestSnapDistance) {
                closestSnapDistance = distance;
                bestSnapY = otherTop;
            }
            if (Math.abs(currentRight - otherLeft) < SNAP_DISTANCE) snapX = otherLeft - riserWidth;
            else if (Math.abs(currentLeft - otherRight) < SNAP_DISTANCE) snapX = otherRight;
        }

        // Vertical proximity snapping - use original positions
        if (Math.abs(currentTop - otherBottom) < SNAP_DISTANCE) {
            const distance = Math.abs(currentTop - otherBottom);
            if (distance < closestSnapDistance) {
                closestSnapDistance = distance;
                bestSnapY = otherBottom;
            }
        }
        if (Math.abs(currentBottom - otherTop) < SNAP_DISTANCE) {
            const distance = Math.abs(currentBottom - otherTop);
            if (distance < closestSnapDistance) {
                closestSnapDistance = distance;
                bestSnapY = otherTop - riserHeight;
            }
        }

        // Vertical edge snapping (X-axis alignment) - only if X is well-aligned
        if (Math.abs(newX - otherRiser.x) < SNAP_TOLERANCE) {
            if (Math.abs(currentBottom - otherTop) < SNAP_DISTANCE) {
                const distance = Math.abs(currentBottom - otherTop);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherTop - riserHeight;
                }
            }
            if (Math.abs(currentTop - otherBottom) < SNAP_DISTANCE) {
                const distance = Math.abs(currentTop - otherBottom);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherBottom;
                }
            }
        }

        // Left edge alignment
        if (Math.abs(currentLeft - otherLeft) < SNAP_TOLERANCE) {
            snapX = otherLeft;
            if (Math.abs(currentBottom - otherTop) < SNAP_DISTANCE) {
                const distance = Math.abs(currentBottom - otherTop);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherTop - riserHeight;
                }
            }
            if (Math.abs(currentTop - otherBottom) < SNAP_DISTANCE) {
                const distance = Math.abs(currentTop - otherBottom);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherBottom;
                }
            }
        }

        // Right edge alignment
        if (Math.abs(currentRight - otherRight) < SNAP_TOLERANCE) {
            snapX = otherRight - riserWidth;
            if (Math.abs(currentBottom - otherTop) < SNAP_DISTANCE) {
                const distance = Math.abs(currentBottom - otherTop);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherTop - riserHeight;
                }
            }
            if (Math.abs(currentTop - otherBottom) < SNAP_DISTANCE) {
                const distance = Math.abs(currentTop - otherBottom);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherBottom;
                }
            }
        }

        // Center-to-edge snapping (horizontal)
        if (Math.abs(currentCenterX - otherLeft) < SNAP_TOLERANCE) {
            snapX = otherLeft - riserWidth / 2;
            if (Math.abs(currentBottom - otherTop) < SNAP_DISTANCE) {
                const distance = Math.abs(currentBottom - otherTop);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherTop - riserHeight;
                }
            }
            if (Math.abs(currentTop - otherBottom) < SNAP_DISTANCE) {
                const distance = Math.abs(currentTop - otherBottom);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherBottom;
                }
            }
        } else if (Math.abs(currentCenterX - otherRight) < SNAP_TOLERANCE) {
            snapX = otherRight - riserWidth / 2;
            if (Math.abs(currentBottom - otherTop) < SNAP_DISTANCE) {
                const distance = Math.abs(currentBottom - otherTop);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherTop - riserHeight;
                }
            }
            if (Math.abs(currentTop - otherBottom) < SNAP_DISTANCE) {
                const distance = Math.abs(currentTop - otherBottom);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherBottom;
                }
            }
        }

        // Corner-to-corner and edge-to-edge
        const distanceX = Math.min(
            Math.abs(currentLeft - otherLeft), Math.abs(currentLeft - otherRight),
            Math.abs(currentRight - otherLeft), Math.abs(currentRight - otherRight)
        );
        const distanceY = Math.min(
            Math.abs(currentTop - otherTop), Math.abs(currentTop - otherBottom),
            Math.abs(currentBottom - otherTop), Math.abs(currentBottom - otherBottom)
        );

        if (distanceX < SNAP_DISTANCE && distanceY < SNAP_DISTANCE) {
            if (Math.abs(currentLeft - otherLeft) < SNAP_TOLERANCE) snapX = otherLeft;
            else if (Math.abs(currentRight - otherRight) < SNAP_TOLERANCE) snapX = otherRight - riserWidth;
            else if (Math.abs(currentLeft - otherRight) < SNAP_TOLERANCE) snapX = otherRight;
            else if (Math.abs(currentRight - otherLeft) < SNAP_TOLERANCE) snapX = otherLeft - riserWidth;

            if (Math.abs(currentTop - otherTop) < SNAP_TOLERANCE) {
                const distance = Math.abs(currentTop - otherTop);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherTop;
                }
            }
            if (Math.abs(currentBottom - otherBottom) < SNAP_TOLERANCE) {
                const distance = Math.abs(currentBottom - otherBottom);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherBottom - riserHeight;
                }
            }
            if (Math.abs(currentTop - otherBottom) < SNAP_TOLERANCE) {
                const distance = Math.abs(currentTop - otherBottom);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherBottom;
                }
            }
            if (Math.abs(currentBottom - otherTop) < SNAP_TOLERANCE) {
                const distance = Math.abs(currentBottom - otherTop);
                if (distance < closestSnapDistance) {
                    closestSnapDistance = distance;
                    bestSnapY = otherTop - riserHeight;
                }
            }
        }
    }

    // Apply the closest snap found (if any)
    if (closestSnapDistance < Infinity) {
        snapY = bestSnapY;
    }

    return { x: snapX, y: snapY };
}

// --- Generic Riser Drag System ---
// Replaces the 4 nearly-identical drag implementations for brass, woodwind, timpani, and extra risers

function startGenericRiserDrag(e, riserId, getPosition, setPosition, riserWidth, riserHeight, setDragging) {
    // Handle multi-selection with Ctrl/Cmd/Shift key
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
        toggleRiserSelection(riserId);
        return;
    }

    if (!selectedRisers.has(riserId)) {
        clearRiserSelection();
        selectRiser(riserId);
    }

    if (selectedRisers.size > 1) {
        isGroupDraggingRisers = true;
    }

    // Capture pre-drag state for undo
    preDragState = { risers: {} };
    if (isGroupDraggingRisers) {
        // Store positions of all selected risers
        selectedRisers.forEach(id => {
            const rPos = getRiserPosition(id);
            if (rPos) {
                preDragState.risers[id] = { x: rPos.x, y: rPos.y };
            }
        });
    } else {
        // Store position of single riser
        const rPos = getPosition(riserId);
        preDragState.risers[riserId] = { x: rPos.x, y: rPos.y };
    }

    setDragging(true);
    document.getElementById(riserId).classList.add('dragging');

    const mouse = getSvgMousePosition(e);
    const pos = getPosition(riserId);

    // Store drag context
    _riserDragContext = {
        riserId, getPosition, setPosition, riserWidth, riserHeight, setDragging,
        offset: { x: mouse.x - pos.x, y: mouse.y - pos.y }
    };

    // Group drag offsets
    if (isGroupDraggingRisers) {
        groupRiserDragOffsets.clear();
        selectedRisers.forEach(id => {
            const riser = document.getElementById(id);
            if (riser && riser.getAttribute('data-riser-type')) {
                const rPos = getRiserPosition(id);
                if (rPos) {
                    groupRiserDragOffsets.set(id, { x: mouse.x - rPos.x, y: mouse.y - rPos.y });
                    riser.classList.add('dragging');
                }
            }
        });
    }

    document.addEventListener('mousemove', handleGenericRiserDragMove);
    document.addEventListener('mouseup', handleGenericRiserDragEnd);
    document.addEventListener('touchmove', handleGenericRiserDragMove);
    document.addEventListener('touchend', handleGenericRiserDragEnd);
}

// Shared drag context for the active drag operation
let _riserDragContext = null;

function handleGenericRiserDragMove(e) {
    if (!_riserDragContext) return;
    e.preventDefault();

    const ctx = _riserDragContext;
    const mouse = getSvgMousePosition(e);

    let newX = mouse.x - ctx.offset.x;
    let newY = mouse.y - ctx.offset.y;

    const constrained = constrainToCanvas(newX, newY);
    newX = constrained.x;
    newY = constrained.y;

    // Always apply snap to the primary riser
    const snapPos = getSnapPosition(ctx.riserId, newX, newY, ctx.riserWidth, ctx.riserHeight);
    const snapDeltaX = snapPos.x - newX;
    const snapDeltaY = snapPos.y - newY;
    newX = snapPos.x;
    newY = snapPos.y;

    ctx.setPosition(ctx.riserId, { x: newX, y: newY });

    // Group drag: update all selected risers - each checks for snapping individually
    if (isGroupDraggingRisers) {
        selectedRisers.forEach(id => {
            if (id !== ctx.riserId) {
                const offset = groupRiserDragOffsets.get(id);
                if (offset) {
                    let rx = mouse.x - offset.x;
                    let ry = mouse.y - offset.y;
                    const rc = constrainToCanvas(rx, ry);
                    
                    // Apply the primary snap delta first to maintain group alignment
                    rx = rc.x + snapDeltaX;
                    ry = rc.y + snapDeltaY;
                    
                    // Get this riser's dimensions
                    let riserWidth, riserHeight;
                    if (id === 'timpani-riser') {
                        riserWidth = 120;
                        riserHeight = 120;
                    } else if (id.startsWith('brass-riser-') || id.startsWith('woodwind-riser-')) {
                        riserWidth = 120;
                        riserHeight = 60;
                    } else {
                        // Default to assuming it's an 8x4 riser
                        riserWidth = 120;
                        riserHeight = 60;
                    }
                    
                    // Then check if THIS riser can snap to something nearby
                    const individualSnap = getSnapPosition(id, rx, ry, riserWidth, riserHeight);
                    
                    // Only apply individual snap if it's significant (within snap tolerance)
                    const individualSnapDeltaX = individualSnap.x - rx;
                    const individualSnapDeltaY = individualSnap.y - ry;
                    
                    // If this riser found a snap point very close by, use it
                    if (Math.abs(individualSnapDeltaX) < SNAP_TOLERANCE && Math.abs(individualSnapDeltaY) < SNAP_TOLERANCE) {
                        setRiserPosition(id, { x: individualSnap.x, y: individualSnap.y });
                    } else {
                        // Otherwise just use the group delta
                        setRiserPosition(id, { x: rx, y: ry });
                    }
                }
            }
        });
    }

    if (debugMode) updateDebugInfo();
}

function handleGenericRiserDragEnd(e) {
    if (!_riserDragContext) return;

    const ctx = _riserDragContext;
    
    // Check if riser actually moved (more than 2 pixels)
    let riserMoved = false;
    if (preDragState && preDragState.risers && preDragState.risers[ctx.riserId]) {
        const currentPos = ctx.getPosition(ctx.riserId);
        const preDragPos = preDragState.risers[ctx.riserId];
        const distance = Math.sqrt(
            Math.pow(currentPos.x - preDragPos.x, 2) + 
            Math.pow(currentPos.y - preDragPos.y, 2)
        );
        riserMoved = distance > 2;
    }
    
    document.getElementById(ctx.riserId).classList.remove('dragging');

    if (isGroupDraggingRisers) {
        selectedRisers.forEach(id => {
            const riser = document.getElementById(id);
            if (riser) riser.classList.remove('dragging');
        });
        isGroupDraggingRisers = false;
        groupRiserDragOffsets.clear();
    }

    ctx.setDragging(false);
    _riserDragContext = null;

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

    e.preventDefault();
    if (document.activeElement) document.activeElement.blur();

    document.removeEventListener('mousemove', handleGenericRiserDragMove);
    document.removeEventListener('mouseup', handleGenericRiserDragEnd);
    document.removeEventListener('touchmove', handleGenericRiserDragMove);
    document.removeEventListener('touchend', handleGenericRiserDragEnd);
}

// --- Position getters/setters for each riser type ---

function getRiserPosition(id) {
    if (id.startsWith('brass-riser-')) return brassRiserPositions[id];
    if (id.startsWith('woodwind-riser-')) return woodwindRiserPositions[id];
    if (id === 'timpani-riser') return timpaniRiserPosition;
    if (id.startsWith('extra-riser-')) {
        const rd = extraRisers.find(r => r.id === id);
        return rd ? { x: rd.x, y: rd.y } : null;
    }
    if (id.startsWith('chorus-riser-')) {
        const rd = chorusRisers.find(r => r.id === id);
        return rd ? { x: rd.x, y: rd.y } : null;
    }
    return null;
}

function setRiserPosition(id, pos) {
    if (id.startsWith('brass-riser-')) {
        brassRiserPositions[id] = pos;
        updateBrassRiserPosition(id);
    } else if (id.startsWith('woodwind-riser-')) {
        woodwindRiserPositions[id] = pos;
        updateWoodwindRiserPosition(id);
    } else if (id === 'timpani-riser') {
        timpaniRiserPosition = pos;
        updateTimpaniRiserPosition();
    } else if (id.startsWith('extra-riser-')) {
        const rd = extraRisers.find(r => r.id === id);
        if (rd) { rd.x = pos.x; rd.y = pos.y; updateExtraRiserPosition(rd); }
    } else if (id.startsWith('chorus-riser-')) {
        const rd = chorusRisers.find(r => r.id === id);
        if (rd) { rd.x = pos.x; rd.y = pos.y; updateChorusRiserPosition(rd); }
    }
}

// --- Initialize Riser Drag Handlers ---

function initializeTimpaniRiser() {
    const riser = document.getElementById('timpani-riser');
    if (!riser) return;

    riser.addEventListener('mousedown', function(e) {
        startGenericRiserDrag(e, 'timpani-riser',
            () => timpaniRiserPosition,
            (id, pos) => { timpaniRiserPosition = pos; updateTimpaniRiserPosition(); },
            120, 120,
            (v) => { timpaniRiserDragging = v; }
        );
    });
    riser.addEventListener('touchstart', function(e) {
        e.preventDefault();
        startGenericRiserDrag(e.touches[0], 'timpani-riser',
            () => timpaniRiserPosition,
            (id, pos) => { timpaniRiserPosition = pos; updateTimpaniRiserPosition(); },
            120, 120,
            (v) => { timpaniRiserDragging = v; }
        );
    });
    riser.addEventListener('click', function(e) {
        if (!timpaniRiserDragging && !justFinishedDrag) {
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
                toggleRiserSelection('timpani-riser');
            } else {
                selectObject('timpani-riser', 'timpani-riser');
            }
        }
    });
}

function initializeBrassRisers() {
    const ids = ['brass-riser-1', 'brass-riser-2', 'brass-riser-3', 'brass-riser-4', 'brass-riser-5'];
    ids.forEach(id => {
        const riser = document.getElementById(id);
        if (!riser) return;

        riser.addEventListener('mousedown', function(e) {
            startGenericRiserDrag(e, id,
                (rid) => brassRiserPositions[rid],
                (rid, pos) => { brassRiserPositions[rid] = pos; updateBrassRiserPosition(rid); },
                120, 60,
                (v) => { brassRiserDragging = v; currentBrassRiser = v ? id : null; }
            );
        });
        riser.addEventListener('touchstart', function(e) {
            e.preventDefault();
            startGenericRiserDrag(e.touches[0], id,
                (rid) => brassRiserPositions[rid],
                (rid, pos) => { brassRiserPositions[rid] = pos; updateBrassRiserPosition(rid); },
                120, 60,
                (v) => { brassRiserDragging = v; currentBrassRiser = v ? id : null; }
            );
        });
        riser.addEventListener('click', function(e) {
            if (!brassRiserDragging && !justFinishedDrag) {
                e.stopPropagation();
                if (e.ctrlKey || e.metaKey) {
                    toggleRiserSelection(id);
                } else {
                    selectObject(id, 'brass-riser');
                }
            }
        });
    });
}

function initializeWoodwindRisers() {
    const ids = ['woodwind-riser-1', 'woodwind-riser-2', 'woodwind-riser-3', 'woodwind-riser-4'];
    ids.forEach(id => {
        const riser = document.getElementById(id);
        if (!riser) return;

        riser.addEventListener('mousedown', function(e) {
            startGenericRiserDrag(e, id,
                (rid) => woodwindRiserPositions[rid],
                (rid, pos) => { woodwindRiserPositions[rid] = pos; updateWoodwindRiserPosition(rid); },
                120, 60,
                (v) => { woodwindRiserDragging = v; currentWoodwindRiser = v ? id : null; }
            );
        });
        riser.addEventListener('touchstart', function(e) {
            e.preventDefault();
            startGenericRiserDrag(e.touches[0], id,
                (rid) => woodwindRiserPositions[rid],
                (rid, pos) => { woodwindRiserPositions[rid] = pos; updateWoodwindRiserPosition(rid); },
                120, 60,
                (v) => { woodwindRiserDragging = v; currentWoodwindRiser = v ? id : null; }
            );
        });
        riser.addEventListener('click', function(e) {
            if (!woodwindRiserDragging && !justFinishedDrag) {
                e.stopPropagation();
                if (e.ctrlKey || e.metaKey) {
                    toggleRiserSelection(id);
                } else {
                    selectObject(id, 'woodwind-riser');
                }
            }
        });
    });
}

// --- Position Update Functions ---

function updateBrassRiserPosition(riserId) {
    const riser = document.getElementById(riserId);
    const label = document.getElementById(riserId + '-label');
    if (riser && label) {
        const pos = brassRiserPositions[riserId];
        riser.setAttribute('x', pos.x);
        riser.setAttribute('y', pos.y);
        label.setAttribute('x', pos.x + 60);
        label.setAttribute('y', pos.y + 35);
        
        // Update selection indicator if selected
        const indicator = document.getElementById(`${riserId}-selection`);
        if (indicator) {
            const width = parseFloat(riser.getAttribute('width'));
            const height = parseFloat(riser.getAttribute('height'));
            indicator.setAttribute('x', pos.x + 1.5);
            indicator.setAttribute('y', pos.y + 1.5);
            indicator.setAttribute('width', width - 3);
            indicator.setAttribute('height', height - 3);
        }
    }
}

function updateWoodwindRiserPosition(riserId) {
    const riser = document.getElementById(riserId);
    const label = document.getElementById(riserId + '-label');
    if (riser && label) {
        const pos = woodwindRiserPositions[riserId];
        riser.setAttribute('x', pos.x);
        riser.setAttribute('y', pos.y);
        label.setAttribute('x', pos.x + 60);
        label.setAttribute('y', pos.y + 35);
        
        // Update selection indicator if selected
        const indicator = document.getElementById(`${riserId}-selection`);
        if (indicator) {
            const width = parseFloat(riser.getAttribute('width'));
            const height = parseFloat(riser.getAttribute('height'));
            indicator.setAttribute('x', pos.x + 1.5);
            indicator.setAttribute('y', pos.y + 1.5);
            indicator.setAttribute('width', width - 3);
            indicator.setAttribute('height', height - 3);
        }
    }
}

function updateTimpaniRiserPosition() {
    const riser = document.getElementById('timpani-riser');
    const label = document.getElementById('timpani-riser-label');
    if (riser && label) {
        riser.setAttribute('x', timpaniRiserPosition.x);
        riser.setAttribute('y', timpaniRiserPosition.y);
        label.setAttribute('x', timpaniRiserPosition.x + 60);
        label.setAttribute('y', timpaniRiserPosition.y + 65);
        
        // Update selection indicator if selected
        const indicator = document.getElementById('timpani-riser-selection');
        if (indicator) {
            const width = parseFloat(riser.getAttribute('width'));
            const height = parseFloat(riser.getAttribute('height'));
            indicator.setAttribute('x', timpaniRiserPosition.x + 1.5);
            indicator.setAttribute('y', timpaniRiserPosition.y + 1.5);
            indicator.setAttribute('width', width - 3);
            indicator.setAttribute('height', height - 3);
        }
    }
}

// --- Reset Functions ---

function resetBrassRiserPositions() {
    brassRiserPositions = {
        'brass-riser-1': { x: 380, y: 95 },
        'brass-riser-2': { x: 500, y: 95 },
        'brass-riser-3': { x: 620, y: 95 },
        'brass-riser-4': { x: 380, y: 155 },
        'brass-riser-5': { x: 500, y: 155 }
    };
    Object.keys(brassRiserPositions).forEach(id => updateBrassRiserPosition(id));
}

function resetWoodwindRiserPositions() {
    woodwindRiserPositions = {
        'woodwind-riser-1': { x: 380, y: 245 },
        'woodwind-riser-2': { x: 500, y: 245 },
        'woodwind-riser-3': { x: 380, y: 305 },
        'woodwind-riser-4': { x: 500, y: 305 }
    };
    Object.keys(woodwindRiserPositions).forEach(id => updateWoodwindRiserPosition(id));
}

function resetTimpaniRiserPosition() {
    timpaniRiserPosition = { x: 260, y: 95 };
    updateTimpaniRiserPosition();
}

// --- Toggle Functions ---

function toggleTimpaniRiser() {
    const checkbox = document.getElementById('timpani-riser-checkbox');
    const section = document.getElementById('timpani-riser-section');
    if (checkbox.checked) {
        if (chorusEnabled) {
            timpaniRiserPosition = { x: 100, y: 800 };
            updateTimpaniRiserPosition();
        }
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

function toggleBrassRiser(riserId) {
    const checkbox = document.getElementById(riserId + '-checkbox');
    const riser = document.getElementById(riserId);
    const label = document.getElementById(riserId + '-label');
    if (checkbox.checked) {
        if (chorusEnabled) {
            const num = parseInt(riserId.match(/\d+/)[0]);
            const row = Math.floor((num - 1) / 2);
            const col = (num - 1) % 2;
            brassRiserPositions[riserId] = { x: 100 + (col * 140), y: 200 + (row * 80) };
            updateBrassRiserPosition(riserId);
        }
        riser.style.display = 'block';
        label.style.display = 'block';
    } else {
        riser.style.display = 'none';
        label.style.display = 'none';
    }
}

function toggleWoodwindRiser(riserId) {
    const checkbox = document.getElementById(riserId + '-checkbox');
    const riser = document.getElementById(riserId);
    const label = document.getElementById(riserId + '-label');
    if (checkbox.checked) {
        if (chorusEnabled) {
            const num = parseInt(riserId.match(/\d+/)[0]);
            const row = Math.floor((num - 1) / 2);
            const col = (num - 1) % 2;
            woodwindRiserPositions[riserId] = { x: 700 + (col * 140), y: 200 + (row * 80) };
            updateWoodwindRiserPosition(riserId);
        }
        riser.style.display = 'block';
        label.style.display = 'block';
    } else {
        riser.style.display = 'none';
        label.style.display = 'none';
    }
}

function toggleStageExtension(extensionId) {
    const checkbox = document.getElementById(extensionId + '-checkbox');
    const section = document.getElementById(extensionId + '-section');
    section.style.display = checkbox.checked ? 'block' : 'none';
}

// --- Extra Risers ---

function getNextRiserNumber() {
    if (extraRisers.length === 0) return 1;
    const existingNumbers = extraRisers.map(r => {
        const match = r.id.match(/extra-riser-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    });
    return Math.max(...existingNumbers) + 1;
}

function addNewRiser() {
    const sizeSelect = document.getElementById('riser-size-select');
    const riserSize = sizeSelect.value;
    const riserNumber = getNextRiserNumber();
    const riserId = `extra-riser-${riserNumber}`;
    const config = riserConfigs[riserSize];

    const riserData = {
        id: riserId, size: riserSize, config: config,
        x: 400, y: 400,
        dragging: false, dragOffset: { x: 0, y: 0 },
        number: riserNumber
    };

    extraRisers.push(riserData);
    createRiserElements(riserData);
    updateExtraRiserCount();
    initializeExtraRiser(riserId);
}

function createRiserElements(riserData) {
    const svg = document.querySelector('#extra-risers-section');

    // Get current theme colors
    const riserColors = (typeof getCurrentRiserColors === 'function') 
        ? getCurrentRiserColors() 
        : { fill: riserData.config.fill, stroke: riserData.config.stroke };

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('id', riserData.id);
    rect.setAttribute('x', riserData.x);
    rect.setAttribute('y', riserData.y);
    rect.setAttribute('width', riserData.config.width);
    rect.setAttribute('height', riserData.config.height);
    rect.setAttribute('fill', riserColors.fill);
    rect.setAttribute('stroke', riserColors.stroke);
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('data-riser-type', 'extra');
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
    const num = riserData.number || parseInt(riserData.id.match(/extra-riser-(\d+)/)?.[1] || '0', 10);
    text.textContent = `${riserData.size.replace('x', '\u00d7')} #${num}`;

    svg.appendChild(rect);
    svg.appendChild(text);
}

function initializeExtraRiser(riserId) {
    const riser = document.getElementById(riserId);
    if (!riser) return;

    riser.addEventListener('mousedown', function(e) { startExtraRiserDrag(e, riserId); });
    riser.addEventListener('touchstart', function(e) { e.preventDefault(); startExtraRiserDrag(e.touches[0], riserId); });
    riser.addEventListener('click', function(e) {
        const rd = extraRisers.find(r => r.id === riserId);
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

function startExtraRiserDrag(e, riserId) {
    if (e.ctrlKey || e.metaKey || e.shiftKey) { toggleRiserSelection(riserId); return; }
    if (!selectedRisers.has(riserId)) { clearRiserSelection(); selectRiser(riserId); }

    const rd = extraRisers.find(r => r.id === riserId);
    if (!rd) return;
    
    // Check if group dragging
    const isGroupDrag = selectedRisers.size > 1;
    
    // Capture pre-drag state for undo
    preDragState = { risers: { extra: [] } };
    if (isGroupDrag) {
        selectedRisers.forEach(id => {
            if (id.startsWith('extra-riser-')) {
                const r = extraRisers.find(r => r.id === id);
                if (r) preDragState.risers.extra.push({ id: r.id, x: r.x, y: r.y });
            }
        });
    } else {
        preDragState.risers.extra.push({ id: rd.id, x: rd.x, y: rd.y });
    }
    
    rd.dragging = true;
    rd.isGroupDrag = isGroupDrag;
    document.getElementById(riserId).classList.add('dragging');
    
    // Store initial positions for all selected extra risers
    if (isGroupDrag) {
        rd.groupDragOffsets = new Map();
        const mouse = getSvgMousePosition(e);
        selectedRisers.forEach(id => {
            if (id.startsWith('extra-riser-')) {
                const r = extraRisers.find(r => r.id === id);
                if (r) {
                    r.groupDragOffset = { x: mouse.x - r.x, y: mouse.y - r.y };
                    document.getElementById(id).classList.add('dragging');
                }
            }
        });
    }

    const mouse = getSvgMousePosition(e);
    rd.dragOffset = { x: mouse.x - rd.x, y: mouse.y - rd.y };

    document.addEventListener('mousemove', handleExtraRiserDragMove);
    document.addEventListener('mouseup', handleExtraRiserDragEnd);
    document.addEventListener('touchmove', handleExtraRiserDragMove);
    document.addEventListener('touchend', handleExtraRiserDragEnd);
}

function handleExtraRiserDragMove(e) {
    const rd = extraRisers.find(r => r.dragging);
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
    rd.x = snap.x;
    rd.y = snap.y;
    updateExtraRiserPosition(rd);
    
    // Move all other selected extra risers - each one checks for snapping individually
    if (rd.isGroupDrag) {
        selectedRisers.forEach(id => {
            if (id !== rd.id && id.startsWith('extra-riser-')) {
                const r = extraRisers.find(r => r.id === id);
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
                    
                    // If this riser found a snap point very close by, use it
                    if (Math.abs(individualSnapDeltaX) < SNAP_TOLERANCE && Math.abs(individualSnapDeltaY) < SNAP_TOLERANCE) {
                        r.x = individualSnap.x;
                        r.y = individualSnap.y;
                    } else {
                        // Otherwise just use the group delta
                        r.x = rx;
                        r.y = ry;
                    }
                    
                    updateExtraRiserPosition(r);
                }
            }
        });
    }
}

function handleExtraRiserDragEnd(e) {
    const rd = extraRisers.find(r => r.dragging);
    if (!rd) return;
    
    // Check if riser actually moved (more than 2 pixels)
    let riserMoved = false;
    if (preDragState && preDragState.risers && preDragState.risers.extra && preDragState.risers.extra.length > 0) {
        const preDragPos = preDragState.risers.extra[0];
        const distance = Math.sqrt(
            Math.pow(rd.x - preDragPos.x, 2) + 
            Math.pow(rd.y - preDragPos.y, 2)
        );
        riserMoved = distance > 2;
    }
    
    rd.dragging = false;
    document.getElementById(rd.id).classList.remove('dragging');
    
    // Clean up group drag state
    if (rd.isGroupDrag) {
        selectedRisers.forEach(id => {
            if (id.startsWith('extra-riser-')) {
                const r = extraRisers.find(r => r.id === id);
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

    document.removeEventListener('mousemove', handleExtraRiserDragMove);
    document.removeEventListener('mouseup', handleExtraRiserDragEnd);
    document.removeEventListener('touchmove', handleExtraRiserDragMove);
    document.removeEventListener('touchend', handleExtraRiserDragEnd);
}

function updateExtraRiserPosition(riserData) {
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

function removeLastRiser() {
    if (extraRisers.length === 0) return;
    const last = extraRisers.pop();
    const el = document.getElementById(last.id);
    const label = document.getElementById(last.id + '-label');
    if (el) el.remove();
    if (label) label.remove();
    updateExtraRiserCount();
}

function updateExtraRiserCount() {
    const el = document.getElementById('extra-riser-count');
    if (el) el.textContent = `Extra risers: ${extraRisers.length}`;
}

// --- Delete Selected Risers ---

function deleteSelectedRisers() {
    let risersToDelete = [];

    if (selectedRisers.size > 0) {
        risersToDelete = Array.from(selectedRisers);
    } else if (selectedObject && (selectedObjectType === 'timpani-riser' ||
               selectedObjectType === 'brass-riser' || selectedObjectType === 'woodwind-riser' ||
               (selectedObject && selectedObject.startsWith('extra-riser-')) ||
               (selectedObject && selectedObject.startsWith('chorus-riser-')))) {
        risersToDelete = [selectedObject];
    }

    if (risersToDelete.length === 0) return;

    risersToDelete.forEach(riserId => {
        if (riserId === 'timpani-riser') {
            const cb = document.getElementById('timpani-riser-checkbox');
            if (cb) { cb.checked = false; toggleTimpaniRiser(); }
        } else if (riserId.startsWith('brass-riser-')) {
            const cb = document.getElementById(riserId + '-checkbox');
            if (cb) { cb.checked = false; toggleBrassRiser(riserId); }
        } else if (riserId.startsWith('woodwind-riser-')) {
            const cb = document.getElementById(riserId + '-checkbox');
            if (cb) { cb.checked = false; toggleWoodwindRiser(riserId); }
        } else if (riserId.startsWith('extra-riser-')) {
            const idx = extraRisers.findIndex(r => r.id === riserId);
            if (idx !== -1) {
                extraRisers.splice(idx, 1);
                const el = document.getElementById(riserId);
                const label = document.getElementById(riserId + '-label');
                if (el) el.remove();
                if (label) label.remove();
                updateExtraRiserCount();
            }
        } else if (riserId.startsWith('chorus-riser-')) {
            const idx = chorusRisers.findIndex(r => r.id === riserId);
            if (idx !== -1) {
                chorusRisers.splice(idx, 1);
                const el = document.getElementById(riserId);
                const label = document.getElementById(riserId + '-label');
                if (el) el.remove();
                if (label) label.remove();
                const riserNumber = parseInt(riserId.match(/chorus-riser-(\d+)/)?.[1] || '0');
                const rowIndex = Math.floor((riserNumber - 1) / 4);
                const singersInRow = chorusSingersPerRow[rowIndex] || 0;
                if (singersInRow > 0) {
                    clearChorusSingersForRow(rowIndex);
                    createSingersForRow(rowIndex, singersInRow);
                }
            }
        }

        selectedRisers.delete(riserId);
        const el = document.getElementById(riserId);
        if (el) el.classList.remove('selected');
        removeRiserSelectionIndicator(riserId);
    });

    if (selectedObject && selectedObject.startsWith('extra-riser-')) {
        selectedObject = null;
        selectedObjectType = null;
    }

    updateStagePlot();
}
