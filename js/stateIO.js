// ============================================
// STATE I/O - Save, load, print, debug, export
// ============================================

// --- Space Calculation ---

function calculateSpace() {
    let usedSpace = 0;

    getAllInstruments().forEach(instrument => {
        const countEl = document.getElementById(instrument);
        const sqftEl = document.getElementById(instrument + '_sqft');
        if (countEl && sqftEl) {
            usedSpace += (parseInt(countEl.value) || 0) * (parseFloat(sqftEl.value) || 0);
        }
    });

    updateStagePlot();
}

function resetCalculator() {
    // Clear chorus state first so toggleBrassRiser/toggleWoodwindRiser below
    // don't run the chorusEnabled side-positioning logic, and so old DOM
    // elements don't duplicate when a new state is loaded.
    if (typeof clearChorusRisers === 'function') clearChorusRisers();
    if (typeof clearAllChorusSingers === 'function') clearAllChorusSingers();
    chorusEnabled = false;
    chorusRows = 1;
    chorusSingersPerRow = [];
    const chorusCb = document.getElementById('chorus-toggle');
    if (chorusCb) chorusCb.checked = false;
    const chorusControls = document.getElementById('chorus-controls');
    if (chorusControls) chorusControls.style.display = 'none';

    const defaultValues = {
        violin1: 10, violin2: 10, viola: 10, cello: 16, bass: 18,
        flute: 8, oboe: 8, clarinet: 8, bassoon: 12
    };

    staticInstruments.forEach(instrument => {
        document.getElementById(instrument).value = 0;
        document.getElementById(instrument + '_sqft').value = defaultValues[instrument];
        updateSqFtDisplay(instrument);
    });

    dynamicInstruments = [];
    customInstrumentContainers = {};
    document.getElementById('woodwindsInstruments').innerHTML = '';
    document.getElementById('percussionInstruments').innerHTML = '';
    document.getElementById('keyboardInstruments').innerHTML = '';
    updateEmptyDisplays();

    document.getElementById('timpani-riser-checkbox').checked = true;
    toggleTimpaniRiser();

    ['brass-riser-1', 'brass-riser-2', 'brass-riser-3', 'brass-riser-4', 'brass-riser-5'].forEach(id => {
        document.getElementById(id + '-checkbox').checked = true;
        toggleBrassRiser(id);
    });

    ['woodwind-riser-1', 'woodwind-riser-2', 'woodwind-riser-3', 'woodwind-riser-4'].forEach(id => {
        document.getElementById(id + '-checkbox').checked = true;
        toggleWoodwindRiser(id);
    });

    calculateSpace();
}

// --- Print ---

function printStagePlot() {
    document.body.classList.add('print-plot-only');
    window.print();
    setTimeout(() => document.body.classList.remove('print-plot-only'), 100);
}

// --- Debug ---

function toggleDebugMode() {
    debugMode = !debugMode;
    const debugBtn = document.querySelector('.debug-btn');
    const debugInfo = document.querySelector('.debug-info');
    const highlights = document.querySelectorAll('.position-highlight');

    if (debugMode) {
        debugBtn.textContent = 'Debug Mode: ON';
        debugInfo.classList.add('show');
        highlights.forEach(h => h.classList.add('show'));
        updateDebugInfo();
    } else {
        debugBtn.textContent = 'Debug Mode: OFF';
        debugInfo.classList.remove('show');
        highlights.forEach(h => h.classList.remove('show'));
    }
}

function toggleCollisionDetection() {
    const checkbox = document.getElementById('collision-detection-toggle');
    collisionDetectionEnabled = checkbox.checked;
    // Update overlap warning when toggling
    if (typeof checkForOverlapWarning === 'function') {
        checkForOverlapWarning();
    }
}

function updateDebugInfo() {
    if (!debugMode) return;
    const debugDiv = document.querySelector('.debug-info div');
    let text = '';

    text += 'Player Positions:\n';
    document.querySelectorAll('.stage-plot circle[data-player-id], .stage-plot ellipse[data-player-id]').forEach(p => {
        text += `${p.getAttribute('data-player-id')}: (${parseFloat(p.getAttribute('cx')).toFixed(1)}, ${parseFloat(p.getAttribute('cy')).toFixed(1)})\n`;
    });

    text += '\nPodium Position:\n';
    text += `podium: (${podiumPosition.x.toFixed(1)}, ${podiumPosition.y.toFixed(1)})\n`;

    if (concertGrandEnabled) {
        text += '\nConcert Grand Position:\n';
        text += `concert-grand: (${concertGrandPosition.x.toFixed(1)}, ${concertGrandPosition.y.toFixed(1)})\n`;
    }

    text += '\nTimpani Riser Position:\n';
    text += `timpani-riser: (${timpaniRiserPosition.x.toFixed(1)}, ${timpaniRiserPosition.y.toFixed(1)})\n`;

    text += '\nBrass Riser Positions:\n';
    Object.keys(brassRiserPositions).forEach(id => {
        const pos = brassRiserPositions[id];
        text += `${id}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})\n`;
    });

    text += '\nWoodwind Riser Positions:\n';
    Object.keys(woodwindRiserPositions).forEach(id => {
        const pos = woodwindRiserPositions[id];
        text += `${id}: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})\n`;
    });

    text += '\nExtra Riser Positions:\n';
    extraRisers.forEach(rd => { text += `${rd.id}: (${rd.x.toFixed(1)}, ${rd.y.toFixed(1)})\n`; });

    if (chorusEnabled && chorusRisers.length > 0) {
        text += '\nChorus Riser Positions:\n';
        chorusRisers.forEach(rd => { text += `${rd.id}: (${rd.x.toFixed(1)}, ${rd.y.toFixed(1)})\n`; });
    }

    if (chorusEnabled && chorusSingers.length > 0) {
        text += '\nChorus Singer Positions:\n';
        chorusSingers.forEach(sd => { text += `${sd.id}: (${sd.x.toFixed(1)}, ${sd.y.toFixed(1)})\n`; });
        text += `Total Singers: ${chorusSingers.length}\n`;
    }

    text += '\nPercussion Blob:\n';
    if (percussionBlob.controlPoints.length > 0) {
        text += `  Target Area: ${percussionBlob.targetArea.toFixed(1)} sq ft\n`;
        text += `  Actual Area: ${percussionBlob.actualArea.toFixed(1)} sq ft\n`;
        text += `  Center: (${percussionBlob.center.x.toFixed(1)}, ${percussionBlob.center.y.toFixed(1)})\n`;
        text += `  Control Points: ${percussionBlob.controlPoints.length}\n`;
    } else {
        text += '  No percussion instruments added\n';
    }

    debugDiv.textContent = text;
}

function exportPositions() {
    const positions = {};
    document.querySelectorAll('.stage-plot circle[data-player-id], .stage-plot ellipse[data-player-id]').forEach(p => {
        positions[p.getAttribute('data-player-id')] = {
            x: parseFloat(p.getAttribute('cx')),
            y: parseFloat(p.getAttribute('cy'))
        };
    });

    const exportCode = `// Generated Position Data\nconst generatedPositions = ${JSON.stringify(positions, null, 2)};`;

    navigator.clipboard.writeText(exportCode).then(() => {
        alert('Position data copied to clipboard!');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = exportCode;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Position data copied to clipboard!');
    });
}

// --- Save State ---

async function saveState() {
    try {
        // Prompt user for filename
        const defaultName = `orchestra-stage-plot-${new Date().toISOString().slice(0, 10)}`;
        let fileName = prompt('Enter a name for your stage plot file:', defaultName);
        
        // User cancelled
        if (fileName === null) return;
        
        // Ensure filename has .json extension
        fileName = fileName.trim();
        if (!fileName) fileName = defaultName;
        if (!fileName.endsWith('.json')) fileName += '.json';
        
        const state = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            staticInstruments: {},
            dynamicInstruments: [...dynamicInstruments],
            dynamicInstrumentData: {},
            nextInstrumentId: nextInstrumentId,
            customInstrumentContainers: { ...customInstrumentContainers },
            customPositions: { ...customPositions },
            useDefaultSeating: useDefaultSeating,
            useDefaultWoodwindSeating: useDefaultWoodwindSeating,
            useDefaultBrassSeating: useDefaultBrassSeating,
            collisionDetectionEnabled: collisionDetectionEnabled,
            podiumPosition: { ...podiumPosition },
            podiumOriginalY: podiumOriginalY,
            concertGrandEnabled: concertGrandEnabled,
            concertGrandPosition: { ...concertGrandPosition },
            timpaniRiserPosition: { ...timpaniRiserPosition },
            brassRiserPositions: { ...brassRiserPositions },
            woodwindRiserPositions: { ...woodwindRiserPositions },
            chorusEnabled: chorusEnabled,
            chorusRows: chorusRows,
            chorusSingersPerRow: [...chorusSingersPerRow],
            chorusRisers: (chorusRisers || []).map(r => ({ id: r.id, size: r.size, x: r.x, y: r.y, number: r.number })),
            chorusSingers: (chorusSingers || []).map(s => ({ id: s.id, rowIndex: s.rowIndex, x: s.x, y: s.y, size: s.size })),
            extraRisers: (extraRisers || []).map(r => ({
                id: r.id, size: r.size, x: r.x, y: r.y,
                number: r.number || parseInt(r.id.match(/extra-riser-(\d+)/)?.[1] || '0', 10)
            })),
            percussionBlob: {
                enabled: percussionBlob.enabled,
                targetArea: percussionBlob.targetArea,
                center: { ...percussionBlob.center },
                controlPoints: percussionBlob.controlPoints.map(p => ({ x: p.x, y: p.y }))
            },
            riserVisibility: {
                timpaniRiser: document.getElementById('timpani-riser-checkbox').checked,
                brassRisers: {},
                woodwindRisers: {},
                stageExtensions: {}
            },
            debugMode: debugMode
        };

        staticInstruments.forEach(instrument => {
            const countEl = document.getElementById(instrument);
            const sqftEl = document.getElementById(instrument + '_sqft');
            if (countEl && sqftEl) {
                state.staticInstruments[instrument] = { count: parseInt(countEl.value) || 0, sqft: parseFloat(sqftEl.value) || 0 };
            }
        });

        dynamicInstruments.forEach(instrumentId => {
            const countEl = document.getElementById(instrumentId);
            const sqftEl = document.getElementById(instrumentId + '_sqft');
            if (countEl && sqftEl) {
                const label = countEl.parentElement.querySelector('label');
                state.dynamicInstrumentData[instrumentId] = {
                    name: label ? label.textContent.replace(':', '') : instrumentId,
                    count: parseInt(countEl.value) || 0,
                    sqft: parseFloat(sqftEl.value) || 0
                };
            }
        });

        ['brass-riser-1', 'brass-riser-2', 'brass-riser-3', 'brass-riser-4', 'brass-riser-5'].forEach(id => {
            const cb = document.getElementById(id + '-checkbox');
            if (cb) state.riserVisibility.brassRisers[id] = cb.checked;
        });

        ['woodwind-riser-1', 'woodwind-riser-2', 'woodwind-riser-3', 'woodwind-riser-4'].forEach(id => {
            const cb = document.getElementById(id + '-checkbox');
            if (cb) state.riserVisibility.woodwindRisers[id] = cb.checked;
        });

        ['stage-extension-1', 'stage-extension-2'].forEach(id => {
            const cb = document.getElementById(id + '-checkbox');
            if (cb) state.riserVisibility.stageExtensions[id] = cb.checked;
        });

        const jsonString = JSON.stringify(state, null, 2);
        
        // Try modern File System Access API first (Chrome, Edge, Opera)
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'Stage Blobber Configuration',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(jsonString);
                await writable.close();
                alert('Stage plot configuration saved successfully!');
                return;
            } catch (err) {
                // User cancelled the save dialog or API not supported
                if (err.name === 'AbortError') return;
                console.log('File System Access API failed, falling back to download:', err);
            }
        }
        
        // Fallback to traditional download method
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        alert('Stage plot configuration saved successfully!');
    } catch (error) {
        console.error('Error saving state:', error);
        alert('Error saving stage plot: ' + error.message);
    }
}

// --- Load State ---

function loadState() {
    document.getElementById('loadFileInput').click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.type !== 'application/json') { alert('Please select a valid JSON file.'); return; }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            restoreState(JSON.parse(e.target.result));
        } catch (error) {
            alert('Error reading file: Invalid JSON format.');
            console.error('Error parsing JSON:', error);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function restoreState(state) {
    try {
        resetCalculator();

        if (state.staticInstruments) {
            Object.keys(state.staticInstruments).forEach(instrument => {
                const data = state.staticInstruments[instrument];
                const countEl = document.getElementById(instrument);
                const sqftEl = document.getElementById(instrument + '_sqft');
                if (countEl && sqftEl) {
                    countEl.value = data.count;
                    sqftEl.value = data.sqft;
                    updateSqFtDisplay(instrument);
                }
            });
        }

        if (state.dynamicInstruments && state.dynamicInstrumentData) {
            dynamicInstruments = [];
            document.getElementById('woodwindsInstruments').innerHTML = '';
            document.getElementById('percussionInstruments').innerHTML = '';
            document.getElementById('keyboardInstruments').innerHTML = '';

            if (state.nextInstrumentId) nextInstrumentId = state.nextInstrumentId;
            if (state.customInstrumentContainers) customInstrumentContainers = { ...state.customInstrumentContainers };

            state.dynamicInstruments.forEach(instrumentId => {
                const data = state.dynamicInstrumentData[instrumentId];
                if (data) {
                    addInstrument(instrumentId, data.name, data.sqft);
                    const countEl = document.getElementById(instrumentId);
                    const sqftEl = document.getElementById(instrumentId + '_sqft');
                    if (countEl && sqftEl) {
                        countEl.value = data.count;
                        sqftEl.value = data.sqft;
                        updateSqFtDisplay(instrumentId);
                    }
                }
            });
        }

        if (state.customPositions) customPositions = { ...state.customPositions };

        // Restore default seating flags
        if (state.useDefaultSeating !== undefined) {
            useDefaultSeating = state.useDefaultSeating;
            const defaultSeatingCb = document.getElementById('use-default-seating');
            if (defaultSeatingCb) defaultSeatingCb.checked = useDefaultSeating;
        }
        
        if (state.useDefaultWoodwindSeating !== undefined) {
            useDefaultWoodwindSeating = state.useDefaultWoodwindSeating;
            const woodwindSeatingCb = document.getElementById('use-default-woodwind-seating');
            if (woodwindSeatingCb) woodwindSeatingCb.checked = useDefaultWoodwindSeating;
        }
        
        if (state.useDefaultBrassSeating !== undefined) {
            useDefaultBrassSeating = state.useDefaultBrassSeating;
            const brassSeatingCb = document.getElementById('use-default-brass-seating');
            if (brassSeatingCb) brassSeatingCb.checked = useDefaultBrassSeating;
        }
        
        if (state.collisionDetectionEnabled !== undefined) {
            collisionDetectionEnabled = state.collisionDetectionEnabled;
            const collisionCb = document.getElementById('collision-detection-toggle');
            if (collisionCb) collisionCb.checked = collisionDetectionEnabled;
        }

        if (state.podiumPosition) { podiumPosition = { ...state.podiumPosition }; updatePodiumPosition(); }
        if (state.podiumOriginalY !== undefined) podiumOriginalY = state.podiumOriginalY;

        if (state.concertGrandEnabled !== undefined) {
            concertGrandEnabled = state.concertGrandEnabled;
            const cb = document.getElementById('concert-grand-toggle');
            if (cb) cb.checked = concertGrandEnabled;
            if (state.concertGrandPosition) concertGrandPosition = { ...state.concertGrandPosition };

            const section = document.getElementById('concert-grand-section');
            if (section) {
                section.style.display = concertGrandEnabled ? 'block' : 'none';
                if (concertGrandEnabled) {
                    updateConcertGrandPosition();
                    if (!section.dataset.initialized) {
                        initializeConcertGrand();
                        section.dataset.initialized = 'true';
                    }
                }
            }
        }

        if (state.chorusEnabled !== undefined) {
            chorusEnabled = state.chorusEnabled;
            const cb = document.getElementById('chorus-toggle');
            if (cb) cb.checked = chorusEnabled;
            if (state.chorusRows !== undefined) chorusRows = state.chorusRows;

            const controls = document.getElementById('chorus-controls');
            if (controls) controls.style.display = chorusEnabled ? 'block' : 'none';

            if (chorusEnabled) {
                hideBrassWoodwindTimpaniRisers();

                if (state.chorusRisers && Array.isArray(state.chorusRisers)) {
                    chorusRisers = [];
                    state.chorusRisers.forEach(saved => {
                        const rd = {
                            id: saved.id, size: saved.size || '8x4', config: riserConfigs['8x4'],
                            x: saved.x, y: saved.y, dragging: false, dragOffset: { x: 0, y: 0 }, number: saved.number
                        };
                        chorusRisers.push(rd);
                        createChorusRiserElements(rd);
                        initializeChorusRiser(rd.id);
                    });
                }

                if (state.chorusSingersPerRow && Array.isArray(state.chorusSingersPerRow)) {
                    chorusSingersPerRow = [...state.chorusSingersPerRow];
                }

                if (state.chorusSingers && Array.isArray(state.chorusSingers)) {
                    chorusSingers = [];
                    state.chorusSingers.forEach(saved => {
                        const sd = { id: saved.id, rowIndex: saved.rowIndex, x: saved.x, y: saved.y, size: saved.size };
                        chorusSingers.push(sd);
                        createSingerElement(sd);
                    });
                }

                updateChorusRowInputs();
                updateChorusRowCount();
                updateTotalSingersCount();
            }
        }

        if (state.timpaniRiserPosition) { timpaniRiserPosition = { ...state.timpaniRiserPosition }; updateTimpaniRiserPosition(); }
        if (state.brassRiserPositions) {
            brassRiserPositions = { ...state.brassRiserPositions };
            Object.keys(brassRiserPositions).forEach(id => updateBrassRiserPosition(id));
        }
        if (state.woodwindRiserPositions) {
            woodwindRiserPositions = { ...state.woodwindRiserPositions };
            Object.keys(woodwindRiserPositions).forEach(id => updateWoodwindRiserPosition(id));
        }

        if (state.extraRisers && Array.isArray(state.extraRisers)) {
            extraRisers.forEach(rd => {
                const el = document.getElementById(rd.id);
                const label = document.getElementById(rd.id + '-label');
                if (el) el.remove();
                if (label) label.remove();
            });
            extraRisers = [];

            state.extraRisers.forEach(saved => {
                const config = riserConfigs[saved.size];
                if (config) {
                    const rd = {
                        id: saved.id, size: saved.size, config: config,
                        x: saved.x, y: saved.y, dragging: false, dragOffset: { x: 0, y: 0 },
                        number: saved.number || parseInt(saved.id.match(/extra-riser-(\d+)/)?.[1] || '0', 10)
                    };
                    extraRisers.push(rd);
                    createRiserElements(rd);
                    initializeExtraRiser(rd.id);
                }
            });
            updateExtraRiserCount();
        }

        if (state.percussionBlob) {
            percussionBlob.enabled = state.percussionBlob.enabled !== false;
            percussionBlob.targetArea = state.percussionBlob.targetArea || 0;
            percussionBlob.center = state.percussionBlob.center || { x: 200, y: 200 };
            percussionBlob.controlPoints = state.percussionBlob.controlPoints || [];
            percussionBlob.actualArea = calculateBlobArea(percussionBlob.controlPoints);
            renderPercussionBlob();
            updateBlobControlsVisibility();
        }

        if (state.riserVisibility) {
            if (state.riserVisibility.timpaniRiser !== undefined) {
                document.getElementById('timpani-riser-checkbox').checked = state.riserVisibility.timpaniRiser;
                toggleTimpaniRiser();
            }
            if (state.riserVisibility.brassRisers) {
                Object.keys(state.riserVisibility.brassRisers).forEach(id => {
                    const cb = document.getElementById(id + '-checkbox');
                    if (cb) {
                        cb.checked = state.riserVisibility.brassRisers[id];
                        if (!chorusEnabled) toggleBrassRiser(id);
                    }
                });
            }
            if (state.riserVisibility.woodwindRisers) {
                Object.keys(state.riserVisibility.woodwindRisers).forEach(id => {
                    const cb = document.getElementById(id + '-checkbox');
                    if (cb) {
                        cb.checked = state.riserVisibility.woodwindRisers[id];
                        if (!chorusEnabled) toggleWoodwindRiser(id);
                    }
                });
            }
            if (state.riserVisibility.stageExtensions) {
                Object.keys(state.riserVisibility.stageExtensions).forEach(id => {
                    const cb = document.getElementById(id + '-checkbox');
                    if (cb) { cb.checked = state.riserVisibility.stageExtensions[id]; toggleStageExtension(id); }
                });
            }
        }

        if (state.debugMode !== undefined && state.debugMode !== debugMode) toggleDebugMode();

        calculateSpace();
        updateStagePlot();

        alert('Stage plot configuration loaded successfully!');
    } catch (error) {
        alert('Error loading configuration: ' + error.message);
        console.error('Error restoring state:', error);
    }
}
