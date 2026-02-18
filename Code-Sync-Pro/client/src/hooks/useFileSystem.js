import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ACTIONS } from '../Actions';

const useFileSystem = (initialFiles, socketRef, roomId) => {
    const [files, setFiles] = useState(initialFiles);
    const [activeFileName, setActiveFileName] = useState(files[0]?.name || 'main.js');
    
    // 🔒 REFS (The Secret to fixing the shake)
    // These allow us to read the latest state inside the socket listener
    // without triggering a re-render loop.
    const filesRef = useRef(files);
    const activeFileNameRef = useRef(activeFileName);
    const codeRef = useRef(files[0]?.value || '');
    const fileHistoryRef = useRef({ 'main.js': ['// Write JS here\nconsole.log("Hello World");'] });

    // Sync Refs with State
    useEffect(() => {
        filesRef.current = files;
        activeFileNameRef.current = activeFileName;
    }, [files, activeFileName]);

    // --- 1. HANDLE LOCAL CHANGES (My Typing) ---
    const updateFileContent = (fileName, newCode) => {
        // Update local state
        setFiles(prev => prev.map(f => f.name === fileName ? { ...f, value: newCode } : f));
        
        // Update Ref immediately for consistency
        if (fileName === activeFileName) {
            codeRef.current = newCode;
        }

        // Emit to Server
        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                roomId,
                fileName,
                code: newCode
            });
        }
    };

    // --- 2. HANDLE REMOTE CHANGES (The Fix) ---
    useEffect(() => {
        if (!socketRef.current) return;

        const handleRemoteChange = ({ fileName, code }) => {
            // Check if we actually need to update (Prevent infinite loops)
            const currentFile = filesRef.current.find(f => f.name === fileName);
            if (currentFile && currentFile.value === code) return;

            // Update the file list silently
            setFiles(prev => prev.map(f => {
                if (f.name === fileName) {
                    return { ...f, value: code };
                }
                return f;
            }));

            // If the remote change is for the file I am currently looking at,
            // update my editor reference so I see it.
            if (fileName === activeFileNameRef.current) {
                codeRef.current = code;
            }
        };

        // Attach Listener
        socketRef.current.on(ACTIONS.CODE_CHANGE, handleRemoteChange);

        // Cleanup
        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE, handleRemoteChange);
        };
    }, [socketRef.current]); // 👈 Only run once on mount (prevents shaking)

    // --- 3. HELPER FUNCTIONS ---
    const switchFile = (fileName) => {
        setActiveFileName(fileName);
        const file = files.find(f => f.name === fileName);
        if (file) codeRef.current = file.value;
    };

    const createNewFile = (newFileName) => {
        if (files.some(f => f.name === newFileName)) {
            toast.error("File already exists!");
            return false;
        }
        
        let language = 'javascript';
        let value = `// ${newFileName}`; 

        if (newFileName.endsWith('.html')) {
            language = 'html';
            value = `<!DOCTYPE html>\n<html>\n<head>\n\t<title>Page</title>\n</head>\n<body>\n\t<h1>Hello World</h1>\n</body>\n</html>`;
        } else if (newFileName.endsWith('.css')) {
            language = 'css';
            value = `body { background: #fff; }`;
        } else if (newFileName.endsWith('.py')) {
            language = 'python';
            value = `print("Hello World")`;
        } else if (newFileName.endsWith('.java')) {
            language = 'java';
            value = `public class ${newFileName.split('.')[0]} {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}`;
        }

        const newFile = { name: newFileName, language, value };
        const updatedFiles = [...files, newFile];
        setFiles(updatedFiles);
        
        if(socketRef.current) {
            socketRef.current.emit(ACTIONS.FILE_CREATED, { roomId, files: updatedFiles });
        }
        
        fileHistoryRef.current[newFileName] = [value];
        toast.success("File created!");
        return true;
    };

    const deleteFile = (fileName) => {
        if (files.length === 1) {
            toast.error("Cannot delete the last file!");
            return;
        }
        const updatedFiles = files.filter(f => f.name !== fileName);
        setFiles(updatedFiles);
        
        if (activeFileName === fileName) {
            setActiveFileName(updatedFiles[0].name);
            codeRef.current = updatedFiles[0].value;
        }

        if(socketRef.current) {
            socketRef.current.emit(ACTIONS.FILE_DELETED, { roomId, files: updatedFiles });
        }
        toast.success("File deleted");
    };

    return {
        files, setFiles,
        activeFileName, setActiveFileName,
        activeFileNameRef,
        codeRef,
        fileHistoryRef,
        updateFileContent,
        switchFile,
        createNewFile,
        deleteFile
    };
};

export default useFileSystem;