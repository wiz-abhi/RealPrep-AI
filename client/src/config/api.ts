// API base URL - uses environment variable in production, localhost in development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function for making API requests
export const apiUrl = (path: string): string => {
    return `${API_BASE_URL}${path}`;
};

// Check if backend is ready (wakes up Render free tier)
export const checkBackendHealth = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for cold start
        
        const res = await fetch(`${API_BASE_URL}/health`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return res.ok;
    } catch {
        return false;
    }
};
