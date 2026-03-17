// ============================================================
// VISION SENTINEL | Main Application Logic
// ============================================================

// Global State
let currentFiles = new Array(9).fill(null);
let wasRunning = false;

// DOM Elements
let el = {
    masterDropZone: null,
    masterInput: null,
    questionInput: null,
    gridSlots: [],
    resultsList: null,
    confRange: null,
    confVal: null,
    objectCount: null,
    latencyText: null,
    gridCountText: null,
    gridProgressBar: null,
    clearGridBtn: null,
    detectBtn: null,
    trainBtn: null,
    trainLabel: null,
    startTrainBtn: null,
    trainStatus: null,
    modalOverlay: null,
    confirmModal: null,
    cancelModal: null
};

// ─── Initialization ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initListeners();
    fetchSystemInfo();
    pollTrainingStatus();
    initTimestamp();
});

function initElements() {
    el.masterDropZone = document.getElementById('master-drop-zone');
    el.masterInput = document.getElementById('master-file-input');
    el.questionInput = document.getElementById('question-input');
    el.gridSlots = document.querySelectorAll('.grid-slot');
    el.resultsList = document.getElementById('results-list');
    el.confRange = document.getElementById('conf-range');
    el.confVal = document.getElementById('conf-val');
    el.objectCount = document.getElementById('object-count');
    el.latencyText = document.getElementById('latency');
    el.gridCountText = document.getElementById('grid-count');
    el.gridProgressBar = document.getElementById('grid-progress');
    el.clearGridBtn = document.getElementById('clearGridBtn');
    el.detectBtn = document.getElementById('detectBtn');
    el.trainBtn = document.getElementById('trainBtn');
    el.trainLabel = document.getElementById('trainLabel');
    el.startTrainBtn = document.getElementById('startTrainBtn');
    el.trainStatus = document.getElementById('trainStatus');
    el.modalOverlay = document.getElementById('modal-overlay');
    el.confirmModal = document.getElementById('confirmModal');
    el.cancelModal = document.getElementById('cancelModal');

    // Force hide modal
    if (el.modalOverlay) {
        el.modalOverlay.style.display = 'none';
        el.modalOverlay.style.visibility = 'hidden';
    }
}

function initListeners() {
    // 1. Grid Slots
    if (el.gridSlots) {
        el.gridSlots.forEach(slot => {
            const index = parseInt(slot.dataset.index);
            const input = slot.querySelector('.slot-input');

            slot.addEventListener('click', (e) => {
                if (input && e.target !== input) input.click();
            });

            if (input) {
                input.addEventListener('change', (e) => {
                    if (e.target.files.length) handleSlotFile(index, e.target.files[0]);
                });
            }

            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('active');
            });
            slot.addEventListener('dragleave', () => slot.classList.remove('active'));
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('active');
                if (e.dataTransfer.files.length) handleSlotFile(index, e.dataTransfer.files[0]);
            });
        });
    }

    // 2. Master Drop Zone
    if (el.masterDropZone && el.masterInput) {
        el.masterDropZone.addEventListener('click', (e) => {
            if (e.target !== el.masterInput) el.masterInput.click();
        });
        el.masterInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleBatchFiles(Array.from(e.target.files).slice(0, 9));
        });
        el.masterDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            el.masterDropZone.classList.add('border-neon', 'bg-neon/5');
        });
        el.masterDropZone.addEventListener('dragleave', () => {
            el.masterDropZone.classList.remove('border-neon', 'bg-neon/5');
        });
        el.masterDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            el.masterDropZone.classList.remove('border-neon', 'bg-neon/5');
            if (e.dataTransfer.files.length) handleBatchFiles(Array.from(e.dataTransfer.files).slice(0, 9));
        });
    }

    // 3. Global Controls
    if (el.confRange) {
        el.confRange.addEventListener('input', (e) => {
            if (el.confVal) el.confVal.textContent = parseFloat(e.target.value).toFixed(2);
        });
    }

    if (el.clearGridBtn) el.clearGridBtn.addEventListener('click', handleClearGrid);
    if (el.detectBtn) el.detectBtn.addEventListener('click', handleBatchDetection);
    if (el.trainBtn) el.trainBtn.addEventListener('click', handleSaveTraining);

    // 4. Modal
    if (el.startTrainBtn) {
        el.startTrainBtn.addEventListener('click', () => {
            if (el.modalOverlay) {
                el.modalOverlay.style.display = 'flex';
                el.modalOverlay.style.visibility = 'visible';
            }
        });
    }

    if (el.cancelModal) {
        el.cancelModal.addEventListener('click', () => {
            if (el.modalOverlay) {
                el.modalOverlay.style.display = 'none';
                el.modalOverlay.style.visibility = 'hidden';
            }
            showToast('Protocol sequence aborted', 'info');
        });
    }

    if (el.confirmModal) el.confirmModal.addEventListener('click', handleConfirmTraining);

    // 5. Resize
    window.addEventListener('resize', () => {
        // Redraw logic if needed
    });
}

// ─── Actions ─────────────────────────────────────────────

function handleSlotFile(index, file) {
    if (!file.type.startsWith('image/')) {
        showToast('Image files only', 'error');
        return;
    }

    currentFiles[index] = file;
    const slot = document.querySelector(`.grid-slot[data-index="${index}"]`);
    if (!slot) return;

    const img = slot.querySelector('img');
    const placeholder = slot.querySelector('.slot-placeholder');
    const badge = slot.querySelector('.slot-badge');

    const reader = new FileReader();
    reader.onload = (e) => {
        if (img) {
            img.src = e.target.result;
            img.classList.remove('hidden');
            img.style.opacity = '1';
        }
        if (placeholder) placeholder.classList.add('hidden');
        if (badge) badge.classList.add('hidden');
        updateGridStatus();
    };
    reader.readAsDataURL(file);
    showToast(`Slot ${index + 1} updated`, 'success');
}

function handleBatchFiles(files) {
    files.forEach((file, i) => {
        if (i < 9) handleSlotFile(i, file);
    });
}

function updateGridStatus() {
    const loadedCount = currentFiles.filter(f => f !== null).length;
    if (el.gridCountText) el.gridCountText.textContent = `${loadedCount}/9 SLOTS LOADED`;
    if (el.gridProgressBar) el.gridProgressBar.style.width = `${(loadedCount / 9) * 100}%`;
}

function handleClearGrid(e) {
    if (e) e.stopPropagation();
    currentFiles.fill(null);
    if (el.gridSlots) {
        el.gridSlots.forEach(slot => {
            const img = slot.querySelector('img');
            const placeholder = slot.querySelector('.slot-placeholder');
            const input = slot.querySelector('.slot-input');
            const badge = slot.querySelector('.slot-badge');
            if (img) img.classList.add('hidden');
            if (placeholder) placeholder.classList.remove('hidden');
            if (input) input.value = '';
            if (badge) badge.classList.add('hidden');
        });
    }
    updateGridStatus();
    showToast('Grid cleared', 'info');
}

async function handleBatchDetection() {
    const activeFiles = currentFiles.filter(f => f !== null);
    if (activeFiles.length === 0) {
        showToast('Load at least one image into the grid', 'error');
        return;
    }

    const startTime = performance.now();
    setLoading(true);

    try {
        // Convert all active files to Base64
        const b64Promises = activeFiles.map(file => fileToB64(file));
        const base64Images = await Promise.all(b64Promises);

        const payload = {
            imageData: base64Images,
            conf_threshold: el.confRange ? parseFloat(el.confRange.value) : 0.25,
            question: el.questionInput && el.questionInput.value ? el.questionInput.value.trim() : null
        };

        const response = await fetch('/detect-batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const endTime = performance.now();
        if (el.latencyText) el.latencyText.textContent = `${Math.round(endTime - startTime)}ms`;

        if (data.success) {
            renderBatchDetections(data.results);
            const totalObjects = data.results.reduce((acc, curr) => acc + curr.length, 0);

            if (data.solution && data.solution.length > 0) {
                showToast(`Batch complete: Target found in slots [${data.solution.join(', ')}] ✅`, 'success');
            } else {
                showToast(`Batch complete: ${totalObjects} total objects detected ✅`, 'success');
            }
        } else {
            const errorMsg = data.error || data.detail || 'Execution Failed';
            if (el.resultsList) el.resultsList.innerHTML = `<div class="text-red-400 p-4 font-mono text-xs">ERR: ${errorMsg}</div>`;
            showToast('Batch execution failed', 'error');
        }
    } catch (err) {
        if (el.resultsList) el.resultsList.innerHTML = `<div class="text-red-400 p-4 font-mono text-xs">BATCH_EXCEPTION: ${err.message}</div>`;
        showToast('System Exception Occurred', 'error');
    } finally {
        setLoading(false);
    }
}

function fileToB64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Strip the "data:image/jpeg;base64," prefix
            const b64 = reader.result.split(',')[1];
            resolve(b64);
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

function renderBatchDetections(results) {
    if (!el.resultsList) return;
    el.resultsList.innerHTML = '';
    let total = 0;
    let resultIdx = 0;

    currentFiles.forEach((file, slotIdx) => {
        const slot = document.querySelector(`.grid-slot[data-index="${slotIdx}"]`);
        if (!slot || file === null) return;

        const overlay = slot.querySelector('.slot-overlay');
        const img = slot.querySelector('img');
        const badge = slot.querySelector('.slot-badge');
        if (overlay) overlay.innerHTML = '';

        const detections = results[resultIdx++];
        total += detections.length;

        if (img) {
            img.style.opacity = detections.length > 0 ? '1' : '0.4';
        }

        let targetList = [];
        if (el.questionInput && el.questionInput.value) {
            targetList = el.questionInput.value.trim().toLowerCase().split(',').map(t => {
                let s = t.trim();
                if (s.startsWith('the ')) s = s.substring(4).trim();
                return s;
            }).filter(t => t.length > 0);
        }

        if (badge) {
            if (detections.length > 0) {
                if (targetList.length > 0) {
                    const matchFound = detections.some(obj => {
                        const lbl = obj.label.toLowerCase();
                        return targetList.some(t => lbl.includes(t) || t.includes(lbl));
                    });
                    if (matchFound) {
                        badge.classList.remove('hidden');
                    } else {
                        badge.classList.add('hidden');
                    }
                } else {
                    badge.classList.remove('hidden');
                }
            } else {
                badge.classList.add('hidden');
            }
        }

        detections.forEach(obj => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between p-2 bg-slate-800/40 rounded-lg border border-slate-700/50 text-[10px] uppercase font-mono';

            const lbl = obj.label.toLowerCase();
            const isMatch = targetList.length > 0 ? targetList.some(t => lbl.includes(t) || t.includes(lbl)) : true;
            const checkMark = isMatch ? ' ✅' : '';
            item.innerHTML = `
                <div class="flex items-center space-x-2">
                    <span class="text-slate-600">S${slotIdx + 1}</span>
                    <span class="text-neon font-bold">${obj.label}${checkMark}</span>
                </div>
                <span class="text-emerald-400">${(obj.confidence * 100).toFixed(0)}%</span>
            `;
            el.resultsList.appendChild(item);
        });
    });

    if (el.objectCount) el.objectCount.textContent = `${total} OBJECTS`;
}

async function handleSaveTraining() {
    const activeFiles = currentFiles.filter(f => f !== null);
    const label = el.trainLabel ? el.trainLabel.value.trim() : '';

    if (activeFiles.length === 0 || !label) {
        showToast('Need images and label', 'error');
        return;
    }

    if (el.trainBtn) {
        el.trainBtn.disabled = true;
        el.trainBtn.textContent = 'SAVING...';
    }

    let successCount = 0;
    for (const file of activeFiles) {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await fetch(`/save-training-data?label=${encodeURIComponent(label)}`, {
                method: 'POST',
                body: formData
            });
            if (response.ok) successCount++;
        } catch (e) { }
    }

    showToast(`Saved ${successCount} frames for [${label}]`, 'success');
    if (el.trainBtn) {
        el.trainBtn.disabled = false;
        el.trainBtn.textContent = 'SAVE FOR TRAINING';
    }
}

async function handleConfirmTraining() {
    if (el.modalOverlay) {
        el.modalOverlay.style.display = 'none';
        el.modalOverlay.style.visibility = 'hidden';
    }
    if (el.startTrainBtn) el.startTrainBtn.disabled = true;
    if (el.trainStatus) {
        el.trainStatus.textContent = 'Status: Initializing...';
        el.trainStatus.classList.add('text-neon');
    }

    const selectedSource = document.querySelector('input[name="dataset_source"]:checked');
    const datasetSource = selectedSource ? selectedSource.value : 'roboflow';

    try {
        const response = await fetch(`/train?dataset_type=${datasetSource}`, { method: 'POST' });
        const data = await response.json();

        if (data.success) {
            showToast('Training process sequence initiated', 'info');
            pollTrainingStatus();
        } else {
            showToast(`Launch failed: ${data.error || 'Unknown Error'}`, 'error');
            if (el.startTrainBtn) el.startTrainBtn.disabled = false;
        }
    } catch (err) {
        showToast(`Critical Error: ${err.message}`, 'error');
        if (el.startTrainBtn) el.startTrainBtn.disabled = false;
    }
}

// ─── Utilities ───────────────────────────────────────────

function setLoading(isLoading) {
    const loadingIcon = document.getElementById('loadingIcon');
    const btnText = document.getElementById('btnText');
    if (isLoading) {
        if (loadingIcon) loadingIcon.classList.remove('hidden');
        if (btnText) btnText.textContent = 'ANALYZING...';
        if (el.detectBtn) {
            el.detectBtn.disabled = true;
            el.detectBtn.classList.add('opacity-70');
        }
    } else {
        if (loadingIcon) loadingIcon.classList.add('hidden');
        if (btnText) btnText.textContent = 'EXECUTE ANALYSIS';
        if (el.detectBtn) {
            el.detectBtn.disabled = false;
            el.detectBtn.classList.remove('opacity-70');
        }
    }
}

async function pollTrainingStatus() {
    const check = async () => {
        try {
            const response = await fetch('/train/status');
            const data = await response.json();

            if (el.trainStatus) el.trainStatus.textContent = `Status: ${data.status.toUpperCase()}`;

            if (data.running) {
                wasRunning = true;
                if (el.startTrainBtn) {
                    el.startTrainBtn.disabled = true;
                    el.startTrainBtn.classList.add('opacity-50');
                }
                setTimeout(check, 3000);
            } else {
                if (el.startTrainBtn) {
                    el.startTrainBtn.disabled = false;
                    el.startTrainBtn.classList.remove('opacity-50');
                }

                if (wasRunning && data.status === 'completed') {
                    wasRunning = false;
                    showToast('Neural Network Training Complete. Deploying...', 'success');
                    try { await fetch('/reload', { method: 'POST' }); } catch (e) { }
                    setTimeout(() => { location.reload(); }, 3000);
                }
            }
        } catch (err) { console.error('Status poll error:', err); }
    };
    check();
}

async function fetchSystemInfo() {
    try {
        const response = await fetch('/info');
        const data = await response.json();
        const nameEl = document.getElementById('model-name-display');
        const deviceEl = document.getElementById('device-display');

        if (nameEl) {
            nameEl.textContent = data.model_name;
            nameEl.classList.remove('italic', 'text-slate-300');
            if (data.model_name.includes('Fallback')) nameEl.classList.add('text-orange-400');
            else nameEl.classList.add('text-neon');
        }
        if (deviceEl) deviceEl.textContent = data.device.toUpperCase();
    } catch (err) { console.error('Info fetch error:', err); }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="flex items-center space-x-3">
            <span class="w-2 h-2 rounded-full ${type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-neon'} animate-pulse"></span>
            <span>${message}</span>
        </div>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function initTimestamp() {
    setInterval(() => {
        const tsEl = document.getElementById('timestamp');
        if (tsEl) {
            const now = new Date();
            const ts = now.toISOString().replace('T', '_').split('.')[0].replace(/-/g, '.');
            tsEl.textContent = `TIMESTAMP: ${ts}`;
        }
    }, 1000);
}
