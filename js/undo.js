// ============================================
// UNDO - Position history and undo/redo
// ============================================

const MAX_UNDO_LEVELS = 20;
let undoStack = [];
let redoStack = [];
let isUndoing = false; // Flag to prevent capturing state during undo/redo
let inputChangeTimeout = null;
let preInputState = null;

// Capture current state of all movable objects
function captureState(includeInputs = false) {
    if (isUndoing) return; // Don't capture during undo/redo operations
    
    const state = {
        timestamp: Date.now(),
        players: {},
        risers: {
            timpani: null,
            brass: {},
            woodwind: {},
            extra: [],
            chorus: []
        },
        podium: null,
        piano: null,
        percussionBlob: null,
        chorusSingers: []
    };
    
    // Only capture input values if explicitly requested (for input-based undo)
    if (includeInputs) {
        state.inputs = {};
        const allInputs = document.querySelectorAll('.calculator input[type="number"], .calculator input[type="checkbox"]');
        allInputs.forEach(input => {
            if (!input.id) return; // Skip inputs without IDs
            if (input.type === 'checkbox') {
                state.inputs[input.id] = input.checked;
            } else {
                state.inputs[input.id] = input.value;
            }
        });
    }
    
    // Capture player positions (only those with custom positions)
    Object.keys(customPositions).forEach(id => {
        const player = document.querySelector(`[data-player-id="${id}"]`);
        if (player) {
            const x = parseFloat(player.getAttribute('cx') || player.getAttribute('x'));
            const y = parseFloat(player.getAttribute('cy') || player.getAttribute('y'));
            state.players[id] = { x, y };
        }
    });
    
    // Capture timpani riser
    if (timpaniRiserPosition) {
        state.risers.timpani = { ...timpaniRiserPosition };
    }
    
    // Capture brass risers
    Object.keys(brassRiserPositions).forEach(id => {
        state.risers.brass[id] = { ...brassRiserPositions[id] };
    });
    
    // Capture woodwind risers
    Object.keys(woodwindRiserPositions).forEach(id => {
        state.risers.woodwind[id] = { ...woodwindRiserPositions[id] };
    });
    
    // Capture extra risers
    extraRisers.forEach(riser => {
        state.risers.extra.push({
            id: riser.id,
            x: riser.x,
            y: riser.y
        });
    });
    
    // Capture chorus risers
    chorusRisers.forEach(riser => {
        state.risers.chorus.push({
            id: riser.id,
            x: riser.x,
            y: riser.y
        });
    });
    
    // Capture podium
    if (podiumPosition) {
        state.podium = { ...podiumPosition };
    }
    
    // Capture concert grand
    if (concertGrandPosition) {
        state.piano = { ...concertGrandPosition };
    }
    
    // Capture percussion blob vertices
    if (percussionBlob && percussionBlob.controlPoints) {
        state.percussionBlob = {
            vertices: percussionBlob.controlPoints.map(v => ({ ...v }))
        };
    }
    
    // Capture chorus singers
    chorusSingers.forEach(singer => {
        state.chorusSingers.push({
            id: singer.id,
            x: singer.x,
            y: singer.y
        });
    });
    
    return state;
}

// Push current state onto undo stack
function pushUndoState() {
    if (isUndoing) return; // Don't push during undo/redo
    
    const state = captureState();
    if (!state) return;
    
    undoStack.push(state);
    
    // Limit stack size
    if (undoStack.length > MAX_UNDO_LEVELS) {
        undoStack.shift(); // Remove oldest
    }
    
    // Clear redo stack when new action is performed
    redoStack = [];
    
    updateUndoUI();
}

// Push state with specific player positions (for drag operations)
function pushUndoStateWithPositions(playerPositions) {
    if (isUndoing) return; // Don't push during undo/redo
    
    const state = captureState();
    if (!state) return;
    
    // Override player positions with the provided pre-drag positions
    state.players = playerPositions;
    
    undoStack.push(state);
    
    // Limit stack size
    if (undoStack.length > MAX_UNDO_LEVELS) {
        undoStack.shift(); // Remove oldest
    }
    
    // Clear redo stack when new action is performed
    redoStack = [];
    
    updateUndoUI();
}

// Push state with complete pre-drag state (for any object drag)
function pushUndoStateWithPreDragState(preDragStateObj) {
    if (isUndoing) return; // Don't push during undo/redo
    if (!preDragStateObj) return;
    
    const state = captureState();
    if (!state) return;
    
    // Merge in the pre-drag state
    if (preDragStateObj.players) state.players = preDragStateObj.players;
    if (preDragStateObj.podium) state.podium = preDragStateObj.podium;
    if (preDragStateObj.piano) state.piano = preDragStateObj.piano;
    if (preDragStateObj.percussionBlob) state.percussionBlob = preDragStateObj.percussionBlob;
    if (preDragStateObj.chorusSingers) state.chorusSingers = preDragStateObj.chorusSingers;
    
    // Handle risers specially - need to organize by type
    if (preDragStateObj.risers) {
        // If it has the correct structure (chorus, extra)
        if (preDragStateObj.risers.chorus) {
            state.risers.chorus = preDragStateObj.risers.chorus;
        }
        if (preDragStateObj.risers.extra) {
            state.risers.extra = preDragStateObj.risers.extra;
        }
        
        // For flat riser structure (brass, woodwind, timpani from generic handler)
        Object.keys(preDragStateObj.risers).forEach(id => {
            if (id !== 'chorus' && id !== 'extra' && typeof preDragStateObj.risers[id] === 'object') {
                const pos = preDragStateObj.risers[id];
                if (pos.x !== undefined && pos.y !== undefined) {
                    // Determine type by ID and place in correct category
                    if (id === 'timpani-riser') {
                        state.risers.timpani = pos;
                    } else if (id.startsWith('brass-riser-')) {
                        state.risers.brass[id] = pos;
                    } else if (id.startsWith('woodwind-riser-')) {
                        state.risers.woodwind[id] = pos;
                    }
                }
            }
        });
    }
    
    undoStack.push(state);
    
    // Limit stack size
    if (undoStack.length > MAX_UNDO_LEVELS) {
        undoStack.shift(); // Remove oldest
    }
    
    // Clear redo stack when new action is performed
    redoStack = [];
    
    updateUndoUI();
}

// Restore a saved state from undo/redo
function restoreUndoState(state) {
    if (!state) return;
    
    isUndoing = true; // Set flag to prevent state capture during restore
    
    // Restore player positions
    Object.keys(state.players).forEach(id => {
        const pos = state.players[id];
        const player = document.querySelector(`[data-player-id="${id}"]`);
        if (player) {
            const isEllipse = player.tagName === 'ellipse';
            if (isEllipse) {
                player.setAttribute('cx', pos.x);
                player.setAttribute('cy', pos.y);
            } else {
                player.setAttribute('cx', pos.x);
                player.setAttribute('cy', pos.y);
            }
            customPositions[id] = { ...pos };
            
            // Update label
            const label = document.getElementById(`${id}-label`);
            if (label) {
                label.setAttribute('x', pos.x);
                label.setAttribute('y', pos.y);
            }
            
            // Update player orientation
            if (typeof updatePlayerOrientation === 'function') {
                updatePlayerOrientation(player, pos.x, pos.y);
            }
        }
    });
    
    // Restore timpani riser
    if (state.risers.timpani) {
        timpaniRiserPosition = { ...state.risers.timpani };
        const riser = document.getElementById('timpani-riser');
        const label = document.getElementById('timpani-riser-label');
        if (riser) {
            riser.setAttribute('x', timpaniRiserPosition.x);
            riser.setAttribute('y', timpaniRiserPosition.y);
        }
        if (label) {
            const width = parseFloat(riser.getAttribute('width'));
            const height = parseFloat(riser.getAttribute('height'));
            label.setAttribute('x', timpaniRiserPosition.x + width / 2);
            label.setAttribute('y', timpaniRiserPosition.y + height / 2 + 5);
        }
    }
    
    // Restore brass risers
    Object.keys(state.risers.brass).forEach(id => {
        const pos = state.risers.brass[id];
        brassRiserPositions[id] = { ...pos };
        const riser = document.getElementById(id);
        const label = document.getElementById(`${id}-label`);
        if (riser) {
            riser.setAttribute('x', pos.x);
            riser.setAttribute('y', pos.y);
        }
        if (label) {
            const width = parseFloat(riser.getAttribute('width'));
            const height = parseFloat(riser.getAttribute('height'));
            label.setAttribute('x', pos.x + width / 2);
            label.setAttribute('y', pos.y + height / 2 + 5);
        }
    });
    
    // Restore woodwind risers
    Object.keys(state.risers.woodwind).forEach(id => {
        const pos = state.risers.woodwind[id];
        woodwindRiserPositions[id] = { ...pos };
        const riser = document.getElementById(id);
        const label = document.getElementById(`${id}-label`);
        if (riser) {
            riser.setAttribute('x', pos.x);
            riser.setAttribute('y', pos.y);
        }
        if (label) {
            const width = parseFloat(riser.getAttribute('width'));
            const height = parseFloat(riser.getAttribute('height'));
            label.setAttribute('x', pos.x + width / 2);
            label.setAttribute('y', pos.y + height / 2 + 5);
        }
    });
    
    // Restore extra risers
    if (state.risers.extra && state.risers.extra.length > 0) {
        state.risers.extra.forEach(savedRiser => {
            const riser = extraRisers.find(r => r.id === savedRiser.id);
            if (riser) {
                riser.x = savedRiser.x;
                riser.y = savedRiser.y;
                const elem = document.getElementById(riser.id);
                const label = document.getElementById(`${riser.id}-label`);
                if (elem) {
                    elem.setAttribute('x', riser.x);
                    elem.setAttribute('y', riser.y);
                }
                if (label) {
                    label.setAttribute('x', riser.x + riser.config.width / 2);
                    label.setAttribute('y', riser.y + riser.config.height / 2 + 5);
                }
            }
        });
    }
    
    // Restore chorus risers
    if (state.risers.chorus && state.risers.chorus.length > 0) {
        state.risers.chorus.forEach(savedRiser => {
            const riser = chorusRisers.find(r => r.id === savedRiser.id);
            if (riser) {
                riser.x = savedRiser.x;
                riser.y = savedRiser.y;
                const elem = document.getElementById(riser.id);
                const label = document.getElementById(`${riser.id}-label`);
                if (elem) {
                    elem.setAttribute('x', riser.x);
                    elem.setAttribute('y', riser.y);
                }
                if (label) {
                    label.setAttribute('x', riser.x + riser.config.width / 2);
                    label.setAttribute('y', riser.y + riser.config.height / 2 + 5);
                }
            }
        });
    }
    
    // Restore podium
    if (state.podium) {
        podiumPosition = { ...state.podium };
        updatePodiumPosition();
    }
    
    // Restore concert grand
    if (state.piano) {
        concertGrandPosition = { ...state.piano };
        updateConcertGrandPosition();
    }
    
    // Restore percussion blob
    if (state.percussionBlob && state.percussionBlob.vertices) {
        percussionBlob.controlPoints = state.percussionBlob.vertices.map(v => ({ ...v }));
        if (typeof renderPercussionBlob === 'function') {
            renderPercussionBlob();
        }
    }
    
    // Restore chorus singers
    if (state.chorusSingers && state.chorusSingers.length > 0) {
        state.chorusSingers.forEach(savedSinger => {
            const singer = chorusSingers.find(s => s.id === savedSinger.id);
            if (singer) {
                singer.x = savedSinger.x;
                singer.y = savedSinger.y;
                const elem = document.getElementById(singer.id);
                if (elem) {
                    elem.setAttribute('x', singer.x - singer.size / 2);
                    elem.setAttribute('y', singer.y - singer.size / 2);
                }
            }
        });
    }
    
    // Restore input values if present (this means it's an input-based undo)
    if (state.inputs) {
        // Clear any pending input change timeouts
        if (inputChangeTimeout) {
            clearTimeout(inputChangeTimeout);
            inputChangeTimeout = null;
        }
        preInputState = null;
        
        isUndoing = false; // Reset flag before updating inputs
        
        Object.keys(state.inputs).forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                if (input.type === 'checkbox') {
                    if (input.checked !== state.inputs[inputId]) {
                        input.checked = state.inputs[inputId];
                    }
                } else {
                    if (input.value !== state.inputs[inputId]) {
                        input.value = state.inputs[inputId];
                    }
                }
            }
        });
        
        // Trigger update after restoring all inputs (customPositions already restored above)
        if (typeof updateStagePlot === 'function') {
            updateStagePlot();
        }
    } else {
        isUndoing = false; // Reset flag
    }
    updateUndoUI();
}

// Undo last action
function undo() {
    if (undoStack.length === 0) return;
    
    // Peek at the state we're about to restore to check if it has inputs
    const previousState = undoStack[undoStack.length - 1];
    const hasInputs = previousState && previousState.inputs;
    
    // Save current state to redo stack before undoing (include inputs if needed)
    const currentState = captureState(hasInputs);
    if (currentState) {
        redoStack.push(currentState);
    }
    
    // Pop and restore previous state
    undoStack.pop();
    if (previousState) {
        restoreUndoState(previousState);
    }
    
    if (debugMode) updateDebugInfo();
}

// Redo last undone action
function redo() {
    if (redoStack.length === 0) return;
    
    // Peek at the state we're about to restore to check if it has inputs
    const nextState = redoStack[redoStack.length - 1];
    const hasInputs = nextState && nextState.inputs;
    
    // Save current state to undo stack before redoing (include inputs if needed)
    const currentState = captureState(hasInputs);
    if (currentState) {
        undoStack.push(currentState);
    }
    
    // Pop and restore redo state
    redoStack.pop();
    if (nextState) {
        restoreUndoState(nextState);
    }
    
    if (debugMode) updateDebugInfo();
}

// Update UI to show undo/redo availability
function updateUndoUI() {
    // This can be used to enable/disable undo/redo buttons
    // For now, keyboard shortcuts will handle it
}

// Capture state BEFORE an input changes (on focus/mousedown)
function capturePreInputState() {
    if (isUndoing) return;
    if (!preInputState) {
        preInputState = captureState(true); // Capture with inputs at their current (pre-change) values
    }
}

// Handle input changes for undo tracking - push the pre-captured state after a delay
function handleInputChangeForUndo() {
    if (isUndoing) return;
    
    // Clear existing timeout
    if (inputChangeTimeout) {
        clearTimeout(inputChangeTimeout);
    }
    
    // Set new timeout to push state after user stops changing inputs
    inputChangeTimeout = setTimeout(() => {
        if (preInputState && !isUndoing) {
            undoStack.push(preInputState);
            
            // Limit stack size
            if (undoStack.length > MAX_UNDO_LEVELS) {
                undoStack.shift();
            }
            
            // Clear redo stack when new action is performed
            redoStack = [];
            
            preInputState = null;
            updateUndoUI();
        }
    }, 1000); // 1 second delay after last input change
}

// Setup input change tracking for undo
function setupInputUndoTracking() {
    const allInputs = document.querySelectorAll('.calculator input[type="number"], .calculator input[type="checkbox"]');
    allInputs.forEach(input => {
        // Capture state BEFORE the value changes
        input.addEventListener('focus', capturePreInputState);
        input.addEventListener('mousedown', capturePreInputState);
        // Track when the value actually changes
        input.addEventListener('input', handleInputChangeForUndo);
        input.addEventListener('change', handleInputChangeForUndo);
    });
}

// Setup keyboard shortcuts
function setupUndoShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Check for Cmd/Ctrl + Z first (with any case)
        const isZ = e.key === 'z' || e.key === 'Z';
        const isY = e.key === 'y' || e.key === 'Y';
        const hasModifier = e.metaKey || e.ctrlKey;
        
        if (!hasModifier || (!isZ && !isY)) {
            return; // Not our shortcut, let it pass
        }
        
        // If user is in an input field, blur it and flush any pending input state
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            e.target.blur();
            // Flush pending input state immediately
            if (inputChangeTimeout) {
                clearTimeout(inputChangeTimeout);
                inputChangeTimeout = null;
            }
            if (preInputState) {
                undoStack.push(preInputState);
                if (undoStack.length > MAX_UNDO_LEVELS) {
                    undoStack.shift();
                }
                redoStack = [];
                preInputState = null;
            }
        }
        
        // Cmd/Ctrl + Z for undo
        if (isZ && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            undo();
            return false;
        }
        // Cmd/Ctrl + Shift + Z for redo
        else if (isZ && e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            redo();
            return false;
        }
        // Cmd/Ctrl + Y for redo (alternative)
        else if (isY) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            redo();
            return false;
        }
    }, true); // Use capture phase to ensure it runs first
}
