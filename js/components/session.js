// js/components/session.js
import { API } from '../api.js';
import { showToast, setButtonLoading, toggleHidden } from '../ui.js';

export function initSession(onSessionCreated) {
    const formNewSession = document.getElementById('form-new-session');

    if (formNewSession) {
        formNewSession.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('input-session-id').value.trim();
            const topic = document.getElementById('input-topic').value.trim();
            const btn = e.target.querySelector('button[type="submit"]');

            if (!id || !topic) {
                showToast('ID dan Topik wajib diisi!', 'error');
                return;
            }

            // Validate no spaces in ID
            if (/\s/.test(id)) {
                showToast('ID Sesi tidak boleh mengandung spasi!', 'error');
                return;
            }

            // Get user_id from stored user data
            let userId = '';
            try {
                const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
                userId = userData.id || userData.username || '';
            } catch (err) {
                // ignore
            }

            setButtonLoading(btn, true);
            try {
                await API.createSession(id, topic, userId);
                showToast(`Sesi "${id}" berhasil dibuat! Pipeline dimulai.`);

                toggleHidden('section-new-session', false);
                toggleHidden('section-tracker', true);

                if (onSessionCreated) onSessionCreated(id);

            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                setButtonLoading(btn, false, 'Mulai Pipeline Proposal');
            }
        });
    }
}
