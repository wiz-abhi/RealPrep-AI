import { API_BASE_URL } from '../config/api';

export const fetchAccessToken = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/interview/token`);
        if (!response.ok) {
            throw new Error('Failed to fetch token');
        }
        const data = await response.json();
        return data.accessToken;
    } catch (error) {
        console.error('Error fetching token:', error);
        return null;
    }
};
