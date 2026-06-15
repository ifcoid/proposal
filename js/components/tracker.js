// js/components/tracker.js
import { API } from '../api.js';
import { showToast, toggleHidden, setButtonLoading } from '../ui.js';
import { renderUploadUI } from './upload.js';

let pollingInterval = null;
let currentSessionId = null;
let lastRenderedStatus = null;

// Pipeline phases and their statuses
const PIPELINE = [
    'P0_INIT', 'P0_BIB_PARSED', 'P0_WAITING_PDFS', 'P0_PDFS_UPLOADED',
    'P0_WAITING_EMBED_SERVER', 'P0_EMBED_SERVER_READY', 'P0_WAITING_INGEST',
    'P0_VECTORS_READY', 'P0_KG_BUILD', 'P0_DONE',
    'P1_INIT', 'P1_DRAFT', 'P1_GRADING', 'P1_WAITING_APPROVAL',
    'P2_INIT', 'P2_GAP_ANALYSIS', 'P2_DRAFT', 'P2_GRADING', 'P2_WAITING_APPROVAL',
    'P3_INIT', 'P3_HYPOTHESIS', 'P3_METHOD_DESIGN', 'P3_GRADING', 'P3_WAITING_APPROVAL',
    'P4_INIT', 'P4_NOVELTY_CHECK', 'P4_ROADMAP', 'P4_GRADING', 'P4_WAITING_APPROVAL',
    'P5_INIT', 'P5_TAXONOMY', 'P5_NARRATIVE', 'P5_GRADING', 'P5_WAITING_APPROVAL',
    'P6_INIT', 'P6_TIMELINE', 'P6_RESOURCES', 'P6_GRADING', 'P6_WAITING_APPROVAL',
    'P7_INIT', 'P7_COMPILE', 'P7_FINAL_CHECK', 'P7_DONE'
];

function getPhaseNumber(status) {
    if (!status) return -1;
    const match = status.match(/^P(\d)/);
    return match ? parseInt(match[1]) : -1;
}

function getProgressPercent(status) {
    const idx = PIPELINE.indexOf(status);
    if (idx === -1) return 0;
    return Math.round((idx / (PIPELINE.length - 1)) * 100);
}

function getStatusType(status) {
    if (!status) return 'processing';
    if (status.includes('ERROR')) return 'error';
    if (status.includes('WAITING')) return 'waiting';
    if (status.includes('DONE') || status.includes('APPROVED')) return 'done';
    return 'processing';
}

function updateProgressBar(status) {
    const currentPhase = getPhaseNumber(status);
    const fill = document.getElementById('progress-fill');
    if (fill) {
        fill.style.width = getProgressPercent(status) + '%';
    }

    // Update phase items
    document.querySelectorAll('.phase-item').forEach(el => {
        const phase = parseInt(el.dataset.phase.replace('P', ''));
        el.classList.remove('active', 'done');
        if (phase < currentPhase) {
            el.classList.add('done');
        } else if (phase === currentPhase) {
            el.classList.add('active');
        }
    });
}

function updateStatusIndicator(status) {
    const indicator = document.querySelector('.status-indicator');
    const badge = document.getElementById('status-badge');
    if (!indicator || !badge) return;

    const type = getStatusType(status);
    indicator.className = 'status-indicator ' + type;

    badge.className = 'status-badge ' + type;
    switch (type) {
        case 'processing':
            badge.textContent = 'Sedang Proses';
            break;
        case 'waiting':
            badge.textContent = 'Menunggu Input';
            break;
        case 'done':
            badge.textContent = 'Selesai';
            break;
        case 'error':
            badge.textContent = 'Error';
            break;
    }
}

export function startTracking(sessionId) {
    currentSessionId = sessionId;
    lastRenderedStatus = null;
    document.getElementById('display-session-id').textContent = sessionId;

    // Initial fetch
    fetchSessionStatus();

    // Start polling every 5 seconds
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(fetchSessionStatus, 5000);

    const btnRefresh = document.getElementById('btn-refresh');
    if (btnRefresh) {
        const newBtn = btnRefresh.cloneNode(true);
        btnRefresh.parentNode.replaceChild(newBtn, btnRefresh);
        newBtn.addEventListener('click', fetchSessionStatus);
    }

    const btnExitSession = document.getElementById('btn-exit-session');
    if (btnExitSession) {
        const newBtn = btnExitSession.cloneNode(true);
        btnExitSession.parentNode.replaceChild(newBtn, btnExitSession);
        newBtn.addEventListener('click', () => {
            if (confirm("Yakin ingin keluar dari pemantauan sesi ini?")) {
                localStorage.removeItem('activeSessionId');
                stopTracking();
                toggleHidden('section-tracker', false);
                toggleHidden('section-new-session', true);
            }
        });
    }
}

export function stopTracking() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    lastRenderedStatus = null;
}

async function fetchSessionStatus() {
    if (!currentSessionId) return;

    const displayStatus = document.getElementById('display-status');
    const spinner = document.getElementById('status-spinner');

    try {
        const session = await API.getSession(currentSessionId);
        const status = session.status || 'UNKNOWN';
        displayStatus.textContent = status;

        // Update progress bar and badge
        updateProgressBar(status);
        updateStatusIndicator(status);

        // Prevent re-rendering if status same
        if (status === lastRenderedStatus) return;
        lastRenderedStatus = status;

        const type = getStatusType(status);

        if (type === 'processing') {
            toggleHidden('status-spinner', true);
        } else {
            toggleHidden('status-spinner', false);
        }

        // Render interactive area based on status
        renderInteractiveArea(session);

    } catch (error) {
        console.error('Failed to poll status:', error);
    }
}

function renderInteractiveArea(session) {
    const area = document.getElementById('interactive-area');
    const status = session.status || '';

    // P0 Upload states
    if (status === 'P0_INIT' || status === 'P0_BIB_PARSED') {
        renderUploadUI(area, session, 'bib');
        return;
    }

    if (status === 'P0_WAITING_PDFS') {
        renderUploadUI(area, session, 'pdf');
        return;
    }

    if (status === 'P0_WAITING_EMBED_SERVER') {
        renderEmbedServerUI(area, session);
        return;
    }

    if (status === 'P0_WAITING_INGEST') {
        renderIngestUI(area, session);
        return;
    }

    // P1-P6 Approval states
    if (status.includes('WAITING_APPROVAL')) {
        renderApprovalUI(area, session);
        return;
    }

    // P7_DONE - Final
    if (status === 'P7_DONE') {
        area.innerHTML = `
            <div class="approval-section" style="border-left: 4px solid var(--success-color);">
                <h4 style="color: var(--success-color);">Pipeline Selesai!</h4>
                <p style="color: var(--text-secondary);">Semua tahapan proposal telah berhasil diselesaikan. Dokumen proposal final Anda siap.</p>
            </div>
        `;
        stopTracking();
        return;
    }

    // Error states
    if (status.includes('ERROR')) {
        area.innerHTML = `
            <div class="approval-section" style="border-left: 4px solid var(--danger-color);">
                <h4 style="color: var(--danger-color);">Terjadi Kesalahan</h4>
                <p style="color: var(--text-secondary);">${session.system_error || 'Silakan cek log untuk detail error.'}</p>
                <div class="approval-actions">
                    <button id="btn-retry" class="btn btn-primary">Coba Lagi</button>
                </div>
            </div>
        `;
        setTimeout(() => {
            const btnRetry = document.getElementById('btn-retry');
            if (btnRetry) {
                btnRetry.addEventListener('click', async () => {
                    setButtonLoading(btnRetry, true);
                    try {
                        await API.resumeSession(currentSessionId);
                        showToast('Mencoba ulang...');
                        lastRenderedStatus = null;
                        fetchSessionStatus();
                    } catch (e) {
                        showToast(e.message, 'error');
                        setButtonLoading(btnRetry, false, 'Coba Lagi');
                    }
                });
            }
        }, 0);
        return;
    }

    // Default: processing state
    area.innerHTML = `
        <div class="approval-section">
            <h4>Agen Sedang Bekerja...</h4>
            <p style="color: var(--text-secondary);">Pipeline sedang memproses tahap <strong>${status}</strong>. Halaman akan otomatis memperbarui status.</p>
        </div>
    `;
}

function renderEmbedServerUI(area, session) {
    area.innerHTML = `
        <div class="colab-info">
            <h4>Jalankan Embedding Server di Google Colab:</h4>
            <p><a href="https://colab.research.google.com/github/ifcoid/pede/blob/main/notebooks/embed_server_colab.ipynb" target="_blank">
                Buka Notebook Embedding Server
            </a></p>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">
                Jalankan semua cell di Colab, lalu salin URL tunnel yang muncul di output.
            </p>
        </div>
        <div class="form-group">
            <label for="input-embed-url">URL Tunnel Embedding Server</label>
            <input type="url" id="input-embed-url" placeholder="https://xxxxx.ngrok-free.app">
        </div>
        <button id="btn-set-endpoint" class="btn btn-primary">Set Endpoint</button>
    `;

    setTimeout(() => {
        const btn = document.getElementById('btn-set-endpoint');
        if (btn) {
            btn.addEventListener('click', async () => {
                const url = document.getElementById('input-embed-url').value.trim();
                if (!url) {
                    showToast('URL endpoint tidak boleh kosong!', 'error');
                    return;
                }
                setButtonLoading(btn, true);
                try {
                    await API.setEmbedEndpoint(currentSessionId, url);
                    showToast('Endpoint berhasil disimpan!', 'success');
                    lastRenderedStatus = null;
                    fetchSessionStatus();
                } catch (e) {
                    showToast(e.message, 'error');
                    setButtonLoading(btn, false, 'Set Endpoint');
                }
            });
        }
    }, 0);
}

function renderIngestUI(area, session) {
    area.innerHTML = `
        <div class="colab-info">
            <h4>Jalankan Ingest di Google Colab:</h4>
            <p><a href="https://colab.research.google.com/github/ifcoid/pede/blob/main/notebooks/pede_colab.ipynb" target="_blank">
                Buka Notebook Ingest
            </a></p>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.5rem;">
                Jalankan semua cell untuk memproses ingest vektor dokumen.
            </p>
        </div>
        <div class="approval-section">
            <h4>Session ID Anda:</h4>
            <div class="copyable" id="copy-session-id" title="Klik untuk menyalin">${currentSessionId}</div>
            <div class="approval-actions" style="margin-top: 1.5rem;">
                <button id="btn-check-ingest" class="btn btn-primary">Cek Status Ingest</button>
            </div>
        </div>
    `;

    setTimeout(() => {
        const copyEl = document.getElementById('copy-session-id');
        if (copyEl) {
            copyEl.addEventListener('click', () => {
                navigator.clipboard.writeText(currentSessionId).then(() => {
                    showToast('Session ID disalin!', 'success');
                }).catch(() => {
                    showToast('Gagal menyalin, salin manual: ' + currentSessionId, 'error');
                });
            });
        }

        const btn = document.getElementById('btn-check-ingest');
        if (btn) {
            btn.addEventListener('click', async () => {
                setButtonLoading(btn, true);
                try {
                    await API.resumeSession(currentSessionId);
                    showToast('Mengecek status ingest...', 'success');
                    lastRenderedStatus = null;
                    fetchSessionStatus();
                } catch (e) {
                    showToast(e.message, 'error');
                    setButtonLoading(btn, false, 'Cek Status Ingest');
                }
            });
        }
    }, 0);
}

function renderApprovalUI(area, session) {
    const status = session.status || '';
    // Determine phase label
    const phaseMatch = status.match(/^(P\d)/);
    const phaseLabel = phaseMatch ? phaseMatch[1] : '';

    // Render output if available (from session data)
    let outputHTML = '';
    if (session.output) {
        if (typeof marked !== 'undefined' && marked.parse) {
            outputHTML = `<div class="markdown-content">${marked.parse(session.output)}</div>`;
        } else {
            outputHTML = `<div style="white-space: pre-wrap; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; max-height: 400px; overflow-y: auto;">${session.output}</div>`;
        }
    } else if (session.draft) {
        if (typeof marked !== 'undefined' && marked.parse) {
            outputHTML = `<div class="markdown-content">${marked.parse(session.draft)}</div>`;
        } else {
            outputHTML = `<div style="white-space: pre-wrap; color: var(--text-secondary); background: rgba(0,0,0,0.2); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; max-height: 400px; overflow-y: auto;">${session.draft}</div>`;
        }
    }

    area.innerHTML = `
        <div class="approval-section">
            <h4>Menunggu Persetujuan - Tahap ${phaseLabel}</h4>
            ${outputHTML}
            <div class="approval-actions">
                <button id="btn-approve" class="btn btn-success">Setuju</button>
                <button id="btn-revise-toggle" class="btn btn-warning">Revisi</button>
            </div>
            <div id="revise-form" class="hidden" style="margin-top: 1rem;">
                <div class="form-group">
                    <label for="input-feedback">Feedback / Instruksi Revisi</label>
                    <textarea id="input-feedback" rows="3" placeholder="Tulis feedback untuk revisi di sini..."></textarea>
                </div>
                <button id="btn-send-revise" class="btn btn-danger">Kirim Revisi</button>
            </div>
        </div>
    `;

    setTimeout(() => {
        const btnApprove = document.getElementById('btn-approve');
        const btnReviseToggle = document.getElementById('btn-revise-toggle');
        const btnSendRevise = document.getElementById('btn-send-revise');
        const reviseForm = document.getElementById('revise-form');

        if (btnApprove) {
            btnApprove.addEventListener('click', async () => {
                setButtonLoading(btnApprove, true);
                try {
                    // Approve: set status to Px_APPROVED
                    const approvedStatus = status.replace('WAITING_APPROVAL', 'APPROVED');
                    await API.updateSession(currentSessionId, { status: approvedStatus });
                    showToast('Disetujui! Pipeline melanjutkan.', 'success');
                    lastRenderedStatus = null;
                    fetchSessionStatus();
                } catch (e) {
                    showToast(e.message, 'error');
                    setButtonLoading(btnApprove, false, 'Setuju');
                }
            });
        }

        if (btnReviseToggle) {
            btnReviseToggle.addEventListener('click', () => {
                reviseForm.classList.toggle('hidden');
            });
        }

        if (btnSendRevise) {
            btnSendRevise.addEventListener('click', async () => {
                const feedback = document.getElementById('input-feedback').value.trim();
                if (!feedback) {
                    showToast('Feedback tidak boleh kosong!', 'error');
                    return;
                }
                setButtonLoading(btnSendRevise, true);
                try {
                    const revisionStatus = status.replace('WAITING_APPROVAL', 'NEEDS_REVISION');
                    await API.updateSession(currentSessionId, { status: revisionStatus, feedback });
                    showToast('Revisi dikirim! Agen mengulang tahap ini.', 'success');
                    lastRenderedStatus = null;
                    fetchSessionStatus();
                } catch (e) {
                    showToast(e.message, 'error');
                    setButtonLoading(btnSendRevise, false, 'Kirim Revisi');
                }
            });
        }
    }, 0);
}
