// js/components/upload.js
import { API } from '../api.js';
import { showToast, setButtonLoading } from '../ui.js';

export function renderUploadUI(area, session, mode) {
    const sessionId = session.id;

    if (mode === 'bib') {
        renderBibUpload(area, sessionId, session);
    } else if (mode === 'pdf') {
        renderPdfUpload(area, sessionId);
    }
}

function renderBibUpload(area, sessionId, session) {
    let infoHTML = '';
    if (session.status === 'P0_BIB_PARSED' && session.refs_count !== undefined) {
        infoHTML = `
            <div class="upload-progress">
                <p class="progress-text">BibTeX berhasil di-parse: <strong>${session.refs_count || 0}</strong> referensi ditemukan.</p>
                ${session.parse_errors ? `<p class="progress-text" style="color: var(--warning-color);">Parse errors: ${session.parse_errors}</p>` : ''}
            </div>
        `;
    }

    area.innerHTML = `
        <div class="approval-section">
            <h4>Upload File BibTeX (.bib)</h4>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">Upload file .bib yang berisi daftar referensi untuk proposal Anda.</p>
            <div class="dropzone" id="dropzone-bib">
                <div class="dropzone-icon">📄</div>
                <p>Klik atau seret file .bib ke sini</p>
            </div>
            <input type="file" id="input-bib-file" accept=".bib" style="display: none;">
            ${infoHTML}
        </div>
    `;

    setTimeout(() => {
        const dropzone = document.getElementById('dropzone-bib');
        const fileInput = document.getElementById('input-bib-file');

        if (!dropzone || !fileInput) return;

        dropzone.addEventListener('click', () => fileInput.click());

        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });

        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });

        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleBibUpload(files[0], sessionId);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleBibUpload(e.target.files[0], sessionId);
            }
        });
    }, 0);
}

async function handleBibUpload(file, sessionId) {
    if (!file.name.endsWith('.bib')) {
        showToast('Hanya file .bib yang diizinkan!', 'error');
        return;
    }

    const dropzone = document.getElementById('dropzone-bib');
    if (dropzone) {
        dropzone.innerHTML = `
            <div class="spinner" style="margin: 0 auto;"></div>
            <p style="margin-top: 0.5rem;">Mengupload ${file.name}...</p>
        `;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await API.uploadBib(sessionId, formData);
        showToast(`Upload berhasil! ${res.refs_count || 0} referensi ditemukan.`, 'success');
        // Force re-render by reloading status
        window.location.reload();
    } catch (e) {
        showToast('Upload gagal: ' + e.message, 'error');
        if (dropzone) {
            dropzone.innerHTML = `
                <div class="dropzone-icon">📄</div>
                <p>Klik atau seret file .bib ke sini</p>
            `;
        }
    }
}

async function renderPdfUpload(area, sessionId) {
    area.innerHTML = `
        <div class="approval-section">
            <h4>Upload PDF Referensi</h4>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">Beberapa referensi belum memiliki file PDF. Upload PDF untuk masing-masing cite key.</p>
            <div id="pdf-loading" style="text-align: center; padding: 1rem;">
                <div class="spinner" style="margin: 0 auto;"></div>
                <p style="margin-top: 0.5rem; color: var(--text-secondary);">Memuat daftar PDF yang diperlukan...</p>
            </div>
            <div id="pdf-list-container" class="hidden"></div>
        </div>
    `;

    try {
        const res = await API.getMissingPdfs(sessionId);
        const missing = res.missing || res.cite_keys || [];
        const total = res.total || missing.length;
        const uploaded = (total - missing.length);

        const loading = document.getElementById('pdf-loading');
        const container = document.getElementById('pdf-list-container');
        if (loading) loading.classList.add('hidden');
        if (container) container.classList.remove('hidden');

        if (missing.length === 0) {
            container.innerHTML = `
                <div class="upload-progress">
                    <p class="progress-text" style="color: var(--success-color);">Semua PDF sudah terupload! (${total}/${total})</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="upload-progress">
                <p class="progress-text">${uploaded} dari ${total} PDF sudah terupload. Sisa: ${missing.length} file.</p>
            </div>
            <div class="pdf-list">
        `;

        missing.forEach(key => {
            html += `
                <div class="pdf-item" id="pdf-item-${key}">
                    <span class="cite-key">${key}</span>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <input type="file" id="input-pdf-${key}" accept=".pdf" style="display: none;">
                        <button class="btn btn-primary btn-upload-pdf" data-key="${key}">Upload PDF</button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Attach upload handlers
        setTimeout(() => {
            container.querySelectorAll('.btn-upload-pdf').forEach(btn => {
                btn.addEventListener('click', () => {
                    const key = btn.dataset.key;
                    const input = document.getElementById(`input-pdf-${key}`);
                    if (input) input.click();
                });
            });

            missing.forEach(key => {
                const input = document.getElementById(`input-pdf-${key}`);
                if (input) {
                    input.addEventListener('change', (e) => {
                        if (e.target.files.length > 0) {
                            handlePdfUpload(e.target.files[0], sessionId, key);
                        }
                    });
                }
            });
        }, 0);

    } catch (e) {
        const loading = document.getElementById('pdf-loading');
        if (loading) {
            loading.innerHTML = `<p style="color: var(--danger-color);">Gagal memuat daftar: ${e.message}</p>`;
        }
    }
}

async function handlePdfUpload(file, sessionId, citeKey) {
    if (!file.name.endsWith('.pdf')) {
        showToast('Hanya file PDF yang diizinkan!', 'error');
        return;
    }

    const item = document.getElementById(`pdf-item-${citeKey}`);
    const btn = item ? item.querySelector('.btn-upload-pdf') : null;

    if (btn) {
        setButtonLoading(btn, true);
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('cite_key', citeKey);

    try {
        await API.uploadPdf(sessionId, formData);
        showToast(`PDF untuk "${citeKey}" berhasil diupload!`, 'success');
        if (item) {
            item.innerHTML = `
                <span class="cite-key">${citeKey}</span>
                <span style="color: var(--success-color); font-weight: 500;">Uploaded</span>
            `;
        }
    } catch (e) {
        showToast(`Upload gagal untuk "${citeKey}": ${e.message}`, 'error');
        if (btn) {
            setButtonLoading(btn, false, 'Upload PDF');
        }
    }
}
