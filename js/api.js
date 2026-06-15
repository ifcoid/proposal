// js/api.js

// Default Base URL
let baseURL = localStorage.getItem('apiBaseURL') || 'http://localhost:50607/api';

export function getBaseURL() {
    return baseURL;
}

export function setBaseURL(url) {
    baseURL = url;
    localStorage.setItem('apiBaseURL', url);
}

// Universal fetch wrapper
async function apiFetch(endpoint, options = {}) {
    try {
        const isFormData = options.body instanceof FormData;
        const headers = isFormData
            ? { ...(options.headers || {}) }
            : { 'Content-Type': 'application/json', ...(options.headers || {}) };

        if (headers['Content-Type'] === null || headers['Content-Type'] === undefined) {
            delete headers['Content-Type'];
        }

        const token = localStorage.getItem('auth_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${baseURL}${endpoint}`, {
            ...options,
            headers,
            body: options.body
        });

        if (response.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            window.location.reload();
            throw new Error('Sesi berakhir atau tidak valid. Silakan login kembali.');
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.error || `HTTP Error ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
}

export const API = {
    // Auth API
    login: (username, password) => apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    }),
    register: (username, password, inviteCode) => apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, invite_code: inviteCode })
    }),

    // Proposal Session API
    createSession: (id, topic, userId) => apiFetch('/proposal/sessions', {
        method: 'POST',
        body: JSON.stringify({ id, topic, user_id: userId })
    }),

    getSession: (id) => apiFetch(`/proposal/sessions/${id}`),

    updateSession: (id, payload = {}) => apiFetch(`/proposal/sessions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
    }),

    resumeSession: (id) => apiFetch(`/proposal/sessions/${id}/resume`, {
        method: 'POST'
    }),

    // Upload
    uploadBib: (id, formData) => apiFetch(`/proposal/sessions/${id}/upload-bib`, {
        method: 'POST',
        body: formData
    }),

    uploadPdf: (id, formData) => apiFetch(`/proposal/sessions/${id}/upload-pdf`, {
        method: 'POST',
        body: formData
    }),

    // Embed endpoint
    setEmbedEndpoint: (id, endpoint) => apiFetch(`/proposal/sessions/${id}/embed-endpoint`, {
        method: 'PUT',
        body: JSON.stringify({ endpoint })
    }),

    // References
    getRefs: (id) => apiFetch(`/proposal/sessions/${id}/refs`),

    getMissingPdfs: (id) => apiFetch(`/proposal/sessions/${id}/refs/missing-pdfs`)
};
