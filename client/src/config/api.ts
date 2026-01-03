// API base URL - uses environment variable in production, localhost in development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function for making API requests
export const apiUrl = (path: string): string => {
    return `${API_BASE_URL}${path}`;
};
