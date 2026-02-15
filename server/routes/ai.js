const express = require('express');
const router = express.Router();
// ✅ FIX 1: Import the new 'InferenceClient' instead of HfInference
const { InferenceClient } = require('@huggingface/inference');

// --- DIAGNOSTICS (Keep this to debug your token) ---
const token = process.env.HF_ACCESS_TOKEN;
if (!token) {
    console.error("❌ ERROR: HF_ACCESS_TOKEN is missing from .env");
}

// ✅ FIX 2: Initialize the new client
const client = new InferenceClient(token);

router.post('/chat', async (req, res) => {
    const { code, prompt } = req.body;

    try {
        // ✅ FIX 3: Use 'chatCompletion' (Modern standard)
        // We use a safe, non-gated model (Qwen or Flan) to test connection first. 
        // Once this works, you can switch back to "mistralai/Mistral-7B-Instruct-v0.2"
        const response = await client.chatCompletion({
            model: "Qwen/Qwen2.5-Coder-32B-Instruct", // Excellent coding model (often free)
            messages: [
                { role: "system", content: "You are an expert Senior Developer. Answer concisely." },
                { role: "user", content: `Code:\n${code}\n\nRequest: ${prompt}` }
            ],
            max_tokens: 500,
            temperature: 0.5
        });

        const answer = response.choices[0].message.content;
        res.json({ response: answer });

    } catch (error) {
        console.error("❌ AI API Error:", error.message);

        // Specific handling for the 403 "Forbidden" error
        if (error.message.includes("403")) {
            console.error("🚨 PERMISSION ERROR: Check these two things:");
            console.error("1. Did you create a FINE-GRAINED token with 'Inference' enabled?");
            console.error("2. Did you Accept the License for the model on Hugging Face?");
            
            return res.status(403).json({ 
                error: "Permission Denied. Check server console for details." 
            });
        }

        res.status(500).json({ error: "AI Service Failed" });
    }
});

module.exports = router;