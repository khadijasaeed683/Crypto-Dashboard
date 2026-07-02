import { CONFIG } from './config.js';

/**
 * Handles REST CRUD operations with built-in try/catch and error throwing.
 */
export class PortfolioAPI {
    static async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${CONFIG.REST_API_BASE}${endpoint}`, {
                ...options,
                headers: { 'Content-Type': 'application/json', ...options.headers }
            });
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('API Request Failed:', error);
            throw error; // Propagate to UI layer for user feedback
        }
    }

    static getAssets() { return this.request(''); }
    static addAsset(data) { return this.request('', { method: 'POST', body: JSON.stringify(data) }); }
    static deleteAsset(id) { return this.request(`/${id}`, { method: 'DELETE' }); }
}