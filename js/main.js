import { CONFIG } from './config.js';
import { Storage } from './storage.js';
import { UI } from './ui.js';
import { PortfolioAPI } from './api.js';
import { BinanceSocket } from './websocket.js';
import { AuthManager } from './auth.js';

class Application {
    constructor() {
        this.socket = null;
        this.portfolioData = []; 
        this.filteredData = [];  
        this.searchQuery = '';   
        this.currentPage = 1;
        
        this.activeSymbol = CONFIG.SYMBOLS[0].toLowerCase(); 
        this.priceHistory = {}; 
        this.latestData = {};    
        this.MAX_HISTORY = 40;   
        
        CONFIG.SYMBOLS.forEach(sym => {
            const symLower = sym.toLowerCase();
            this.priceHistory[symLower] = [];
            this.latestData[symLower] = null;
        });
        
        this.init();
    }

    init() {
        UI.buildWatchlist(CONFIG.SYMBOLS, this.activeSymbol, (clickedSymbol) => this.setActiveSymbol(clickedSymbol));
        this.bindEvents();
        UI.initTheme(Storage.getTheme());

        this.authManager = new AuthManager((user) => {
            if (typeof UI.setUserIdentity === 'function') {
                UI.setUserIdentity(user);
            }
            this.startServices();
        });

        this.authManager.checkAuthStatus();
    }

    bindEvents() {
        // --- Theme Controls ---
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const newTheme = UI.toggleTheme(Storage.getTheme());
            Storage.setTheme(newTheme);
            this.refreshCharts();
        });

        // --- Portfolio Controls ---
        document.getElementById('prev-page').addEventListener('click', () => this.changePage('prev'));
        document.getElementById('next-page').addEventListener('click', () => this.changePage('next'));
        document.getElementById('portfolio-form').addEventListener('submit', (e) => this.handleAddAsset(e));
        
        // --- Responsive Window Resize ---
        // Triggered when user changes screen size, forcing charts to re-calculate dimensions
        window.addEventListener('resize', UI.debounce(() => this.refreshCharts(), 250));

        // --- Hybrid Search Implementation ---
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');

        const executeSearch = (query) => {
            this.searchQuery = query.toLowerCase().trim();
            this.applyFilterAndRender();
        };

        if (searchInput) {
            searchInput.addEventListener('input', UI.debounce((e) => executeSearch(e.target.value), 300));
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault(); 
                executeSearch(searchInput.value);
            });
        }
    }

    // Helper to refresh charts based on current state
    refreshCharts() {
        if (this.portfolioData.length > 0 && typeof UI.drawAllocationChart === 'function') {
            UI.drawAllocationChart(this.portfolioData);
        }
        const cachedData = this.latestData[this.activeSymbol];
        if (cachedData) {
            UI.drawMainChart(this.activeSymbol, this.priceHistory[this.activeSymbol], cachedData.changePercent);
        }
    }

    applyFilterAndRender() {
        if (!this.searchQuery) {
            this.filteredData = [...this.portfolioData];
        } else {
            this.filteredData = this.portfolioData.filter(asset => {
                const name = (asset.assetName || asset.name || '').toLowerCase();
                return name.includes(this.searchQuery);
            });
        }
        
        this.currentPage = 1; 
        this.renderPortfolio();
    }

    startServices() {
        if (this.socket) return;

        this.socket = new BinanceSocket(CONFIG.SYMBOLS, (data) => {
            const symLower = data.symbol.toLowerCase();
            
            this.latestData[symLower] = data;
            this.priceHistory[symLower].push(data.price);
            if (this.priceHistory[symLower].length > this.MAX_HISTORY) {
                this.priceHistory[symLower].shift(); 
            }

            UI.updateTickerRow(data);
            UI.drawSparkline(symLower, this.priceHistory[symLower], data.changePercent);
            
            if (symLower === this.activeSymbol) {
                UI.updateMainHeader(data);
                UI.drawMainChart(symLower, this.priceHistory[symLower], data.changePercent);
            }
        });
        
        this.socket.connect();
        this.loadPortfolio();
    }

    setActiveSymbol(symbol) {
        document.getElementById(`watchlist-item-${this.activeSymbol}`).classList.remove('active');
        this.activeSymbol = symbol;
        document.getElementById(`watchlist-item-${this.activeSymbol}`).classList.add('active');
        
        const cachedData = this.latestData[symbol];
        if (cachedData) {
            UI.updateMainHeader(cachedData);
            UI.drawMainChart(symbol, this.priceHistory[symbol], cachedData.changePercent);
        }
    }

    async loadPortfolio() {
        try {
            this.portfolioData = await PortfolioAPI.getAssets();
            this.applyFilterAndRender();
        } catch (error) {
            const list = document.getElementById('portfolio-list');
            list.innerHTML = '<li>Error loading portfolio. Please check API endpoint.</li>';
            if (typeof UI.drawAllocationChart === 'function') {
                UI.drawAllocationChart(this.portfolioData);
            }
        }
    }

    async handleAddAsset(e) {
        e.preventDefault(); 
        const nameInput = document.getElementById('asset-name');
        const amountInput = document.getElementById('asset-amount');
        const name = nameInput.value.trim().toUpperCase();
        const amount = parseFloat(amountInput.value);

        if (!name || isNaN(amount) || amount <= 0) return;

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        try {
            const payload = { name: name, amount: amount };
            const newAsset = await PortfolioAPI.addAsset(payload);
            this.portfolioData.push(newAsset);
            this.applyFilterAndRender();
            e.target.reset();
            nameInput.focus(); 
        } catch (error) {
            console.error("Add Asset Error:", error);
            alert("Failed to add asset.");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg> Add Asset
            `;
        }
    }

    async deletePortfolioAsset(id) {
        if (!confirm("Are you sure you want to remove this asset?")) return;
        try {
            await PortfolioAPI.deleteAsset(id);
            this.portfolioData = this.portfolioData.filter(asset => asset.id !== id);
            this.applyFilterAndRender();
        } catch (error) {
            console.error("Delete Asset Error:", error);
        }
    }

    renderPortfolio() {
        const list = document.getElementById('portfolio-list');
        list.innerHTML = ''; 

        if (!this.filteredData || this.filteredData.length === 0) {
            const emptyState = document.createElement('li');
            emptyState.className = 'portfolio-item empty-state';
            emptyState.textContent = this.searchQuery ? 'No matching assets found.' : 'No assets found.';
            list.appendChild(emptyState);
            this.updatePaginationState();
            if (typeof UI.drawAllocationChart === 'function') UI.drawAllocationChart(this.portfolioData);
            return;
        }

        const startIndex = (this.currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
        const endIndex = startIndex + CONFIG.ITEMS_PER_PAGE;
        const paginatedData = this.filteredData.slice(startIndex, endIndex);
        const fragment = document.createDocumentFragment();
        paginatedData.forEach(asset => {
            const li = document.createElement('li');
            li.className = 'portfolio-item';
            li.innerHTML = `<span>${asset.assetName || asset.name || 'Unknown'} (Qty: ${asset.amount || asset.quantity || 0})</span>`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Remove';
            deleteBtn.className = 'danger-btn';
            deleteBtn.addEventListener('click', () => this.deletePortfolioAsset(asset.id));
            
            li.appendChild(deleteBtn);
            fragment.appendChild(li);
        });

        list.appendChild(fragment);
        this.updatePaginationState();
        if (typeof UI.drawAllocationChart === 'function') UI.drawAllocationChart(this.portfolioData);
    }

    updatePaginationState() {
        const totalPages = Math.ceil(this.filteredData.length / CONFIG.ITEMS_PER_PAGE) || 1;
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');

        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= totalPages;
        pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredData.length / CONFIG.ITEMS_PER_PAGE) || 1;
        if (direction === 'next' && this.currentPage < totalPages) this.currentPage++;
        else if (direction === 'prev' && this.currentPage > 1) this.currentPage--;
        this.renderPortfolio();
    }
}
document.addEventListener('DOMContentLoaded', () => {
    new Application();
});