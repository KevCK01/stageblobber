// ============================================
// UTILS - SVG coordinates, geometry, collision
// ============================================

// Convert mouse/touch event to SVG coordinates
function getSvgMousePosition(e) {
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || e.pageX;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || e.pageY;

    const svg = document.querySelector('.stage-plot');
    const rect = svg.getBoundingClientRect();
    const svgRect = svg.viewBox.baseVal;

    const scaleX = svgRect.width / rect.width;
    const scaleY = svgRect.height / rect.height;

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

// Clamp position to SVG canvas boundaries
function constrainToCanvas(x, y) {
    return {
        x: Math.max(0, Math.min(SVG_WIDTH, x)),
        y: Math.max(0, Math.min(SVG_HEIGHT, y))
    };
}

// Check if a point is inside the trapezoidal stage
function isInsideStage(x, y, padding = 15) {
    const topLeft = { x: 237.5 + padding, y: 80 + padding };
    const topRight = { x: 762.5 - padding, y: 80 + padding };
    const bottomLeft = { x: 185 + padding, y: 665 - padding };
    const bottomRight = { x: 815 - padding, y: 665 - padding };

    if (y < topLeft.y || y > bottomLeft.y) return false;

    const yRatio = (y - topLeft.y) / (bottomLeft.y - topLeft.y);
    const leftBoundary = topLeft.x + yRatio * (bottomLeft.x - topLeft.x);
    const rightBoundary = topRight.x + yRatio * (bottomRight.x - topRight.x);

    return x >= leftBoundary && x <= rightBoundary;
}

// Check if two circles overlap
function circlesOverlap(x1, y1, r1, x2, y2, r2, minSpacing = 0.5) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (r1 + r2 + minSpacing);
}

// Get rotation angle from SVG transform attribute
function getRotationAngle(element) {
    const transform = element.getAttribute('transform');
    if (!transform) return 0;
    const match = transform.match(/rotate\(([-\d.]+)/);
    return match ? parseFloat(match[1]) * Math.PI / 180 : 0;
}

// Calculate effective radius of an ellipse at a given angle
function getEllipseRadiusAtAngle(rx, ry, angle) {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    return (rx * ry) / Math.sqrt((ry * cosA) ** 2 + (rx * sinA) ** 2);
}

// Check if two ellipses/circles collide (accounting for rotation)
function playersOverlap(player1, x1, y1, player2, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return true;

    const angleBetween = Math.atan2(dy, dx);

    let radius1;
    if (player1.tagName === 'ellipse') {
        const rx1 = parseFloat(player1.getAttribute('rx'));
        const ry1 = parseFloat(player1.getAttribute('ry'));
        const rotation1 = getRotationAngle(player1);
        radius1 = getEllipseRadiusAtAngle(rx1, ry1, angleBetween - rotation1);
    } else {
        radius1 = parseFloat(player1.getAttribute('r'));
    }

    let radius2;
    if (player2.tagName === 'ellipse') {
        const rx2 = parseFloat(player2.getAttribute('rx'));
        const ry2 = parseFloat(player2.getAttribute('ry'));
        const rotation2 = getRotationAngle(player2);
        radius2 = getEllipseRadiusAtAngle(rx2, ry2, (angleBetween + Math.PI) - rotation2);
    } else {
        radius2 = parseFloat(player2.getAttribute('r'));
    }

    return distance < (radius1 + radius2);
}

// Separate overlapping players in a group after drag
function separateOverlappingPlayers(playerIds) {
    if (!collisionDetectionEnabled || playerIds.length === 0) return;
    
    const maxIterations = 10;
    const minSpacing = 0.5; // Small gap between players
    
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        let hadOverlap = false;
        
        // Check all pairs of players in the group
        const players = [];
        playerIds.forEach(id => {
            const player = document.querySelector(`[data-player-id="${id}"]`);
            if (player) {
                players.push({
                    id: id,
                    element: player,
                    x: parseFloat(player.getAttribute('cx')),
                    y: parseFloat(player.getAttribute('cy'))
                });
            }
        });
        
        // For each pair, check overlap and push apart
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const p1 = players[i];
                const p2 = players[j];
                
                // Calculate distance
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance === 0) continue; // Skip if perfectly overlapped
                
                // Calculate effective radii
                const angleBetween = Math.atan2(dy, dx);
                
                let radius1;
                if (p1.element.tagName === 'ellipse') {
                    const rx1 = parseFloat(p1.element.getAttribute('rx'));
                    const ry1 = parseFloat(p1.element.getAttribute('ry'));
                    const rotation1 = getRotationAngle(p1.element);
                    radius1 = getEllipseRadiusAtAngle(rx1, ry1, angleBetween - rotation1);
                } else {
                    radius1 = parseFloat(p1.element.getAttribute('r'));
                }
                
                let radius2;
                if (p2.element.tagName === 'ellipse') {
                    const rx2 = parseFloat(p2.element.getAttribute('rx'));
                    const ry2 = parseFloat(p2.element.getAttribute('ry'));
                    const rotation2 = getRotationAngle(p2.element);
                    radius2 = getEllipseRadiusAtAngle(rx2, ry2, (angleBetween + Math.PI) - rotation2);
                } else {
                    radius2 = parseFloat(p2.element.getAttribute('r'));
                }
                
                const minDistance = radius1 + radius2 + minSpacing;
                
                // If overlapping, push apart
                if (distance < minDistance) {
                    hadOverlap = true;
                    const overlap = minDistance - distance;
                    const pushDistance = overlap / 2;
                    
                    // Calculate push direction (unit vector)
                    const pushX = (dx / distance) * pushDistance;
                    const pushY = (dy / distance) * pushDistance;
                    
                    // Push both players apart
                    p1.x -= pushX;
                    p1.y -= pushY;
                    p2.x += pushX;
                    p2.y += pushY;
                    
                    // Keep within stage bounds
                    p1.x = Math.max(15, Math.min(SVG_WIDTH - 15, p1.x));
                    p1.y = Math.max(15, Math.min(SVG_HEIGHT - 15, p1.y));
                    p2.x = Math.max(15, Math.min(SVG_WIDTH - 15, p2.x));
                    p2.y = Math.max(15, Math.min(SVG_HEIGHT - 15, p2.y));
                }
            }
        }
        
        // Update DOM positions
        players.forEach(p => {
            p.element.setAttribute('cx', p.x);
            p.element.setAttribute('cy', p.y);
            updatePlayerOrientation(p.element, p.x, p.y);
            
            const label = p.element.nextElementSibling;
            if (label && label.tagName === 'text') {
                label.setAttribute('x', p.x);
                label.setAttribute('y', p.y);
            }
            
            // Update custom positions
            customPositions[p.id] = { x: p.x, y: p.y };
        });
        
        // If no overlaps found, we're done
        if (!hadOverlap) break;
    }
}

// Check if a position would cause collision with other players
function wouldCollide(playerId, newX, newY, excludeIds = new Set()) {
    const allPlayers = document.querySelectorAll('.stage-plot circle[data-player-id], .stage-plot ellipse[data-player-id]');
    const movingPlayer = document.querySelector(`[data-player-id="${playerId}"]`);
    if (!movingPlayer) return false;

    for (const player of allPlayers) {
        const otherId = player.getAttribute('data-player-id');
        if (otherId === playerId || excludeIds.has(otherId)) continue;

        const otherX = parseFloat(player.getAttribute('cx'));
        const otherY = parseFloat(player.getAttribute('cy'));

        if (playersOverlap(movingPlayer, newX, newY, player, otherX, otherY)) {
            return true;
        }
    }

    // Check collision with percussion blob
    if (collisionDetectionEnabled && typeof circleCollidesWithBlob === 'function') {
        let movingRadius;
        if (movingPlayer.tagName === 'ellipse') {
            const rx = parseFloat(movingPlayer.getAttribute('rx'));
            const ry = parseFloat(movingPlayer.getAttribute('ry'));
            movingRadius = Math.max(rx, ry);
        } else {
            movingRadius = parseFloat(movingPlayer.getAttribute('r'));
        }
        if (circleCollidesWithBlob(newX, newY, movingRadius)) {
            return true;
        }
    }

    return false;
}

// Binary search to find closest valid position along a movement path
function findClosestValidPosition(playerId, fromX, fromY, toX, toY, excludeIds = new Set()) {
    if (!collisionDetectionEnabled) return { x: toX, y: toY };
    if (!wouldCollide(playerId, toX, toY, excludeIds)) return { x: toX, y: toY };
    if (wouldCollide(playerId, fromX, fromY, excludeIds)) return { x: fromX, y: fromY };

    let validX = fromX;
    let validY = fromY;
    let low = 0;
    let high = 1;

    for (let i = 0; i < 10; i++) {
        const mid = (low + high) / 2;
        const testX = fromX + (toX - fromX) * mid;
        const testY = fromY + (toY - fromY) * mid;

        if (wouldCollide(playerId, testX, testY, excludeIds)) {
            high = mid;
        } else {
            validX = testX;
            validY = testY;
            low = mid;
        }
    }

    return { x: validX, y: validY };
}

// Distance from point to line segment (used by percussion blob)
function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;

    if (len2 === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);

    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));

    const nearX = x1 + t * dx;
    const nearY = y1 + t * dy;

    return Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
}
