// ============================================
// PERCUSSION BLOB - Deformable shape system
// ============================================

function initializePercussionBlob() {
    let blobGroup = document.getElementById('percussion-blob-group');
    if (!blobGroup) {
        const percussionSection = document.getElementById('percussion-section');
        if (percussionSection) {
            blobGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            blobGroup.setAttribute('id', 'percussion-blob-group');
            percussionSection.appendChild(blobGroup);
        }
    }

    document.addEventListener('mousemove', handleBlobDragMove);
    document.addEventListener('mouseup', handleBlobDragEnd);
    document.addEventListener('touchmove', handleBlobDragMove);
    document.addEventListener('touchend', handleBlobDragEnd);
}

function calculatePercussionArea() {
    const percussionContainer = document.getElementById('percussionInstruments');
    let totalSqFt = 0;

    dynamicInstruments.forEach(instrumentId => {
        const countEl = document.getElementById(instrumentId);
        if (countEl && percussionContainer && percussionContainer.contains(countEl)) {
            const sqftEl = document.getElementById(instrumentId + '_sqft');
            if (sqftEl) {
                totalSqFt += (parseInt(countEl.value) || 0) * (parseFloat(sqftEl.value) || 0);
            }
        }
    });

    return totalSqFt;
}

function createInitialBlob(centerX, centerY, areaSqFt) {
    if (areaSqFt <= 0) {
        percussionBlob.controlPoints = [];
        return;
    }

    const areaPixels = areaSqFt * PIXELS_PER_SQFT;
    const radius = Math.sqrt(areaPixels / Math.PI);

    const points = [];
    for (let i = 0; i < BLOB_DEFAULT_POINTS; i++) {
        const angle = (i / BLOB_DEFAULT_POINTS) * 2 * Math.PI - Math.PI / 2;
        points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
        });
    }

    percussionBlob.center = { x: centerX, y: centerY };
    percussionBlob.controlPoints = points;
    percussionBlob.targetArea = areaSqFt;
}

// --- SVG Path Generation (Catmull-Rom splines) ---

function generateBlobPath(points) {
    if (points.length < 3) return '';
    const n = points.length;
    let path = '';

    for (let i = 0; i < n; i++) {
        const p0 = points[(i - 1 + n) % n];
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        const p3 = points[(i + 2) % n];
        const tension = 0.5;

        const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
        const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
        const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
        const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

        if (i === 0) path = `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
        path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    return path + ' Z';
}

// --- Area Calculation ---

function calculateBlobArea(points) {
    if (points.length < 3) return 0;
    const sampledPoints = sampleBlobPath(points, 100);

    let area = 0;
    const n = sampledPoints.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += sampledPoints[i].x * sampledPoints[j].y;
        area -= sampledPoints[j].x * sampledPoints[i].y;
    }

    return Math.abs(area) / 2 / PIXELS_PER_SQFT;
}

function sampleBlobPath(controlPoints, numSamples) {
    if (controlPoints.length < 3) return [];
    const sampledPoints = [];
    const n = controlPoints.length;
    const samplesPerSegment = Math.ceil(numSamples / n);

    for (let i = 0; i < n; i++) {
        const p0 = controlPoints[(i - 1 + n) % n];
        const p1 = controlPoints[i];
        const p2 = controlPoints[(i + 1) % n];
        const p3 = controlPoints[(i + 2) % n];
        const tension = 0.5;

        const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
        const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
        const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
        const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

        for (let t = 0; t < 1; t += 1 / samplesPerSegment) {
            sampledPoints.push(cubicBezierPoint(p1, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, p2, t));
        }
    }

    return sampledPoints;
}

function cubicBezierPoint(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    return {
        x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
        y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
}

// --- Scaling ---

function scaleBlobToArea(targetAreaSqFt) {
    if (percussionBlob.controlPoints.length < 3) return;
    const currentArea = calculateBlobArea(percussionBlob.controlPoints);
    if (currentArea <= 0) return;
    if (Math.abs(currentArea - targetAreaSqFt) <= BLOB_AREA_TOLERANCE) {
        percussionBlob.actualArea = currentArea;
        return;
    }

    const scaleFactor = Math.sqrt(targetAreaSqFt / currentArea);
    let cx = 0, cy = 0;
    percussionBlob.controlPoints.forEach(p => { cx += p.x; cy += p.y; });
    cx /= percussionBlob.controlPoints.length;
    cy /= percussionBlob.controlPoints.length;

    percussionBlob.controlPoints = percussionBlob.controlPoints.map(p => ({
        x: cx + (p.x - cx) * scaleFactor,
        y: cy + (p.y - cy) * scaleFactor
    }));
    percussionBlob.center = { x: cx, y: cy };
    percussionBlob.actualArea = targetAreaSqFt;
}

// --- Rendering ---

function renderPercussionBlob() {
    let blobGroup = document.getElementById('percussion-blob-group');
    if (!blobGroup) {
        const percussionSection = document.getElementById('percussion-section');
        if (percussionSection) {
            blobGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            blobGroup.setAttribute('id', 'percussion-blob-group');
            percussionSection.appendChild(blobGroup);
        }
    }
    if (!blobGroup) return;

    blobGroup.innerHTML = '';

    if (!percussionBlob.enabled || percussionBlob.controlPoints.length < 3) return;

    const pathData = generateBlobPath(percussionBlob.controlPoints);

    const blobPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    blobPath.setAttribute('id', 'percussion-blob-path');
    blobPath.setAttribute('d', pathData);
    blobPath.setAttribute('fill', 'rgba(139, 92, 246, 0.3)');
    blobPath.setAttribute('stroke', '#8b5cf6');
    blobPath.setAttribute('stroke-width', '2');
    blobPath.setAttribute('cursor', 'move');
    blobPath.classList.add('percussion-blob');
    blobPath.addEventListener('mousedown', startBlobMove);
    blobPath.addEventListener('touchstart', startBlobMove);
    blobGroup.appendChild(blobPath);

    // Control point handles
    percussionBlob.controlPoints.forEach((point, index) => {
        const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        handle.setAttribute('cx', point.x);
        handle.setAttribute('cy', point.y);
        handle.setAttribute('r', '6');
        handle.setAttribute('fill', '#8b5cf6');
        handle.setAttribute('stroke', 'white');
        handle.setAttribute('stroke-width', '2');
        handle.setAttribute('cursor', 'pointer');
        handle.setAttribute('data-point-index', index);
        handle.classList.add('blob-control-point');
        handle.addEventListener('mousedown', (e) => startBlobPointDrag(e, index));
        handle.addEventListener('touchstart', (e) => startBlobPointDrag(e, index));
        blobGroup.appendChild(handle);
    });

    // Center label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', percussionBlob.center.x);
    label.setAttribute('y', percussionBlob.center.y);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('dominant-baseline', 'middle');
    label.setAttribute('fill', '#5b21b6');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-weight', 'bold');
    label.setAttribute('pointer-events', 'none');
    label.textContent = `PERC (${percussionBlob.actualArea.toFixed(0)} sq ft)`;
    blobGroup.appendChild(label);
}

// --- Drag Handlers ---

function startBlobPointDrag(e, pointIndex) {
    e.preventDefault();
    e.stopPropagation();
    
    percussionBlob.isDragging = true;
    percussionBlob.dragPointIndex = pointIndex;
    
    // Capture pre-drag state for undo
    if (percussionBlob && percussionBlob.controlPoints) {
        preDragState = { 
            percussionBlob: { 
                vertices: percussionBlob.controlPoints.map(v => ({ x: v.x, y: v.y })) 
            } 
        };
    }

    const mouse = getSvgMousePosition(e);
    const point = percussionBlob.controlPoints[pointIndex];
    percussionBlob.dragOffset = { x: mouse.x - point.x, y: mouse.y - point.y };
}

function startBlobMove(e) {
    if (e.target.classList.contains('blob-control-point')) return;
    e.preventDefault();
    e.stopPropagation();
    
    percussionBlob.isDragging = true;
    percussionBlob.dragPointIndex = -1;
    blobMoveStart = getSvgMousePosition(e);
    
    // Capture pre-drag state for undo
    if (percussionBlob && percussionBlob.controlPoints) {
        preDragState = { 
            percussionBlob: { 
                vertices: percussionBlob.controlPoints.map(v => ({ x: v.x, y: v.y })) 
            } 
        };
    }
}

function handleBlobDragMove(e) {
    if (!percussionBlob.isDragging) return;
    const mouse = getSvgMousePosition(e);

    if (percussionBlob.dragPointIndex >= 0) {
        percussionBlob.controlPoints[percussionBlob.dragPointIndex] = {
            x: mouse.x - percussionBlob.dragOffset.x,
            y: mouse.y - percussionBlob.dragOffset.y
        };
        scaleBlobToArea(percussionBlob.targetArea);
        renderPercussionBlob();
    } else if (blobMoveStart) {
        const dx = mouse.x - blobMoveStart.x;
        const dy = mouse.y - blobMoveStart.y;
        percussionBlob.controlPoints = percussionBlob.controlPoints.map(p => ({ x: p.x + dx, y: p.y + dy }));
        percussionBlob.center.x += dx;
        percussionBlob.center.y += dy;
        blobMoveStart = { x: mouse.x, y: mouse.y };
        renderPercussionBlob();
    }
}

function handleBlobDragEnd(e) {
    if (!percussionBlob.isDragging) return;
    
    // Check if blob actually moved (more than 2 pixels on any vertex)
    let blobMoved = false;
    if (preDragState && preDragState.percussionBlob && preDragState.percussionBlob.vertices && percussionBlob.controlPoints) {
        const preDragVertices = preDragState.percussionBlob.vertices;
        for (let i = 0; i < Math.min(preDragVertices.length, percussionBlob.controlPoints.length); i++) {
            const distance = Math.sqrt(
                Math.pow(percussionBlob.controlPoints[i].x - preDragVertices[i].x, 2) + 
                Math.pow(percussionBlob.controlPoints[i].y - preDragVertices[i].y, 2)
            );
            if (distance > 2) {
                blobMoved = true;
                break;
            }
        }
    }
    
    percussionBlob.isDragging = false;
    percussionBlob.dragPointIndex = -1;
    blobMoveStart = null;
    scaleBlobToArea(percussionBlob.targetArea);
    renderPercussionBlob();
    
    // Push pre-drag state to undo stack (only if moved)
    if (blobMoved && typeof pushUndoStateWithPreDragState === 'function' && preDragState) {
        pushUndoStateWithPreDragState(preDragState);
    }
    preDragState = null;
    
    if (debugMode) updateDebugInfo();
}

// --- Collision Detection ---

function isPointInsideBlob(x, y) {
    if (percussionBlob.controlPoints.length < 3) return false;
    const sampledPoints = sampleBlobPath(percussionBlob.controlPoints, 50);
    let inside = false;
    const n = sampledPoints.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = sampledPoints[i].x, yi = sampledPoints[i].y;
        const xj = sampledPoints[j].x, yj = sampledPoints[j].y;
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

function circleCollidesWithBlob(cx, cy, radius) {
    if (percussionBlob.controlPoints.length < 3) return false;
    if (isPointInsideBlob(cx, cy)) return true;

    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
        if (isPointInsideBlob(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))) return true;
    }

    const sampledPoints = sampleBlobPath(percussionBlob.controlPoints, 50);
    for (const point of sampledPoints) {
        if (Math.sqrt((point.x - cx) ** 2 + (point.y - cy) ** 2) < radius) return true;
    }

    return false;
}

// --- Vertex Management ---

function addBlobVertex() {
    if (percussionBlob.controlPoints.length < 3) return;
    const n = percussionBlob.controlPoints.length;
    let maxDist = 0, maxIndex = 0;

    for (let i = 0; i < n; i++) {
        const p1 = percussionBlob.controlPoints[i];
        const p2 = percussionBlob.controlPoints[(i + 1) % n];
        const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        if (dist > maxDist) { maxDist = dist; maxIndex = i; }
    }

    const newPoints = [];
    for (let i = 0; i < n; i++) {
        newPoints.push(percussionBlob.controlPoints[i]);
        if (i === maxIndex) {
            const p1 = percussionBlob.controlPoints[i];
            const p2 = percussionBlob.controlPoints[(i + 1) % n];
            newPoints.push({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
        }
    }

    percussionBlob.controlPoints = newPoints;
    scaleBlobToArea(percussionBlob.targetArea);
    updateBlobVertexCount();
    renderPercussionBlob();
}

function removeBlobVertex() {
    if (percussionBlob.controlPoints.length <= BLOB_MIN_POINTS) return;
    const n = percussionBlob.controlPoints.length;
    let shortestEdgeSum = Infinity, removeIndex = 0;

    for (let i = 0; i < n; i++) {
        const p0 = percussionBlob.controlPoints[(i - 1 + n) % n];
        const p1 = percussionBlob.controlPoints[i];
        const p2 = percussionBlob.controlPoints[(i + 1) % n];
        const edgeSum = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2) +
                        Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        if (edgeSum < shortestEdgeSum) { shortestEdgeSum = edgeSum; removeIndex = i; }
    }

    percussionBlob.controlPoints.splice(removeIndex, 1);
    scaleBlobToArea(percussionBlob.targetArea);
    updateBlobVertexCount();
    renderPercussionBlob();
}

function addBlobControlPoint(x, y) {
    if (percussionBlob.controlPoints.length < 3) return;
    let minDist = Infinity, insertIndex = 0;
    const n = percussionBlob.controlPoints.length;

    for (let i = 0; i < n; i++) {
        const p1 = percussionBlob.controlPoints[i];
        const p2 = percussionBlob.controlPoints[(i + 1) % n];
        const dist = pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
        if (dist < minDist) { minDist = dist; insertIndex = i + 1; }
    }

    percussionBlob.controlPoints.splice(insertIndex, 0, { x, y });
    scaleBlobToArea(percussionBlob.targetArea);
    renderPercussionBlob();
}

// --- Update & UI ---

function updatePercussionBlob() {
    const totalArea = calculatePercussionArea();

    if (totalArea <= 0) {
        percussionBlob.controlPoints = [];
        percussionBlob.targetArea = 0;
        percussionBlob.actualArea = 0;
        renderPercussionBlob();
        updateBlobControlsVisibility();
        return;
    }

    if (percussionBlob.controlPoints.length < 3) {
        createInitialBlob(200, 200, totalArea);
    } else {
        percussionBlob.targetArea = totalArea;
        scaleBlobToArea(totalArea);
    }

    percussionBlob.actualArea = calculateBlobArea(percussionBlob.controlPoints);
    renderPercussionBlob();
    updateBlobControlsVisibility();
}

function updateBlobVertexCount() {
    const el = document.getElementById('blobVertexCount');
    if (el) el.textContent = percussionBlob.controlPoints.length;
}

function updateBlobControlsVisibility() {
    const blobControls = document.getElementById('blobControls');
    if (blobControls) {
        if (percussionBlob.controlPoints.length > 0) {
            blobControls.style.display = 'block';
            updateBlobVertexCount();
        } else {
            blobControls.style.display = 'none';
        }
    }
}
