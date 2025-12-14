import { fetchAccessToken } from "hume";

export const getHumeAccessToken = async (apiKey: string, secretKey: string) => {
    const accessToken = await fetchAccessToken({
        apiKey,
        secretKey,
    });

    if (!accessToken) {
        return null;
    }

    return accessToken;
};
