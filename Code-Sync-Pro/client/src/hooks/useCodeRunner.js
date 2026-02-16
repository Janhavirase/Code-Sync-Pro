// import { useState, useCallback } from 'react';
// import toast from 'react-hot-toast';

// const useCodeRunner = () => {
//     const [output, setOutput] = useState('');
//     const [isRunning, setIsRunning] = useState(false);
//     const [customInput, setCustomInput] = useState("");

//     const runCode = useCallback(async (currentFile, code, input) => {
//         setIsRunning(true);
//         setOutput("Running in Sandbox Environment...");

//         // ⏳ MOCK DELAY: Simulate network request (1.5 seconds)
//         await new Promise(resolve => setTimeout(resolve, 1500));

//         // 🎭 MOCK RESPONSE
//         // In a real app, this would come from the server
//         try {
//             if (code.trim() === "") {
//                 throw new Error("Source code cannot be empty");
//             }

//             // Simple mock logic for demonstration
//             let fakeOutput = "";
//             if (currentFile.language === 'javascript') {
//                 fakeOutput = `> node ${currentFile.name}\nHello World\n(Mock Execution Successful)`;
//             } else if (currentFile.language === 'python') {
//                 fakeOutput = `> python3 ${currentFile.name}\nHello World\n(Mock Execution Successful)`;
//             } else {
//                 fakeOutput = `Compiled ${currentFile.language} successfully.\nOutput: Hello World`;
//             }

//             setOutput(fakeOutput);
//             toast.success("Execution Complete (Mock)");
            
//         } catch (error) {
//             setOutput(`Error: ${error.message}`);
//             toast.error("Execution Failed");
//         } finally {
//             setIsRunning(false);
//         }
//     }, []);

//     return { output, setOutput, isRunning, customInput, setCustomInput, runCode };
// };

// export default useCodeRunner;

//by community...code X 
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const useCodeRunner = () => {
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [customInput, setCustomInput] = useState("");

    const runCode = useCallback(async (currentFile, code, input) => {
        setIsRunning(true);
        setOutput("Compiling...");

        // ⏳ Fake Delay to feel realistic (1s)
        await new Promise(r => setTimeout(r, 1000));

        try {
            // 🎭 Logic to Fake a Successful Run
            let fakeOutput = "";
            
            if (currentFile.language === 'javascript') {
                // If they wrote console.log, try to show it (basic parsing)
                const match = code.match(/console\.log\(['"`](.*)['"`]\)/);
                const logContent = match ? match[1] : "Hello World";
                fakeOutput = `> node ${currentFile.name}\n${logContent}\n\n[Done] exited with code=0 in 0.123 seconds`;
            } 
            else if (currentFile.language === 'python') {
                const match = code.match(/print\(['"`](.*)['"`]\)/);
                const logContent = match ? match[1] : "Hello World";
                fakeOutput = `> python3 ${currentFile.name}\n${logContent}\n\n[Done] exited with code=0 in 0.045 seconds`;
            } 
            else {
                fakeOutput = `> clang ${currentFile.name}\nHello World\n\n[Done] exited with code=0`;
            }

            setOutput(fakeOutput);
            toast.success("Compiled Successfully (Mock)");

        } catch (error) {
            setOutput("Error: Execution Failed");
        } finally {
            setIsRunning(false);
        }
    }, []);

    return { output, setOutput, isRunning, customInput, setCustomInput, runCode };
};

export default useCodeRunner;