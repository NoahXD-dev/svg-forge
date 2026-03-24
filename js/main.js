const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');
const preview = document.getElementById('previewContainer');
const codeOutput = document.getElementById('codeOutput');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const elementCountEl = document.getElementById('elementCount');

// State
let tool = 'pen';
let isDrawing = false;
let startX, startY;
let currentPath = [];
let elements = [];
let undoStack = [];
let dashStyle = '';
let useFill = false;
let textInput = null;

// Style getters
const getStroke = () => document.getElementById('strokeColor').value;
const getFill = () => useFill ? document.getElementById('fillColor').value : 'none';
const getWidth = () => parseInt(document.getElementById('strokeWidth').value);
const getOpacity = () => parseInt(document.getElementById('opacityRange').value) / 100;

// Tool buttons
document.querySelectorAll('[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
        tool = btn.dataset.tool;
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
        if (tool === 'text') canvas.style.cursor = 'text';
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    const map = { p: 'pen', l: 'line', r: 'rect', c: 'circle', e: 'ellipse', a: 'arrow', t: 'text', s: 'select' };
    if (map[e.key]) {
        document.querySelector(`[data-tool="${map[e.key]}"]`)?.click();
    }
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
});

// Stroke width
document.getElementById('strokeWidth').addEventListener('input', function () {
    document.getElementById('strokeWidthVal').textContent = this.value;
});

// Opacity
document.getElementById('opacityRange').addEventListener('input', function () {
    document.getElementById('opacityVal').textContent = this.value + '%';
});

// Stroke color
document.getElementById('strokeColor').addEventListener('input', function () {
    document.getElementById('strokePreview').style.background = this.value;
});

// Fill color
document.getElementById('fillColor').addEventListener('input', function () {
    if (useFill) document.getElementById('fillPreview').style.background = this.value;
});

// Fill toggle
document.getElementById('fillNoneBtn').addEventListener('click', function () {
    useFill = false;
    this.classList.add('active');
    document.getElementById('fillOnBtn').classList.remove('active');
    document.getElementById('fillPreview').style.background = 'transparent';
    document.getElementById('fillPreview').style.opacity = '0';
});

document.getElementById('fillOnBtn').addEventListener('click', function () {
    useFill = true;
    this.classList.add('active');
    document.getElementById('fillNoneBtn').classList.remove('active');
    document.getElementById('fillPreview').style.background = document.getElementById('fillColor').value;
    document.getElementById('fillPreview').style.opacity = '1';
});

// Dash style
document.querySelectorAll('[data-dash]').forEach(btn => {
    btn.addEventListener('click', function () {
        dashStyle = this.dataset.dash;
        document.querySelectorAll('[data-dash]').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
    });
});

// Undo
document.getElementById('undoBtn').addEventListener('click', undo);
function undo() {
    if (elements.length > 0) {
        undoStack.push(elements.pop());
        redrawCanvas();
        updatePreview();
    }
}

// Clear
document.getElementById('clearBtn').addEventListener('click', () => {
    if (elements.length === 0) return;
    undoStack = [...elements];
    elements = [];
    redrawCanvas();
    updatePreview();
});

// ── CANVAS EVENTS ──
canvas.addEventListener('mousedown', onDown);
canvas.addEventListener('mousemove', onMove);
canvas.addEventListener('mouseup', onUp);
canvas.addEventListener('mouseleave', onUp);

function getPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function currentStyle() {
    return {
        stroke: getStroke(),
        fill: getFill(),
        width: getWidth(),
        opacity: getOpacity(),
        dash: dashStyle
    };
}

function onDown(e) {
    const { x, y } = getPos(e);
    startX = x; startY = y;

    // Text tool
    if (tool === 'text') {
        promptText(x, y);
        return;
    }

    isDrawing = true;
    if (tool === 'pen') {
        currentPath = [{ x, y }];
    }
}

function onMove(e) {
    if (!isDrawing) return;
    const { x, y } = getPos(e);

    redrawCanvas();
    drawPreviewShape(x, y);
}

function onUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    const { x, y } = getPos(e);
    const style = currentStyle();

    if (tool === 'pen') {
        if (currentPath.length > 1) {
            elements.push({ type: 'pen', path: [...currentPath], style });
        }
        currentPath = [];
    } else if (tool === 'line') {
        elements.push({ type: 'line', x1: startX, y1: startY, x2: x, y2: y, style });
    } else if (tool === 'rect') {
        const rx = Math.min(startX, x), ry = Math.min(startY, y);
        elements.push({ type: 'rect', x: rx, y: ry, w: Math.abs(x - startX), h: Math.abs(y - startY), style });
    } else if (tool === 'circle') {
        const r = Math.hypot(x - startX, y - startY);
        elements.push({ type: 'circle', cx: startX, cy: startY, r, style });
    } else if (tool === 'ellipse') {
        const rx = Math.abs(x - startX) / 2, ry2 = Math.abs(y - startY) / 2;
        const cx = (startX + x) / 2, cy = (startY + y) / 2;
        elements.push({ type: 'ellipse', cx, cy, rx, ry: ry2, style });
    } else if (tool === 'arrow') {
        elements.push({ type: 'arrow', x1: startX, y1: startY, x2: x, y2: y, style });
    }

    redrawCanvas();
    updatePreview();
    updateCount();
}

function drawPreviewShape(x, y) {
    const style = currentStyle();
    applyCtxStyle(style);

    if (tool === 'pen') {
        currentPath.push({ x, y });
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        currentPath.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
    } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (tool === 'rect') {
        const rx = Math.min(startX, x), ry = Math.min(startY, y);
        ctx.beginPath();
        ctx.rect(rx, ry, Math.abs(x - startX), Math.abs(y - startY));
        if (style.fill !== 'none') ctx.fill();
        ctx.stroke();
    } else if (tool === 'circle') {
        const r = Math.hypot(x - startX, y - startY);
        ctx.beginPath();
        ctx.arc(startX, startY, r, 0, Math.PI * 2);
        if (style.fill !== 'none') ctx.fill();
        ctx.stroke();
    } else if (tool === 'ellipse') {
        const rx = Math.abs(x - startX) / 2, ry2 = Math.abs(y - startY) / 2;
        const cx = (startX + x) / 2, cy = (startY + y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(rx, 1), Math.max(ry2, 1), 0, 0, Math.PI * 2);
        if (style.fill !== 'none') ctx.fill();
        ctx.stroke();
    } else if (tool === 'arrow') {
        drawArrowCtx(startX, startY, x, y, style);
    }
}

function applyCtxStyle(style) {
    ctx.strokeStyle = style.stroke;
    ctx.fillStyle = style.fill === 'none' ? 'transparent' : style.fill;
    ctx.lineWidth = style.width;
    ctx.globalAlpha = style.opacity;
    ctx.setLineDash(style.dash ? style.dash.split(',').map(Number) : []);
}

function drawArrowCtx(x1, y1, x2, y2, style) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = Math.max(10, style.width * 3);
    applyCtxStyle(style);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = style.stroke;
    ctx.fill();
}

function drawElement(el) {
    const s = el.style;
    applyCtxStyle(s);

    if (el.type === 'pen') {
        ctx.beginPath();
        ctx.moveTo(el.path[0].x, el.path[0].y);
        el.path.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
    } else if (el.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(el.x1, el.y1);
        ctx.lineTo(el.x2, el.y2);
        ctx.stroke();
    } else if (el.type === 'rect') {
        ctx.beginPath();
        ctx.rect(el.x, el.y, el.w, el.h);
        if (s.fill !== 'none') ctx.fill();
        ctx.stroke();
    } else if (el.type === 'circle') {
        ctx.beginPath();
        ctx.arc(el.cx, el.cy, el.r, 0, Math.PI * 2);
        if (s.fill !== 'none') ctx.fill();
        ctx.stroke();
    } else if (el.type === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(el.cx, el.cy, Math.max(el.rx, 1), Math.max(el.ry, 1), 0, 0, Math.PI * 2);
        if (s.fill !== 'none') ctx.fill();
        ctx.stroke();
    } else if (el.type === 'arrow') {
        drawArrowCtx(el.x1, el.y1, el.x2, el.y2, s);
    } else if (el.type === 'text') {
        ctx.globalAlpha = s.opacity;
        ctx.fillStyle = s.stroke;
        ctx.font = `${s.width * 6 + 10}px Syne, sans-serif`;
        ctx.fillText(el.text, el.x, el.y);
    }
    ctx.globalAlpha = 1;
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    elements.forEach(drawElement);
}

// ── TEXT TOOL ──
function promptText(x, y) {
    const style = currentStyle();
    const size = style.width * 6 + 10;

    // Overlay input
    const wrap = canvas.parentElement;
    const rect = canvas.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.placeholder = 'Escribe aquí...';
    inp.style.cssText = `
    position:absolute;
    left:${rect.left - wrapRect.left + x}px;
    top:${rect.top - wrapRect.top + y - size}px;
    font-size:${size}px;
    font-family:'Syne',sans-serif;
    color:${style.stroke};
    background:rgba(0,0,0,0.6);
    border:1px dashed ${style.stroke};
    outline:none;
    padding:2px 6px;
    border-radius:3px;
    z-index:999;
    min-width:120px;
  `;
    wrap.appendChild(inp);
    inp.focus();

    function commit() {
        const val = inp.value.trim();
        if (val) {
            elements.push({ type: 'text', text: val, x, y, style });
            redrawCanvas();
            updatePreview();
            updateCount();
        }
        inp.remove();
    }

    inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') inp.remove();
        e.stopPropagation();
    });
    inp.addEventListener('blur', commit);
}

// ── SVG GENERATION ──
function generateSVG() {
    const w = canvas.width, h = canvas.height;
    let parts = [`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`];

    elements.forEach(el => {
        const s = el.style;
        const dashAttr = s.dash ? ` stroke-dasharray="${s.dash}"` : '';
        const common = `stroke="${s.stroke}" stroke-width="${s.width}" fill="${s.fill}" opacity="${s.opacity}"${dashAttr}`;

        if (el.type === 'pen') {
            const d = 'M ' + el.path.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).join(' L ');
            parts.push(`  <path d="${d}" ${common} fill="none"/>`);
        } else if (el.type === 'line') {
            parts.push(`  <line x1="${Math.round(el.x1)}" y1="${Math.round(el.y1)}" x2="${Math.round(el.x2)}" y2="${Math.round(el.y2)}" ${common}/>`);
        } else if (el.type === 'rect') {
            parts.push(`  <rect x="${Math.round(el.x)}" y="${Math.round(el.y)}" width="${Math.round(el.w)}" height="${Math.round(el.h)}" ${common}/>`);
        } else if (el.type === 'circle') {
            parts.push(`  <circle cx="${Math.round(el.cx)}" cy="${Math.round(el.cy)}" r="${Math.round(el.r)}" ${common}/>`);
        } else if (el.type === 'ellipse') {
            parts.push(`  <ellipse cx="${Math.round(el.cx)}" cy="${Math.round(el.cy)}" rx="${Math.round(el.rx)}" ry="${Math.round(el.ry)}" ${common}/>`);
        } else if (el.type === 'arrow') {
            const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
            const hl = Math.max(10, s.width * 3);
            const ax1 = Math.round(el.x2 - hl * Math.cos(angle - Math.PI / 6));
            const ay1 = Math.round(el.y2 - hl * Math.sin(angle - Math.PI / 6));
            const ax2 = Math.round(el.x2 - hl * Math.cos(angle + Math.PI / 6));
            const ay2 = Math.round(el.y2 - hl * Math.sin(angle + Math.PI / 6));
            const markId = `arrow-${Math.random().toString(36).slice(2, 6)}`;
            parts.push(`  <line x1="${Math.round(el.x1)}" y1="${Math.round(el.y1)}" x2="${Math.round(el.x2)}" y2="${Math.round(el.y2)}" ${common}/>`);
            parts.push(`  <polygon points="${Math.round(el.x2)},${Math.round(el.y2)} ${ax1},${ay1} ${ax2},${ay2}" fill="${s.stroke}" opacity="${s.opacity}"/>`);
        } else if (el.type === 'text') {
            const fontSize = s.width * 6 + 10;
            parts.push(`  <text x="${Math.round(el.x)}" y="${Math.round(el.y)}" font-size="${fontSize}" fill="${s.stroke}" opacity="${s.opacity}" font-family="sans-serif">${escapeXml(el.text)}</text>`);
        }
    });

    parts.push('</svg>');
    return parts.join('\n');
}

function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function updatePreview() {
    const svg = generateSVG();
    preview.innerHTML = svg;
    codeOutput.value = svg;
}

function updateCount() {
    elementCountEl.textContent = `${elements.length} elemento${elements.length !== 1 ? 's' : ''}`;
}

// ── COPY ──
copyBtn.addEventListener('click', async () => {
    const code = codeOutput.value;
    if (!code) return;
    try {
        await navigator.clipboard.writeText(code);
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:#000;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><polyline points="20 6 9 17 4 12"/></svg> ¡Copiado!`;
        setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = `<svg viewBox="0 0 24 24" style="width:12px;height:12px;stroke:#000;fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar código`;
        }, 2000);
    } catch {
        codeOutput.select();
        document.execCommand('copy');
    }
});

// ── DOWNLOAD ──
downloadBtn.addEventListener('click', () => {
    const svg = generateSVG();
    if (!svg || elements.length === 0) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'svgforge-drawing.svg';
    a.click();
    URL.revokeObjectURL(url);
});

// Init
updatePreview();