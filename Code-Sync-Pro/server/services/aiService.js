import axios from "axios";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api/ai";

/**
 * Sends a chat query along with current room context to the RAG backend.
 * * @param {string} message - The user query from the input box
 * @param {string} projectId - The active room/project ID
 * @param {string} activeFile - The name of the file currently open in the editor tabs
 * @param {string} currentCode - The raw code inside the active editor instance
 */
export const sendCopilotQuery = async (message, projectId, activeFile, currentCode) => {
    try {
        const response = await axios.post(`${API_URL}/copilot/chat`, {
            message,
            projectId,
            activeFile,
            currentCode
        });
        return response.data; // Returns { reply, sources }
    } catch (error) {
        console.error("Error communicating with AI Copilot API:", error);
        throw error;
    }
};