// js/components/refs.js
import { API } from '../api.js';
import { showToast, toggleHidden } from '../ui.js';

let allRefs = [];
let currentFilter = 'all';

export function initRefs() {
    const btnRefs = document.getElementById('btn-refs');
    const btnBack = document.getElementById('btn-back-refs');

    if (btnRefs) {
        btnRefs.addEventListener('click', () => {
            toggleHidden('section-tracker', false);
            toggleHidden('section-new-session', false);
            toggleHidden('section-refs', true);
            loadRefs();
        });
    }

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            toggleHidden('section-refs', false);
            const activeSession = localStorage.getItem('activeSessionId');
            if (activeSession) {
                toggleHidden('section-tracker', true);
            } else {
                toggleHidden('section-new-session', true);
            }
        });
    }

    // Filter buttons
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTable();
        });
    });
}

async function loadRefs() {
    const sessionId = localStorage.getItem('activeSessionId');
    if (!sessionId) {
        showToast('Tidak ada sesi aktif untuk melihat referensi.', 'error');
        return;
    }

    const container = document.getElementById('refs-table-container');
    container.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div class="spinner" style="margin: 0 auto;"></div>
            <p style="margin-top: 0.5rem; color: var(--text-secondary);">Memuat daftar referensi...</p>
        </div>
    `;

    try {
        const res = await API.getRefs(sessionId);
        allRefs = res.refs || res.references || [];
        renderTable();
    } catch (e) {
        container.innerHTML = `<p style="color: var(--danger-color); text-align: center; padding: 1rem;">Gagal memuat referensi: ${e.message}</p>`;
    }
}

function renderTable() {
    const container = document.getElementById('refs-table-container');
    let filtered = allRefs;

    if (currentFilter === 'missing') {
        filtered = allRefs.filter(r => !r.has_pdf && !r.pdf_uploaded);
    } else if (currentFilter === 'embedded') {
        filtered = allRefs.filter(r => r.embedded || r.is_embedded);
    }

    if (filtered.length === 0) {
        container.innerHTML = `<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">Tidak ada referensi yang cocok dengan filter.</p>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Cite Key</th>
                    <th>Judul</th>
                    <th>Penulis</th>
                    <th>Tahun</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtered.forEach(ref => {
        const embedded = ref.embedded || ref.is_embedded;
        const hasPdf = ref.has_pdf || ref.pdf_uploaded;
        let statusHTML = '';

        if (embedded) {
            statusHTML = '<span style="color: var(--success-color); font-weight: 500;">Embedded</span>';
        } else if (hasPdf) {
            statusHTML = '<span style="color: var(--primary-color); font-weight: 500;">PDF Ready</span>';
        } else {
            statusHTML = '<span style="color: var(--warning-color); font-weight: 500;">Missing PDF</span>';
        }

        html += `
            <tr>
                <td style="font-family: monospace; font-size: 0.85rem;">${ref.cite_key || ref.key || '-'}</td>
                <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ref.title || ''}">${ref.title || '-'}</td>
                <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ref.authors || ref.author || ''}">${ref.authors || ref.author || '-'}</td>
                <td>${ref.year || '-'}</td>
                <td>${statusHTML}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}
