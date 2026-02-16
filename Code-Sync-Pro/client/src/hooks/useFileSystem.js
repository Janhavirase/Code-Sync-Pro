import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ACTIONS } from '../Actions';

const useFileSystem = (initialFiles, socketRef, roomId) => {
    const [files, setFiles] = useState(initialFiles);
    const [activeFileName, setActiveFileName] = useState(files[0]?.name || 'main.js');
    const activeFileNameRef = useRef(activeFileName);
    const codeRef = useRef(files[0]?.value || '');
    const fileHistoryRef = useRef({ 'main.js': ['// Write JS here\nconsole.log("Hello World");'] });

    useEffect(() => {
        activeFileNameRef.current = activeFileName;
    }, [activeFileName]);

    const updateFileContent = (fileName, newCode) => {
        setFiles(prev => prev.map(f => f.name === fileName ? { ...f, value: newCode } : f));
    };

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