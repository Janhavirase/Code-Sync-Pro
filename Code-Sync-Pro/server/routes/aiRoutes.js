import express from "express";
import { handleCodebaseChat } from "../controllers/aiController.js";
import multer from 'multer';


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

export default router;