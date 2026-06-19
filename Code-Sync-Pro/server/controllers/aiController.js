import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { searchCodebase } from "../services/ragService.js";


// Initialize the Gemini LLM for text generation
const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash", // Fast, accurate, and cost-effective for chat
    maxOutputTokens: 2048,
    temperature: 0.2, // Low temperature keeps the AI objective and accurate to your code
    apiKey: process.env.GEMINI_API_KEY // Explicitly passing your API key
});

/**
 * Handles incoming chat messages from the Copilot sidebar using RAG context.
 */
export const handleCodebaseChat = async (req, res) => {
    try {
        const { message, projectId, activeFile, currentCode } = req.body;

        if (!message || !projectId) {
            return res.status(400).json({ error: "Missing required message or projectId fields." });
        }

        console.log(`[RAG Query] Project: ${projectId} | Query: "${message}"`);

        // 1. Semantic Search: Fetch top relevant code snippets from MongoDB
        const contextDocs = await searchCodebase(message, projectId);
        
        // 2. Format the retrieved database vectors into a clean text block
        let injectedContext = contextDocs.map((doc, idx) => {
            return `--- Context Block ${idx + 1} (File: ${doc.metadata.fileName}) ---\n${doc.pageContent}\n`;
        }).join("\n");

        // 3. Construct the Master System Prompt (The Copilot Brain)
        const systemPrompt = `You are the advanced AI Technical Copilot inside the 'Code-Sync-Pro' real-time collaborative IDE. 
Your goal is to help developers write clean, optimized, and secure code based strictly on their codebase context.

Here is the relevant code context retrieved from the project database:
${injectedContext}

${activeFile ? `The user is currently editing the file: ${activeFile}. Here is its current state:\n\`\`\`\n${currentCode}\n\`\`\`` : ""}

Instructions:
- Use the retrieved context blocks to answer the user's query accurately.
- If the answer cannot be found in the context or the active file, use your general software engineering knowledge but clearly state that it is a general recommendation.
- Always provide clean, copy-pasteable markdown code blocks if code refactoring is requested.
- Keep explanations clear, professional, and engineering-focused.`;

        // 4. Execute the generation using LangChain
        const response = await model.invoke([
            ["system", systemPrompt],
            ["human", message]
        ]);

        // 5. Send response back to the React sidebar
        // Note: LangChain returns an object, so we must extract .content to get the text!
        return res.status(200).json({ 
            reply: response.content, 
            sources: contextDocs.map(d => d.metadata.fileName) 
        });

    } catch (error) {
        console.error("Error in AI Chat Controller:", error);
        return res.status(500).json({ error: "Internal AI engine failure." });
    }
};

