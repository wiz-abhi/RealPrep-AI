import prisma from '../db';
import { GeminiService } from './gemini';
import { v4 as uuidv4 } from 'uuid';

const gemini = new GeminiService();

export class RAGService {

    // Simple chunking by splitting widely for now (can be improved with strict token counting)
    private static chunkText(text: string, chunkSize: number = 500): string[] {
        const words = text.split(' ');
        const chunks: string[] = [];
        let currentChunk = '';

        for (const word of words) {
            if ((currentChunk + word).length > chunkSize) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            currentChunk += `${word} `;
        }
        if (currentChunk) chunks.push(currentChunk.trim());

        return chunks;
    }

    static async ingestResume(resumeId: string, text: string) {
        const chunks = this.chunkText(text);

        // Generate embeddings and prepare data
        const chunkData = await Promise.all(
            chunks.map(async (chunk) => {
                const embedding = await gemini.generateEmbedding(chunk);
                // Convert embedding array to PostgreSQL vector format string
                const vectorString = `[${embedding.join(',')}]`;

                return {
                    id: uuidv4(),
                    resumeId,
                    content: chunk,
                    // Store as string, will be cast to vector in raw query
                    embedding: vectorString
                };
            })
        );

        // Insert using raw SQL for vector type support
        for (const data of chunkData) {
            await prisma.$executeRaw`
                INSERT INTO "ResumeChunk" (id, "resumeId", content, embedding, "createdAt")
                VALUES (${data.id}, ${data.resumeId}, ${data.content}, ${data.embedding}::vector, NOW())
            `;
        }
    }

    static async ingestReferenceDoc(title: string, content: string, type: 'SamplePaper' | 'JobDescription') {
        const chunks = this.chunkText(content);

        const chunkData = await Promise.all(
            chunks.map(async (chunk) => {
                const embedding = await gemini.generateEmbedding(chunk);
                const vectorString = `[${embedding.join(',')}]`;

                return {
                    id: uuidv4(),
                    title,
                    content: chunk,
                    type,
                    embedding: vectorString
                };
            })
        );

        // Insert using raw SQL for vector type support
        for (const data of chunkData) {
            await prisma.$executeRaw`
                INSERT INTO "ReferenceDoc" (id, title, content, type, embedding, "createdAt")
                VALUES (${data.id}, ${data.title}, ${data.content}, ${data.type}, ${data.embedding}::vector, NOW())
            `;
        }
    }

    static async retrieveContext(resumeId: string, query: string, limit: number = 3): Promise<string> {
        const queryEmbedding = await gemini.generateEmbedding(query);
        const vectorString = `[${queryEmbedding.join(',')}]`;

        // Semantic search over Resume Chunks
        const resumeChunks: any[] = await prisma.$queryRaw`
      SELECT content, 1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM "ResumeChunk"
      WHERE "resumeId" = ${resumeId}
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

        // Semantic search over Reference Docs
        const refChunks: any[] = await prisma.$queryRaw`
      SELECT content, title, 1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM "ReferenceDoc"
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

        // Format into a readable context string
        const resumeContext = resumeChunks.map(c => c.content).join('\n\n');
        const refContext = refChunks.map(c => `[${c.title}]: ${c.content}`).join('\n\n');

        return `RESUME CONTENT:\n${resumeContext}\n\nREFERENCE MATERIAL:\n${refContext}`;
    }
}
