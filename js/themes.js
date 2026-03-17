// ============================================
// THEMES - Theme switching functionality
// ============================================

// Helper function to get current theme's riser colors
function getCurrentRiserColors() {
    // Read from body element since theme classes are applied there
    const styles = getComputedStyle(document.body);
    let fill = styles.getPropertyValue('--riser-fill').trim();
    let stroke = styles.getPropertyValue('--riser-stroke').trim();
    
    // Fallback to default dark mode colors if CSS variables aren't loaded yet
    if (!fill) fill = '#3e3e42';
    if (!stroke) stroke = '#555555';
    
    return { fill, stroke };
}

function changeTheme(theme) {
    const body = document.body;
    const stagePlot = document.querySelector('.stage-plot');
    
    // Remove existing theme classes
    body.classList.remove('theme-nord', 'theme-solarized');
    
    // Apply new theme
    if (theme === 'nord') {
        body.classList.add('theme-nord');
        updateSVGTheme('#2e3440', '#4c566a', '#5e81ac', '#3b4252', '#434c5e', '#3b4252');
    } else if (theme === 'solarized') {
        body.classList.add('theme-solarized');
        updateSVGTheme('#fdf6e3', '#eee8d5', '#93a1a1', '#d5ccb8', '#d5ccb8', '#c2b9a5');
    } else {
        // Dark mode (default) - Traditional Dark Mode
        updateSVGTheme('#1e1e1e', '#37373d', '#6e6e6e', '#3e3e42', '#3e3e42', '#555555');
    }
    
    // Save theme preference
    localStorage.setItem('selectedTheme', theme);
}

function updateSVGTheme(svgBg, stageFloor, stageBoundary, gridColor, riserFill, riserStroke) {
    // Update stage floor
    const stageFloorElements = document.querySelectorAll('.stage-floor');
    stageFloorElements.forEach(el => {
        el.setAttribute('fill', stageFloor);
    });
    
    // Update stage boundaries
    const stageBoundaryElements = document.querySelectorAll('.stage-boundary');
    stageBoundaryElements.forEach(el => {
        el.setAttribute('stroke', stageBoundary);
    });
    
    // Update stage extensions (they have stage-floor class, but also need stroke updated)
    document.querySelectorAll('#stage-extension-1, #stage-extension-2').forEach(el => {
        el.setAttribute('fill', stageFloor);
        el.setAttribute('stroke', stageBoundary);
    });
    
    // Update side rectangles
    document.querySelectorAll('polygon[points*="665"]').forEach(el => {
        if (el.getAttribute('points').includes('245,685') || el.getAttribute('points').includes('755,685')) {
            el.setAttribute('fill', stageFloor);
            el.setAttribute('stroke', stageBoundary);
        }
    });
    
    // Update stage labels
    document.querySelectorAll('.stage-label').forEach(el => {
        el.setAttribute('fill', stageBoundary);
    });
    
    // Update grid
    const gridLine = document.getElementById('grid-line');
    if (gridLine) {
        gridLine.setAttribute('stroke', gridColor);
    }
    
    // Update center line
    const centerLine = document.getElementById('center-line');
    if (centerLine) {
        centerLine.setAttribute('stroke', stageBoundary);
    }
    
    // Update hashmarks
    document.querySelectorAll('.stage-hashmark').forEach(el => {
        el.setAttribute('stroke', stageBoundary);
    });
    
    // Update extension lines
    document.querySelectorAll('.stage-extension-line').forEach(el => {
        el.setAttribute('stroke', stageBoundary);
    });
    
    // Update ruler lines
    document.querySelectorAll('.ruler-line').forEach(el => {
        el.setAttribute('stroke', stageBoundary);
    });
    
    // Update all risers (including dynamically created ones)
    const risers = document.querySelectorAll('rect[id*="riser"], rect[data-riser-type]');
    risers.forEach(riser => {
        // Don't update risers with custom IDs that shouldn't change
        const id = riser.getAttribute('id');
        if (id && !id.includes('custom-riser')) {
            riser.setAttribute('fill', riserFill);
            riser.setAttribute('stroke', riserStroke);
        }
    });
    
    // Update podium to match risers
    document.querySelectorAll('.podium-element').forEach(el => {
        el.setAttribute('fill', riserFill);
        el.setAttribute('stroke', riserStroke);
    });
    
    // Update chorus singers to match theme
    const chorusSingerColor = getComputedStyle(document.body).getPropertyValue('--chorus-singer').trim();
    const chorusSingerStroke = getComputedStyle(document.body).getPropertyValue('--chorus-singer-stroke').trim();
    document.querySelectorAll('.chorus-singer').forEach(singer => {
        singer.setAttribute('fill', chorusSingerColor);
        singer.setAttribute('stroke', chorusSingerStroke);
    });
}

// Load saved theme on page load
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('selectedTheme') || 'dark';
    const selector = document.getElementById('theme-selector');
    if (selector) {
        selector.value = savedTheme;
        changeTheme(savedTheme);
    }
}
