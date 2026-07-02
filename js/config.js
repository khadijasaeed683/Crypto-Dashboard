export const CONFIG = {
    BINANCE_WS_BASE: 'wss://stream.binance.com:9443/ws',
    
    // ✅ Actual API Endpoint
    REST_API_BASE: 'https://6a44f487aab3faec3f691a58.mockapi.io/api/v1/portfolio', 
    
    // Updated with 2 additional symbols
    SYMBOLS: ['btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'adausdt', 'xrpusdt', 'dotusdt'],
    
    ITEMS_PER_PAGE: 4,
    WS_RECONNECT_MAX_ATTEMPTS: 5
};