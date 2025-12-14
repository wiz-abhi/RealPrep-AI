export const fetchAccessToken = async () => {
    try {
        const response = await fetch('http://localhost:3000/api/interview/token');
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
