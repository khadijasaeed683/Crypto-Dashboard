import { CONFIG } from './config.js';

/**
 * Manages WebSocket connections, parsing, and exponential backoff reconnection.
 */
export class BinanceSocket {
    constructor(symbols, onMessageCallback) {
        this.symbols = symbols;
        this.onMessageCallback = onMessageCallback;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.isIntentionalClose = false;
    }

    connect() {
        const streamParam = this.symbols.map(s => `${s}@ticker`).join('/');
        const wsUrl = `${CONFIG.BINANCE_WS_BASE}/${streamParam}`;
        
        this.socket = new WebSocket(wsUrl);

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                // Standardize the payload
                this.onMessageCallback({
                    symbol: data.s,
                    price: parseFloat(data.c),
                    changePercent: parseFloat(data.P),
                    volume: parseFloat(data.v)
                });
            } catch (error) {
                console.error("Message Parsing Error:", error);
            }
        };

        this.socket.onclose = () => {
            if (!this.isIntentionalClose) this.handleReconnect();
        };
    }

    handleReconnect() {
        if (this.reconnectAttempts < CONFIG.WS_RECONNECT_MAX_ATTEMPTS) {
            const timeout = Math.pow(2, this.reconnectAttempts) * 1000;
            console.warn(`WebSocket closed. Reconnecting in ${timeout}ms...`);
            setTimeout(() => this.connect(), timeout);
            this.reconnectAttempts++;
        } else {
            console.error("Max WebSocket reconnection attempts reached.");
        }
    }

    disconnect() {
        this.isIntentionalClose = true;
        if (this.socket) {
            this.socket.close();
            this.socket = null; // Memory cleanup
        }
    }
}