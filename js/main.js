// js/main.js
import { initSetup } from './components/setup.js';
import { initAuth } from './components/auth.js';
import { initSession } from './components/session.js';
import { startTracking } from './components/tracker.js';
import { initRefs } from './components/refs.js';
import { toggleHidden, openModal } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // 0. Init Auth
    initAuth();

    // 1. Initialize API Base URL Setup
    initSetup();

    // 2. Initialize Refs
    initRefs();

    const btnSettings = document.getElementById('btn-settings');
    if (!localStorage.getItem('apiBaseURL')) {
        console.warn('apiBaseURL tidak ditemukan di localStorage. Membuka modal pengaturan otomatis.');
        openModal('modal-settings');
        if (btnSettings) {
            btnSettings.style.color = '#ef4444';
            btnSettings.innerHTML = '⚠️ Set API URL!';
        }
    } else {
        if (btnSettings) {
            btnSettings.style.color = '#10b981';
            btnSettings.innerHTML = '⚙️ Configured';
        }
    }

    if (!localStorage.getItem('auth_token')) {
        return; // Stop if not logged in
    }

    // 3. Check for active session
    const activeSessionId = localStorage.getItem('activeSessionId');
    if (activeSessionId) {
        toggleHidden('section-new-session', false);
        toggleHidden('section-tracker', true);
        startTracking(activeSessionId);
    }

    // 4. Initialize Session Creation
    initSession((sessionId) => {
        toggleHidden('section-new-session', false);
        toggleHidden('section-tracker', true);
        localStorage.setItem('activeSessionId', sessionId);
        startTracking(sessionId);
    });

    // 5. Header scroll effect
    const mainHeader = document.querySelector('.main-header');
    if (mainHeader) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                mainHeader.classList.add('scrolled');
            } else {
                mainHeader.classList.remove('scrolled');
            }
        });
    }

    console.log('Proposal Agent - Frontend Initialized');
});
