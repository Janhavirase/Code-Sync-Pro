import express from "express";
import { handleCodebaseChat } from "../controllers/aiController.js";
import multer from 'multer';


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
import { GoogleGenerativeAI } from '@google/generative-ai';

// 🚨 Initialize the Gemini SDK
// Make sure your .env file has GEMINI_API_KEY set!
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define the model we want to use for the audit
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
// (You can change "g
// Route for handling Copilot sidebar queries
router.post("/copilot/chat", handleCodebaseChat);
// routes/aiRoutes.js
router.post('/voice-to-code', async (req, res) => {
    try {
        const { transcription, activeFile, projectId, currentCode } = req.body;

        // 1. Define a strict System Prompt
        const systemPrompt = `
            You are a coding assistant integrating directly into a code editor.
            The user is currently editing: ${activeFile}.
            User Voice Command: "${transcription}"
            
            Current File Context:
            ${currentCode}

            CRITICAL REQUIREMENT: 
            You must ONLY respond with a valid JSON object. Do NOT include markdown code blocks (\`\`\`), conversational text, or explanations. 
            Respond ONLY in this exact JSON format:
            {
                "codeToInsert": "exact code string to insert at the cursor",
                "reply": "A brief 1-sentence confirmation message for the chat log."
            }
        `;

        // 2. Call your LLM (Assuming you are using Gemini)
        // Adapt this to how you currently call Gemini in your project
        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        // 3. Clean and parse the JSON (LLMs sometimes add markdown anyway)
        const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonResponse = JSON.parse(cleanJsonString);

        // 4. Send the structured JSON back to the frontend
        res.json({
            codeToInsert: jsonResponse.codeToInsert,
            reply: jsonResponse.reply
        });

    } catch (error) {
        console.error("Voice-to-Code Error:", error);
        res.status(500).json({ error: "Failed to generate code." });
    }
});
// 🚨 Add this below your existing /copilot/chat route
router.post('/deep-audit', async (req, res) => {
    try {
        const { currentCode, activeFile } = req.body;

        if (!currentCode) {
            return res.status(400).json({ error: "No code provided for audit." });
        }

        const systemPrompt = `
            You are a Senior AppSec and Performance Architect.
            Perform a deep audit on the following ${activeFile} code.
            
            Evaluate it against industry standards for:
            1. Security Vulnerabilities (High, Medium, Low)
            2. Performance bottlenecks (Time/Space Complexity issues)
            3. Scalability limits
            
            Provide an overall "Quality Score" out of 100 based on clean code principles.
            
            CRITICAL INSTRUCTION: You MUST return ONLY a raw JSON object. Do not wrap it in markdown blockquotes (\`\`\`json). Return exactly this structure and nothing else:
            {
                "qualityScore": 85,
                "summary": "A brief 2-sentence summary of the code's health.",
                "security": [
                    { "severity": "High", "issue": "Describe issue", "recommendation": "How to fix" }
                ],
                "performance": [
                    { "issue": "Describe bottleneck", "recommendation": "How to fix" }
                ],
                "scalability": [
                    { "issue": "Describe scaling limit", "recommendation": "How to fix" }
                ]
            }

            Code to audit:
            ${currentCode}
        `;

        // Assuming you are using the Gemini SDK
        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();
        
        // Clean the response just in case the LLM adds markdown anyway
        const cleanJsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const auditData = JSON.parse(cleanJsonString);

        res.json({ audit: auditData });

    } catch (error) {
        console.error("Deep Audit Error:", error);
        res.status(500).json({ error: "Failed to run deep audit. Ensure the code is valid." });
    }
});

export default router;