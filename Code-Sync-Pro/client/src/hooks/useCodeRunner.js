import { useState } from 'react';
import axios from 'axios';

export const useCodeRunner = () => {
    const [output, setOutput] = useState("");
    const [isCompiling, setIsCompiling] = useState(false);

    // We pass the code and language directly into the function when the user clicks "Run"
    const executeCode = async (sourceCode, language = 'javascript') => {
        if (!sourceCode || !sourceCode.trim()) {
            setOutput("Error: No code to run!");
            return;
        }

        setIsCompiling(true);
        setOutput("Running in Docker Sandbox...\n");

        try {
            const response = await axios.post('http://localhost:5000/api/execute', {
                code: sourceCode,
                language: language 
            });
            
            // Set the terminal output to whatever Docker sends back!
            setOutput(response.data.output);
            
        } catch (error) {
            console.error("RCE Error:", error);
            setOutput(
                error.response?.data?.output || 
                "Error: Could not connect to the execution server. Is the backend running?"
            );
        } finally {
            setIsCompiling(false);
        }
    };

    // We return a 'clear' function too, just in case you want a "Clear Console" button later!
    const clearOutput = () => setOutput("");

    return { output, isCompiling, executeCode, clearOutput };
};