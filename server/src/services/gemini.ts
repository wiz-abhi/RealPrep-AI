import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class GeminiService {
    private model: any;

    constructor(modelName: 'gemini-3-pro-preview' | 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' = 'gemini-2.5-flash-lite') {
        this.model = genAI.getGenerativeModel({ model: modelName });
    }

    private async retryOperation<T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
        try {
            return await operation();
        } catch (error: any) {
            // Check for 429 (Rate Limit) or 503 (Overloaded)
            const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('usage');
            const isOverloaded = error.status === 503 || error.message?.includes('503') || error.message?.includes('overloaded');

            if (retries > 0 && (isRateLimit || isOverloaded)) {
                // If 429, use a longer delay (e.g., 10s minimum or parse from error if possible)
                const waitTime = isRateLimit ? Math.max(delay, 10000) : delay;

                console.warn(`Gemini API ${isRateLimit ? '429 Rate Limit' : '503 Overloaded'}. Retrying in ${waitTime}ms... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return this.retryOperation(operation, retries - 1, waitTime * 2); // Exponential backoff
            }
            throw error;
        }
    }

    async generateResponse(history: { role: string; parts: string }[], input: string) {
        const chat = this.model.startChat({
            history: history.map(h => ({
                role: h.role, // 'user' or 'model'
                parts: [{ text: h.parts }],
            })),
        });

        const result = await this.retryOperation(() => chat.sendMessage(input));
        const response = await result.response;
        return response.text();
    }

    async analyzeResume(resumeText: string) {
        // Use Flash Lite for fast analysis
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const prompt = `Analyze this resume and extract key skills, strengths, and weaknesses as JSON: ${resumeText}`;
        const result = await this.retryOperation(() => model.generateContent(prompt));
        const text = result.response.text();
        // Basic cleanup to ensure JSON
        return text.replace(/```json|```/g, '');
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await this.retryOperation(() => model.embedContent(text));
        return result.embedding.values;
    }

    async generateText(prompt: string): Promise<string> {
        const result = await this.retryOperation(() => this.model.generateContent(prompt));
        const text = result.response.text();
        return text.replace(/```json|```/g, '');
    }
}
