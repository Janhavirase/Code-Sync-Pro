
// //for docker(localhosttt)
// import express from 'express';
// const router = express.Router();
// import fs from 'fs';
// import path from 'path';
// import { exec } from 'child_process';
// // 🧠 THE SENIOR DEV CONFIG MAP
// const LANGUAGE_CONFIG = {
//     javascript: { 
//         image: 'node:20-alpine', 
//         filename: 'main.js', 
//         command: 'node main.js < input.txt' 
//     },
//     python: { 
//         image: 'python:3.11-alpine', 
//         filename: 'main.py', 
//         command: 'python main.py < input.txt' 
//     },
//     c: { 
//         image: 'gcc:13', 
//         filename: 'main.c', 
//         command: 'gcc main.c -o main && ./main < input.txt' 
//     },
//     java: { 
//         image: 'eclipse-temurin:21-alpine', 
//         filename: 'Main.java', 
//         command: 'javac Main.java && java Main < input.txt' 
//     }
// };

// const executeContainer = (cmd, timeoutMs = 10000) => {
//     return new Promise((resolve, reject) => {
//         exec(cmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
//             if (error) {
//                 if (error.killed) return reject('Error: Execution Timed Out (Infinite Loop?)');
//                 return reject(stderr || error.message);
//             }
//             if (stderr) return reject(stderr);
//             resolve(stdout);
//         });
//     });
// };

// router.post('/', async (req, res) => {
//     const { language, code, input } = req.body;

//     // 🛡️ THE FIX: Translate file extensions (py, js) into full language names!
//     let safeLang = (language || 'javascript').toLowerCase();
//     if (safeLang === 'py') safeLang = 'python';
//     if (safeLang === 'js') safeLang = 'javascript';
//     if (safeLang === 'c/c++' || safeLang === 'cpp') safeLang = 'c';

//     // Check our config map using the translated name
//     if (!LANGUAGE_CONFIG[safeLang]) {
//         return res.status(400).json({ error: `Unsupported language: ${language}` });
//     }

//     const config = LANGUAGE_CONFIG[safeLang];
    
//     const runId = `run-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
//     const tempDirPath = path.join(__dirname, '../temp', runId); 
    
//     try {
//         fs.mkdirSync(tempDirPath, { recursive: true });
        
//         const filePath = path.join(tempDirPath, config.filename);
//         fs.writeFileSync(filePath, code);

//         // 📝 Write the input file!
//         const inputFilePath = path.join(tempDirPath, 'input.txt');
//         fs.writeFileSync(inputFilePath, input || "");

//         // Windows Path Fix
//         const dockerVolumePath = tempDirPath.replace(/\\/g, '/');

//         // Construct the Secure Docker Command
//         const dockerCmd = `docker run --rm --network none -m 256m -v "${dockerVolumePath}:/app" -w /app ${config.image} sh -c "${config.command}"`;

//         const output = await executeContainer(dockerCmd, 15000);
//         res.json({ output: output });

//     } catch (err) {
//         res.json({ error: err.toString() });
//     } finally {
//         if (fs.existsSync(tempDirPath)) {
//             fs.rmSync(tempDirPath, { recursive: true, force: true });
//         }
//     }
// });

// export default router;











// // //for/after deployment (api-->jdoodle)
import express from 'express';
const router = express.Router();
import axios from 'axios'; // Make sure to run `npm install axios` in your backend!
// 🧠 JDoodle Language Mapping
const JDOODLE_CONFIG = {
    javascript: { language: 'nodejs', versionIndex: '4' }, 
    python: { language: 'python3', versionIndex: '4' },   
    c: { language: 'c', versionIndex: '5' },              
    java: { language: 'java', versionIndex: '4' }         
};

router.post('/', async (req, res) => {
    // 1. Grab 'input' from the frontend!
    const { language, code, input } = req.body;

    // 🛡️ THE FIX: Translate file extensions (py, js) into full language names!
    let safeLang = (language || 'javascript').toLowerCase();
    if (safeLang === 'py') safeLang = 'python';
    if (safeLang === 'js') safeLang = 'javascript';
    if (safeLang === 'c/c++' || safeLang === 'cpp') safeLang = 'c';

    if (!JDOODLE_CONFIG[safeLang]) {
        return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    const config = JDOODLE_CONFIG[safeLang];

    try {
        // Send the code AND input to JDoodle
        const response = await axios.post('https://api.jdoodle.com/v1/execute', {
            script: code,
            language: config.language,
            versionIndex: config.versionIndex,
            stdin: input || "", // 👈 THIS IS THE MAGIC LINE FOR USER INPUT
            clientId: process.env.JDOODLE_CLIENT_ID, 
            clientSecret: process.env.JDOODLE_CLIENT_SECRET
        });

        // JDoodle sends the terminal output inside response.data.output
        if (response.data.error) {
            res.json({ error: response.data.error });
        } else {
            res.json({ output: response.data.output });
        }

   } catch (err) {
        // Log the exact error to your backend terminal
        console.error("JDoodle API Error:", err.response?.data || err.message);
        
        // Send the EXACT error to the frontend so you can see it in the Network tab
        res.status(500).json({ 
            error: "JDoodle Execution Failed", 
            details: err.response?.data || err.message 
        });
    }
});

export default router;
