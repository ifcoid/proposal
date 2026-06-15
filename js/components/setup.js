// js/components/setup.js
import { getBaseURL, setBaseURL } from '../api.js';
import { openModal, closeModal, showToast } from '../ui.js';

export function initSetup() {
    const btnSettings = document.getElementById('btn-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const inputBaseUrl = document.getElementById('input-base-url');

    // Load initial Base URL to input
    if (inputBaseUrl) {
        inputBaseUrl.value = getBaseURL();
        inputBaseUrl.addEventListener('change', (e) => {
            setBaseURL(e.target.value);
            showToast('Base URL API berhasil diperbarui!');

            if (btnSettings) {
                btnSettings.style.color = '#10b981';
                btnSettings.innerHTML = '⚙️ Configured';
            }
        });
    }

    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            openModal('modal-settings');
        });
    }

    if (btnCloseSettings) {
        btnCloseSettings.addEventListener('click', () => closeModal('modal-settings'));
    }
}
