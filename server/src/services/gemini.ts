import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export class GeminiService {
    private model: any;

    constructor(modelName: 'gemini-3-pro-preview' | 'gemini-2.5-flash' = 'gemini-2.5-flash') {
        this.model = genAI.getGenerativeModel({ model: modelName });
    }

    async generateResponse(history: { role: string; parts: string }[], input: string) {
        const chat = this.model.startChat({
            history: history.map(h => ({
                role: h.role, // 'user' or 'model'
                parts: [{ text: h.parts }],
            })),
        });

        const result = await chat.sendMessage(input);
        const response = await result.response;
        return response.text();
    }

    async analyzeResume(resumeText: string) {
        // Use Flash for fast analysis
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Analyze this resume and extract key skills, strengths, and weaknesses as JSON: ${resumeText}`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // Basic cleanup to ensure JSON
        return text.replace(/```json|```/g, '');
    }

    async generateEmbedding(text: string): Promise<number[]> {
        const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text);
        return result.embedding.values;
    }

    async generateText(prompt: string): Promise<string> {
        const result = await this.model.generateContent(prompt);
        const text = result.response.text();
        return text.replace(/```json|```/g, '');
    }
}
