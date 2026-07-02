const sizeCanvasToParent = (canvas, fallbackWidth, fallbackHeight, options = {}) => {
    const parent = canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || fallbackWidth));
    const measuredHeight = Math.max(1, Math.round(rect.height || fallbackHeight));
    const height = options.maxHeight ? Math.min(measuredHeight, options.maxHeight) : measuredHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { ctx, width, height };
};

export const UI = {
    initTheme: (theme) => document.documentElement.setAttribute('data-theme', theme),
    
    toggleTheme: (currentTheme) => {
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        return newTheme;
    },

    // 1. Build the Watchlist DOM
    buildWatchlist: (symbols, activeSymbol, onClickCallback) => {
        const container = document.getElementById('watchlist-container');
        container.innerHTML = ''; 
        const fragment = document.createDocumentFragment();

        symbols.forEach(symbol => {
            const symLower = symbol.toLowerCase();
            const li = document.createElement('li');
            li.className = `watchlist-item ${symLower === activeSymbol ? 'active' : ''}`;
            li.id = `watchlist-item-${symLower}`;
            
            li.innerHTML = `
                <span class="symbol-name">${symbol.toUpperCase()}</span>
                <span class="data-col" id="price-${symLower}">Loading...</span>
                <span class="data-col" id="change-${symLower}">---</span>
                <span class="data-col" id="vol-${symLower}">---</span>
                <canvas id="sparkline-${symLower}" class="sparkline-canvas" width="120" height="35"></canvas>
            `;

            li.addEventListener('click', () => onClickCallback(symLower));
            fragment.appendChild(li);
        });

        container.appendChild(fragment);
    },

    // 2. Update the text prices
    updateTickerRow: (data) => {
        const symbolLower = data.symbol.toLowerCase();
        const priceEl = document.getElementById(`price-${symbolLower}`);
        const changeEl = document.getElementById(`change-${symbolLower}`);
        const volEl = document.getElementById(`vol-${symbolLower}`);
        
        if (priceEl && changeEl && volEl) {
            priceEl.textContent = `$${data.price.toFixed(2)}`;
            const changeStr = `${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`;
            changeEl.textContent = changeStr;
            changeEl.className = data.changePercent > 0 ? 'data-col price-up' : 
                                 data.changePercent < 0 ? 'data-col price-down' : 'data-col price-neutral';
            volEl.textContent = data.volume.toFixed(2);
        }
    },

    // 3. Draw the Sparkline
    drawSparkline: (symbol, historyArray, changePercent) => {
        const canvas = document.getElementById(`sparkline-${symbol.toLowerCase()}`);
        if (!canvas || historyArray.length < 2) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);
        const max = Math.max(...historyArray);
        const min = Math.min(...historyArray);
        const range = max - min || 1;

        ctx.strokeStyle = changePercent >= 0 ? '#03dac6' : '#cf6679'; 
        ctx.lineWidth = 2;
        ctx.beginPath();
        historyArray.forEach((val, index) => {
            const x = (index / (historyArray.length - 1)) * width;
            const y = height - ((val - min) / range) * height;
            index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    },

    // 4. Update Header
    updateMainHeader: (data) => {
        const title = document.getElementById('active-chart-title');
        const change = document.getElementById('active-chart-change');
        title.textContent = `${data.symbol.toUpperCase()} Live Data`;
        change.textContent = `${data.changePercent >= 0 ? '+' : ''}${data.changePercent.toFixed(2)}%`;
        change.className = data.changePercent >= 0 ? 'price-up' : 'price-down';
    },

    // 5. Responsive Main Chart Drawing
    drawMainChart: (symbol, historyArray, changePercent = 0) => {
        const canvas = document.getElementById('main-chart');
        if (!canvas || historyArray.length < 2) return;

        const { ctx, width, height } = sizeCanvasToParent(canvas, 800, 180, { maxHeight: 180 });
        const padding = Math.min(40, Math.max(24, width * 0.08));
        const max = Math.max(...historyArray);
        const min = Math.min(...historyArray);
        const range = max - min || 1;

        ctx.clearRect(0, 0, width, height);

        const rootStyles = getComputedStyle(document.documentElement);
        ctx.fillStyle = rootStyles.getPropertyValue('--text-primary').trim() || '#ffffff';
        ctx.font = 'bold 14px monospace'; 
        ctx.fillText(`$${max.toFixed(2)}`, 10, padding - 10);
        ctx.fillText(`$${min.toFixed(2)}`, 10, height - padding + 20);

        ctx.strokeStyle = changePercent >= 0 ? '#03dac6' : '#cf6679'; 
        ctx.lineWidth = 3;
        ctx.beginPath();
        historyArray.forEach((val, index) => {
            const x = padding + (index / (historyArray.length - 1)) * (width - padding * 2);
            const y = (height - padding) - ((val - min) / range) * (height - padding * 2);
            index === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
    },
    debounce: (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    },

    // 6. Set Identity
    setUserIdentity: (username) => {
        const nameEl = document.getElementById('user-name');
        const avatarEl = document.getElementById('user-avatar');
        if (nameEl) nameEl.textContent = username;
        if (avatarEl) avatarEl.textContent = username.charAt(0).toUpperCase();
    },

    // 7. Responsive Allocation Chart
    drawAllocationChart: (portfolioData) => {
        const canvas = document.getElementById('allocation-chart');
        const legend = document.getElementById('allocation-legend');
        if (!canvas || !legend) return;

        const { ctx, width, height } = sizeCanvasToParent(canvas, 180, 180);
        ctx.clearRect(0, 0, width, height);
        legend.innerHTML = '';

        const entries = (portfolioData || []).map(asset => ({
            name: asset.assetName || asset.name || 'Unknown',
            amount: Math.abs(asset.amount || asset.quantity || 0)
        })).filter(e => e.amount > 0);

        const total = entries.reduce((sum, e) => sum + e.amount, 0);
        if (entries.length === 0) {
            legend.innerHTML = '<li class="allocation-empty">No assets to display</li>';
            return;
        }

        const cx = width / 2;
        const cy = height / 2;
        const outerRadius = Math.min(cx, cy) - 4;
        let startAngle = -Math.PI / 2;

        entries.forEach((entry, index) => {
            const sliceAngle = (entry.amount / total) * Math.PI * 2;
            const color = `hsl(${(index * 360) / entries.length}, 68%, 58%)`;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, outerRadius, startAngle, startAngle + sliceAngle);
            ctx.fillStyle = color;
            ctx.fill();

            const li = document.createElement('li');
            li.className = 'allocation-legend-item';
            li.innerHTML = `<span class="allocation-swatch" style="background:${color}"></span>
                           <span class="allocation-label">${entry.name}</span>
                           <span class="allocation-percent">${((entry.amount / total) * 100).toFixed(1)}%</span>`;
            legend.appendChild(li);
            startAngle += sliceAngle;
        });

        ctx.beginPath();
        ctx.arc(cx, cy, outerRadius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary');
        ctx.fill();
    }
};
