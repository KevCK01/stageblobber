// ============================================
// APP - UI wiring, podium, concert grand, init
// ============================================

// --- Bug Report ---

function openBugReport() {
    const modal = document.getElementById('bug-report-modal');
    modal.style.display = 'flex';
    document.getElementById('bug-subject').value = '';
    document.getElementById('bug-message').value = '';
    document.getElementById('bug-subject').focus();
}

function closeBugReport() {
    document.getElementById('bug-report-modal').style.display = 'none';
}

async function submitBugReport() {
    const subject = document.getElementById('bug-subject').value.trim() || 'Stage Blobber Bug Report';
    const body = document.getElementById('bug-message').value.trim();
    if (!body) { 
        alert('Please describe the bug before sending.'); 
        return; 
    }
    
    // Get the button that was clicked
    const submitBtn = document.querySelector('#bug-report-modal button[onclick="submitBugReport()"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    
    // Disable the submit button and show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
    }
    
    try {
        // Send the bug report via FormSpree
        const response = await fetch('https://formspree.io/f/mzdkbplw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subject: '[Bug] ' + subject,
                message: body,
                _replyto: 'no-reply@stageblobber.com',
                _subject: '[Bug] ' + subject
            })
        });
        
        if (response.ok) {
            alert('Bug report sent successfully! Thank you for your feedback.');
            closeBugReport();
        } else {
            throw new Error('Server responded with error: ' + response.status);
        }
    } catch (error) {
        console.error('Error sending bug report:', error);
        
        // Fallback to mailto if FormSpree fails
        alert('Unable to send via web form. Opening your email client as backup...');
        const mailto = `mailto:kkiernan@allentownsymphony.org?subject=${encodeURIComponent('[Bug] ' + subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto);
        closeBugReport();
    } finally {
        // Re-enable the submit button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

// --- Sq Ft Editing Helpers ---

function startEditing(instrumentId) {
    const display = document.querySelector(`.sq-ft-display[data-instrument="${instrumentId}"]`);
    const input = document.getElementById(instrumentId + '_sqft');

    if (display && input) {
        display.classList.add('editing');
        input.classList.add('editing');
        input.focus();
        input.select();
    }
}

function stopEditing(instrumentId) {
    const display = document.querySelector(`.sq-ft-display[data-instrument="${instrumentId}"]`);
    const input = document.getElementById(instrumentId + '_sqft');

    if (display && input) {
        display.classList.remove('editing');
        input.classList.remove('editing');

        const value = parseFloat(input.value) || 8;
        display.textContent = `${value} sq ft each`;

        calculateSpace();
    }
}

function updateSqFtDisplay(instrumentId) {
    const display = document.querySelector(`.sq-ft-display[data-instrument="${instrumentId}"]`);
    const input = document.getElementById(instrumentId + '_sqft');

    if (display && input) {
        const value = parseFloat(input.value) || 8;
        display.textContent = `${value} sq ft each`;
    }
}

// --- Additional Players ---

function addAdditionalPlayer() {
    const instrumentName = prompt('Enter player/instrument name:');
    if (!instrumentName) return;

    const defaultSqft = prompt('Enter space requirement (sq ft):', '10');
    if (!defaultSqft) return;

    const instrumentId = 'custom' + nextInstrumentId++;
    customInstrumentContainers[instrumentId] = 'woodwindsInstruments';
    customInstrumentOrientations[instrumentId] = 'straight';
    addInstrument(instrumentId, instrumentName, parseFloat(defaultSqft), 1);

    // Append orientation checkbox to the newly created row
    const container = document.getElementById('woodwindsInstruments');
    const row = container && container.lastElementChild;
    if (row) {
        const orientRow = document.createElement('label');
        orientRow.className = 'orientation-checkbox-label';
        orientRow.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:0.8em;opacity:0.85;margin-top:2px;cursor:pointer;';
        orientRow.innerHTML = `<input type="checkbox" id="${instrumentId}-orient" onchange="toggleAdditionalPlayerOrientation('${instrumentId}', this.checked)" style="cursor:pointer;"> Orient towards podium`;
        row.appendChild(orientRow);
    }
}

function toggleAdditionalPlayerOrientation(instrumentId, checked) {
    customInstrumentOrientations[instrumentId] = checked ? 'podium' : 'straight';
    updateStagePlot();
}

// --- Instrument Dropdown & Management ---

function toggleDropdown(section) {
    const dropdown = document.getElementById('instrumentDropdown' + section.charAt(0).toUpperCase() + section.slice(1));
    dropdown.classList.toggle('show');
}

function addInstrument(instrumentId, instrumentName, defaultSqft, defaultCount = 0) {
    if (dynamicInstruments.includes(instrumentId)) {
        alert(`${instrumentName} is already added to the stage.`);
        return;
    }

    const containerId = getContainerForInstrument(instrumentId);
    const container = document.getElementById(containerId);

    const instrumentDiv = document.createElement('div');
    instrumentDiv.className = 'input-group';
    instrumentDiv.innerHTML = `
        <label>${instrumentName}:</label>
        <input type="number" id="${instrumentId}" min="0" max="20" value="${defaultCount}">
        <div>
            <span class="sq-ft-display" data-instrument="${instrumentId}">${defaultSqft} sq ft each</span>
            <input type="number" id="${instrumentId}_sqft" class="sq-ft-input" min="1" max="100" value="${defaultSqft}" step="0.5">
        </div>
        <button class="remove-instrument-btn" onclick="removeInstrument('${instrumentId}')"></button>
    `;

    container.appendChild(instrumentDiv);
    dynamicInstruments.push(instrumentId);

    addInstrumentEventListeners(instrumentId);
    updateEmptyDisplays();

    // Close all dropdowns
    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
        dropdown.classList.remove('show');
    });

    calculateSpace();
}

function addCustomInstrument(containerId) {
    const instrumentName = prompt('Enter instrument name:');
    if (!instrumentName) return;

    const defaultSqft = prompt('Enter space requirement (sq ft):', '10');
    if (!defaultSqft) return;

    const instrumentId = 'custom' + nextInstrumentId++;
    // Store the target container so getContainerForInstrument can find it
    customInstrumentContainers[instrumentId] = containerId || 'woodwindsInstruments';
    addInstrument(instrumentId, instrumentName, parseFloat(defaultSqft), 1);
}

function removeInstrument(instrumentId) {
    const instrumentElement = document.getElementById(instrumentId);
    if (instrumentElement) {
        instrumentElement.parentElement.remove();
        dynamicInstruments = dynamicInstruments.filter(id => id !== instrumentId);
        delete customInstrumentContainers[instrumentId];
        delete customInstrumentOrientations[instrumentId];
        updateEmptyDisplays();
        calculateSpace();
    }
}

function getContainerForInstrument(instrumentId) {
    const woodwinds = ['flute', 'oboe', 'clarinet', 'bassoon', 'saxophone', 'frenchhorn', 'trumpet', 'cornet', 'trombone', 'tuba'];
    const percussion = ['timpani', 'snare', 'xylophone', 'marimba', 'cymbals', 'vibraphone', 'glockenspiel', 'chimes', 'bassDrum', 'cymbal',
                        'tamtam', 'bongos', 'tom', 'belltree', 'marktree', 'smalltable', 'drumkit', 'hihat'];
    const keyboard = ['piano', 'celeste', 'harpsichord', 'keyboard', 'harp'];

    if (woodwinds.includes(instrumentId)) return 'woodwindsInstruments';
    if (percussion.includes(instrumentId)) return 'percussionInstruments';
    if (keyboard.includes(instrumentId)) return 'keyboardInstruments';

    if (customInstrumentContainers[instrumentId]) return customInstrumentContainers[instrumentId];
    return 'woodwindsInstruments';
}

function updateEmptyDisplays() {
    const containers = [
        { id: 'woodwindsInstruments', emptyId: 'emptyWoodwinds' },
        { id: 'percussionInstruments', emptyId: 'emptyPercussion' },
        { id: 'keyboardInstruments', emptyId: 'emptyKeyboard' }
    ];

    containers.forEach(container => {
        const instrumentContainer = document.getElementById(container.id);
        const emptyMessage = document.getElementById(container.emptyId);

        if (instrumentContainer.children.length === 0) {
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
        }
    });
}

function addInstrumentEventListeners(instrumentId) {
    const mainInput = document.getElementById(instrumentId);
    mainInput.addEventListener('input', calculateSpace);

    const sqftInput = document.getElementById(instrumentId + '_sqft');
    sqftInput.addEventListener('input', calculateSpace);
    sqftInput.addEventListener('blur', () => stopEditing(instrumentId));
    sqftInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sqftInput.blur();
    });

    const sqftDisplay = document.querySelector(`.sq-ft-display[data-instrument="${instrumentId}"]`);
    sqftDisplay.addEventListener('click', () => startEditing(instrumentId));
}

// --- Podium Drag ---

function initializePodium() {
    const podiumMain = document.getElementById('podium-main');
    const podiumStep = document.getElementById('podium-step');

    [podiumMain, podiumStep].forEach(element => {
        element.addEventListener('mousedown', startPodiumDrag);
        element.addEventListener('touchstart', function(e) {
            e.preventDefault();
            startPodiumDrag(e.touches[0]);
        });

        element.addEventListener('click', function(e) {
            if (!podiumDragging) {
                e.stopPropagation();
                selectObject('podium-main', 'podium');
            }
        });
    });
}

function startPodiumDrag(e) {
    // Capture pre-drag state for undo
    preDragState = { podium: { x: podiumPosition.x, y: podiumPosition.y } };
    
    podiumDragging = true;

    document.getElementById('podium-main').classList.add('dragging');
    document.getElementById('podium-step').classList.add('dragging');

    const pos = getSvgMousePosition(e);
    podiumDragOffset = {
        x: pos.x - podiumPosition.x,
        y: pos.y - podiumPosition.y
    };

    document.addEventListener('mousemove', handlePodiumDragMove);
    document.addEventListener('mouseup', handlePodiumDragEnd);
    document.addEventListener('touchmove', handlePodiumDragMove);
    document.addEventListener('touchend', handlePodiumDragEnd);
}

function handlePodiumDragMove(e) {
    if (!podiumDragging) return;
    e.preventDefault();

    const pos = getSvgMousePosition(e);
    let newX = pos.x - podiumDragOffset.x;
    let newY = pos.y - podiumDragOffset.y;

    // Constrain to canvas boundaries
    newX = Math.max(0, Math.min(1000, newX));
    newY = Math.max(0, Math.min(940, newY));

    podiumPosition = { x: newX, y: newY };
    updatePodiumPosition();

    if (debugMode) updateDebugInfo();
}

function handlePodiumDragEnd(e) {
    if (podiumDragging) {
        // Check if podium actually moved (more than 2 pixels)
        let podiumMoved = false;
        if (preDragState && preDragState.podium) {
            const distance = Math.sqrt(
                Math.pow(podiumPosition.x - preDragState.podium.x, 2) + 
                Math.pow(podiumPosition.y - preDragState.podium.y, 2)
            );
            podiumMoved = distance > 2;
        }
        
        document.getElementById('podium-main').classList.remove('dragging');
        document.getElementById('podium-step').classList.remove('dragging');

        // Push pre-drag state to undo stack (only if moved)
        if (podiumMoved && typeof pushUndoStateWithPreDragState === 'function' && preDragState) {
            pushUndoStateWithPreDragState(preDragState);
        }
        preDragState = null;
        
        // Clear selection only if podium actually moved
        if (podiumMoved && typeof clearKeyboardSelection === 'function') {
            clearKeyboardSelection();
        }

        podiumDragging = false;
        podiumDragOffset = { x: 0, y: 0 };
    }

    document.removeEventListener('mousemove', handlePodiumDragMove);
    document.removeEventListener('mouseup', handlePodiumDragEnd);
    document.removeEventListener('touchmove', handlePodiumDragMove);
    document.removeEventListener('touchend', handlePodiumDragEnd);
}

function updatePodiumPosition() {
    const podiumMain = document.getElementById('podium-main');
    const podiumStep = document.getElementById('podium-step');
    const podiumLabel = document.getElementById('podium-label');

    // Center main square on podiumPosition
    podiumMain.setAttribute('x', podiumPosition.x - 31.25);
    podiumMain.setAttribute('y', podiumPosition.y - 31.25);

    // Step flush against left edge (stage right, rotated)
    podiumStep.setAttribute('x', podiumPosition.x - 31.25 - 16.25);
    podiumStep.setAttribute('y', podiumPosition.y - 16.875);

    // Label
    podiumLabel.setAttribute('x', podiumPosition.x);
    podiumLabel.setAttribute('y', podiumPosition.y + 5);
}

function resetPodiumPosition() {
    podiumPosition = { x: 500, y: 633.75 };
    podiumOriginalY = 633.75;
    updatePodiumPosition();
}

// --- Concert Grand Piano ---

function toggleConcertGrand() {
    const checkbox = document.getElementById('concert-grand-toggle');
    concertGrandEnabled = checkbox.checked;
    const concertGrandSection = document.getElementById('concert-grand-section');

    if (concertGrandEnabled) {
        concertGrandSection.style.display = 'block';

        // Move podium for concert grand soloist
        podiumPosition.x = 500.0;
        podiumPosition.y = 597.8;
        updatePodiumPosition();

        // Position concert grand downstage of podium
        concertGrandPosition = { x: 500, y: podiumOriginalY + 37.5 };
        updateConcertGrandPosition();

        // Initialize drag if not already done
        if (!concertGrandSection.dataset.initialized) {
            initializeConcertGrand();
            concertGrandSection.dataset.initialized = 'true';
        }
    } else {
        concertGrandSection.style.display = 'none';

        // Restore podium to original position
        podiumPosition.y = podiumOriginalY;
        updatePodiumPosition();
    }

    if (useDefaultSeating) {
        // Full regeneration with appropriate templates
        updateStagePlot();
    } else {
        // Shift existing string players manually
        const shiftY = concertGrandEnabled ? -45 : 45;
        const stringSelectors = [
            '[data-player-id^="violin1-"]',
            '[data-player-id^="violin2-"]',
            '[data-player-id^="viola-"]',
            '[data-player-id^="cello-"]',
            '[data-player-id^="bass-"]'
        ];

        stringSelectors.forEach(selector => {
            const players = document.querySelectorAll(selector);
            players.forEach(player => {
                const currentX = parseFloat(player.getAttribute('cx'));
                const currentY = parseFloat(player.getAttribute('cy'));
                const newY = currentY + shiftY;
                player.setAttribute('cy', newY);

                updatePlayerOrientation(player, currentX, newY);

                // Move associated label
                const labels = document.querySelectorAll('text.player-label');
                labels.forEach(label => {
                    const labelX = parseFloat(label.getAttribute('x'));
                    const labelY = parseFloat(label.getAttribute('y'));
                    if (Math.abs(labelX - currentX) < 0.1 && Math.abs(labelY - currentY) < 0.1) {
                        label.setAttribute('y', labelY + shiftY);
                    }
                });

                // Update custom positions
                const playerId = player.getAttribute('data-player-id');
                if (customPositions[playerId]) {
                    customPositions[playerId].y += shiftY;
                }
            });
        });

        updateAllPlayerOrientations();
    }

    if (debugMode) updateDebugInfo();
}

function initializeConcertGrand() {
    const concertGrandRect = document.getElementById('concert-grand-rect');

    if (concertGrandRect) {
        concertGrandRect.addEventListener('mousedown', startConcertGrandDrag);
        concertGrandRect.addEventListener('touchstart', function(e) {
            e.preventDefault();
            startConcertGrandDrag(e.touches[0]);
        });

        concertGrandRect.addEventListener('click', function(e) {
            if (!concertGrandDragging) {
                e.stopPropagation();
                selectObject('concert-grand-rect', 'concert-grand');
            }
        });
    }
}

function startConcertGrandDrag(e) {
    // Capture pre-drag state for undo
    preDragState = { piano: { x: concertGrandPosition.x, y: concertGrandPosition.y } };
    
    concertGrandDragging = true;

    const pos = getSvgMousePosition(e);
    concertGrandDragOffset = {
        x: pos.x - concertGrandPosition.x,
        y: pos.y - concertGrandPosition.y
    };

    document.addEventListener('mousemove', handleConcertGrandDragMove);
    document.addEventListener('mouseup', handleConcertGrandDragEnd);
    document.addEventListener('touchmove', handleConcertGrandDragMove);
    document.addEventListener('touchend', handleConcertGrandDragEnd);
}

function handleConcertGrandDragMove(e) {
    if (!concertGrandDragging) return;
    e.preventDefault();

    const pos = getSvgMousePosition(e);
    let newX = pos.x - concertGrandDragOffset.x;
    let newY = pos.y - concertGrandDragOffset.y;

    concertGrandPosition = { x: newX, y: newY };
    updateConcertGrandPosition();
}

function handleConcertGrandDragEnd(e) {
    if (concertGrandDragging) {
        // Check if concert grand actually moved (more than 2 pixels)
        let pianoMoved = false;
        if (preDragState && preDragState.piano) {
            const distance = Math.sqrt(
                Math.pow(concertGrandPosition.x - preDragState.piano.x, 2) + 
                Math.pow(concertGrandPosition.y - preDragState.piano.y, 2)
            );
            pianoMoved = distance > 2;
        }
        
        // Push pre-drag state to undo stack (only if moved)
        if (pianoMoved && typeof pushUndoStateWithPreDragState === 'function' && preDragState) {
            pushUndoStateWithPreDragState(preDragState);
        }
        preDragState = null;
        
        // Clear selection only if piano actually moved
        if (pianoMoved && typeof clearKeyboardSelection === 'function') {
            clearKeyboardSelection();
        }

        concertGrandDragging = false;
        concertGrandDragOffset = { x: 0, y: 0 };
    }

    document.removeEventListener('mousemove', handleConcertGrandDragMove);
    document.removeEventListener('mouseup', handleConcertGrandDragEnd);
    document.removeEventListener('touchmove', handleConcertGrandDragMove);
    document.removeEventListener('touchend', handleConcertGrandDragEnd);
}

function updateConcertGrandPosition() {
    const concertGrandPath = document.getElementById('concert-grand-rect');
    const concertGrandLabel = document.getElementById('concert-grand-label');

    // The path is defined with center at (500, 705) — translate to desired position
    const translateX = concertGrandPosition.x - 500;
    const translateY = concertGrandPosition.y - 705;

    concertGrandPath.setAttribute('transform', `translate(${translateX}, ${translateY})`);

    concertGrandLabel.setAttribute('x', concertGrandPosition.x);
    concertGrandLabel.setAttribute('y', concertGrandPosition.y);
}

function moveConcertGrand(deltaX, deltaY) {
    concertGrandPosition.x += deltaX;
    concertGrandPosition.y += deltaY;
    updateConcertGrandPosition();

    if (debugMode) updateDebugInfo();
}

// --- Application Initialization ---

document.addEventListener('DOMContentLoaded', function() {
    // "Use Default Seating" checkboxes
    const useDefaultSeatingCheckbox = document.getElementById('use-default-seating');
    if (useDefaultSeatingCheckbox) {
        useDefaultSeatingCheckbox.addEventListener('change', function() {
            // If unchecking, save current positions before switching
            if (!this.checked && useDefaultSeating) {
                ['violin1', 'violin2', 'viola', 'cello', 'bass'].forEach(instrumentType => {
                    document.querySelectorAll(`[data-player-id^="${instrumentType}-"]`).forEach(player => {
                        const id = player.getAttribute('data-player-id');
                        customPositions[id] = { 
                            x: parseFloat(player.getAttribute('cx')), 
                            y: parseFloat(player.getAttribute('cy')) 
                        };
                    });
                });
            }
            // If checking back on, clear custom positions for string players
            else if (this.checked && !useDefaultSeating) {
                ['violin1', 'violin2', 'viola', 'cello', 'bass'].forEach(instrumentType => {
                    const count = parseInt(document.getElementById(instrumentType).value) || 0;
                    for (let i = 1; i <= count; i++) {
                        const id = `${instrumentType}-${i}`;
                        delete customPositions[id];
                    }
                });
            }
            useDefaultSeating = this.checked;
            updateStagePlot();
        });
    }
    
    const useDefaultWoodwindSeatingCheckbox = document.getElementById('use-default-woodwind-seating');
    if (useDefaultWoodwindSeatingCheckbox) {
        useDefaultWoodwindSeatingCheckbox.addEventListener('change', function() {
            // If unchecking, save current positions before switching
            if (!this.checked && useDefaultWoodwindSeating) {
                ['flute', 'oboe', 'clarinet', 'bassoon'].forEach(instrumentType => {
                    document.querySelectorAll(`[data-player-id^="${instrumentType}-"]`).forEach(player => {
                        const id = player.getAttribute('data-player-id');
                        customPositions[id] = { 
                            x: parseFloat(player.getAttribute('cx')), 
                            y: parseFloat(player.getAttribute('cy')) 
                        };
                    });
                });
            }
            // If checking back on, clear custom positions for woodwind players
            else if (this.checked && !useDefaultWoodwindSeating) {
                ['flute', 'oboe', 'clarinet', 'bassoon'].forEach(instrumentType => {
                    const count = parseInt(document.getElementById(instrumentType).value) || 0;
                    for (let i = 1; i <= count; i++) {
                        const id = `${instrumentType}-${i}`;
                        delete customPositions[id];
                    }
                });
            }
            useDefaultWoodwindSeating = this.checked;
            updateStagePlot();
        });
    }
    
    const useDefaultBrassSeatingCheckbox = document.getElementById('use-default-brass-seating');
    if (useDefaultBrassSeatingCheckbox) {
        useDefaultBrassSeatingCheckbox.addEventListener('change', function() {
            // If unchecking, save current positions before switching
            if (!this.checked && useDefaultBrassSeating) {
                ['horn', 'trumpet', 'trombone', 'tuba'].forEach(instrumentType => {
                    document.querySelectorAll(`[data-player-id^="${instrumentType}-"]`).forEach(player => {
                        const id = player.getAttribute('data-player-id');
                        customPositions[id] = { 
                            x: parseFloat(player.getAttribute('cx')), 
                            y: parseFloat(player.getAttribute('cy')) 
                        };
                    });
                });
            }
            // If checking back on, clear custom positions for brass players
            else if (this.checked && !useDefaultBrassSeating) {
                ['horn', 'trumpet', 'trombone', 'tuba'].forEach(instrumentType => {
                    const count = parseInt(document.getElementById(instrumentType).value) || 0;
                    for (let i = 1; i <= count; i++) {
                        const id = `${instrumentType}-${i}`;
                        delete customPositions[id];
                    }
                });
            }
            useDefaultBrassSeating = this.checked;
            updateStagePlot();
        });
    }

    // Wire up static instrument event listeners
    staticInstruments.forEach(instrument => {
        addInstrumentEventListeners(instrument);
    });

    // Initialize podium drag
    initializePodium();

    // Initialize risers
    initializeTimpaniRiser();
    initializeBrassRisers();
    initializeWoodwindRisers();

    // Set initial riser visibility from checkboxes
    toggleTimpaniRiser();

    ['brass-riser-1', 'brass-riser-2', 'brass-riser-3', 'brass-riser-4', 'brass-riser-5'].forEach(riserId => {
        toggleBrassRiser(riserId);
    });

    ['woodwind-riser-1', 'woodwind-riser-2', 'woodwind-riser-3', 'woodwind-riser-4'].forEach(riserId => {
        toggleWoodwindRiser(riserId);
    });

    // Stage plot click clears all selections (but not after drag-select)
    const stagePlot = document.querySelector('.stage-plot');
    if (stagePlot) {
        let mouseDownPos = null;
        
        stagePlot.addEventListener('mousedown', function(e) {
            mouseDownPos = { x: e.clientX, y: e.clientY };
        });
        
        stagePlot.addEventListener('click', function(e) {
            // Check if this was a drag (moved more than 5 pixels) - if so, don't clear
            if (mouseDownPos) {
                const distance = Math.sqrt(
                    Math.pow(e.clientX - mouseDownPos.x, 2) + 
                    Math.pow(e.clientY - mouseDownPos.y, 2)
                );
                if (distance > 5) {
                    mouseDownPos = null;
                    return; // Was a drag, don't clear
                }
            }
            
            // Clear selections when clicking on empty space (SVG background, boundaries, stage floor, lines, etc.)
            const isEmptySpace = e.target === stagePlot || 
                e.target.classList.contains('stage-boundary') ||
                e.target.classList.contains('stage-floor') ||
                e.target.classList.contains('stage-extension-line') ||
                e.target.classList.contains('stage-hashmark') ||
                e.target.classList.contains('stage-label') ||
                e.target.classList.contains('scale-label') ||
                e.target.classList.contains('ruler-line') ||
                e.target.id === 'center-line' ||
                e.target.id === 'grid-background' ||
                e.target.id === 'arc-floor' ||
                e.target.id === 'stage-extension-1' ||
                e.target.id === 'stage-extension-2' ||
                e.target.getAttribute('data-riser-type') === 'stage-extension' ||
                e.target.tagName === 'pattern' ||
                (e.target.tagName === 'rect' && e.target.getAttribute('fill') === 'url(#scaleGrid)');
            
            if (isEmptySpace) {
                clearKeyboardSelection();
                clearSelection();
            }
            
            mouseDownPos = null;
        });
    }

    // Initialize multi-select and keyboard navigation
    initializeMultiSelect();
    setupKeyboardNavigation();
    
    // Initialize undo/redo shortcuts
    if (typeof setupUndoShortcuts === 'function') {
        setupUndoShortcuts();
    }
    if (typeof setupInputUndoTracking === 'function') {
        setupInputUndoTracking();
    }

    // Add global handler for all number inputs to select all on focus/click
    let selectOnMouseUp = false;
    
    document.addEventListener('focus', function(e) {
        if (e.target.type === 'number') {
            selectOnMouseUp = true;
            // Use setTimeout to ensure the selection happens after focus is complete
            setTimeout(() => {
                e.target.select();
            }, 10);
        }
    }, true);
    
    // Also handle click events to select all (for cases where input already has focus)
    document.addEventListener('mousedown', function(e) {
        if (e.target.type === 'number') {
            selectOnMouseUp = true;
        }
    }, true);
    
    // Re-select after mouseup to prevent browser from deselecting
    document.addEventListener('mouseup', function(e) {
        if (e.target.type === 'number' && selectOnMouseUp) {
            setTimeout(() => {
                e.target.select();
            }, 0);
            selectOnMouseUp = false;
        }
    }, true);

    // Snap to Default buttons
    const snapStringsBtn = document.getElementById('snap-strings-btn');
    if (snapStringsBtn) {
        snapStringsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Clear all custom positions for string instruments
            ['violin1', 'violin2', 'viola', 'cello', 'bass'].forEach(instrumentType => {
                const count = parseInt(document.getElementById(instrumentType).value) || 0;
                for (let i = 1; i <= count; i++) {
                    const id = `${instrumentType}-${i}`;
                    delete customPositions[id];
                }
            });
            updateStagePlot(); // Positions for this section were already cleared above
        });
    }

    const snapWoodwindsBtn = document.getElementById('snap-woodwinds-btn');
    if (snapWoodwindsBtn) {
        snapWoodwindsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Clear all custom positions for woodwind instruments
            ['flute', 'oboe', 'clarinet', 'bassoon'].forEach(instrumentType => {
                const count = parseInt(document.getElementById(instrumentType).value) || 0;
                for (let i = 1; i <= count; i++) {
                    const id = `${instrumentType}-${i}`;
                    delete customPositions[id];
                }
            });
            updateStagePlot(); // Positions for this section were already cleared above
        });
    }

    const snapBrassBtn = document.getElementById('snap-brass-btn');
    if (snapBrassBtn) {
        snapBrassBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            // Clear all custom positions for brass instruments
            ['horn', 'trumpet', 'trombone', 'tuba'].forEach(instrumentType => {
                const count = parseInt(document.getElementById(instrumentType).value) || 0;
                for (let i = 1; i <= count; i++) {
                    const id = `${instrumentType}-${i}`;
                    delete customPositions[id];
                }
            });
            updateStagePlot(); // Positions for this section were already cleared above
        });
    }

    // Initial calculations and rendering
    calculateSpace();
    updateStagePlot();

    // Initialize percussion blob
    initializePercussionBlob();
});
