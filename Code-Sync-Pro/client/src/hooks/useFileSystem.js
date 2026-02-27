import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ACTIONS } from '../Actions';
import debounce from 'lodash/debounce';

const useFileSystem = (initialFiles, socketRef, roomId) => {
    const [files, setFiles] = useState(initialFiles);
    const [activeFileName, setActiveFileName] = useState(files[0]?.name || 'main.js');
    
    // 🔒 Refs
    const filesRef = useRef(files);
    const activeFileNameRef = useRef(activeFileName);
    const codeRef = useRef(files[0]?.value || '');
    const fileHistoryRef = useRef({ 'main.js': ['// Write JS here\nconsole.log("Hello World");'] });
    const typingTimeoutRef = useRef(null);

    // Sync Refs
    useEffect(() => {
        filesRef.current = files;
        activeFileNameRef.current = activeFileName;
    }, [files, activeFileName]);

    // --- 1. DEBOUNCED EMITTER ---
    const debouncedEmit = useCallback(debounce((roomId, fileName, newCode) => {
        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                roomId,
                fileName,
                code: newCode
            });
        }
    }, 300), []);

    // --- 2. LOCAL CHANGES ---
    const updateFileContent = (fileName, newCode) => {
        if (!fileName || fileName === 'undefined') return;
        if (fileName === activeFileNameRef.current && newCode === codeRef.current) return;

        if (fileName === activeFileName) {
            codeRef.current = newCode;
        }
        setFiles(prev => prev.map(f => f.name === fileName ? { ...f, value: newCode } : f));

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        
        typingTimeoutRef.current = setTimeout(() => {
            if (socketRef.current) {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                    roomId,
                    fileName,
                    code: newCode
                });
            }
        }, 300);
    };

    // --- 3. REMOTE CHANGES ---
    useEffect(() => {
        if (!socketRef.current) return;

        const handleRemoteChange = ({ fileName, code }) => {
            if (!fileName || !code) return;
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

            if (fileName === activeFileNameRef.current) {
                codeRef.current = code; 
            }

            const currentFile = filesRef.current.find(f => f.name === fileName);
            if (currentFile && currentFile.value === code) return;

            setFiles(prev => prev.map(f => {
                if (f.name === fileName) {
                    return { ...f, value: code };
                }
                return f;
            }));
        };

        socketRef.current.on(ACTIONS.CODE_CHANGE, handleRemoteChange);

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE, handleRemoteChange);
        };
    }, [socketRef.current]);

    // --- 4. HELPER FUNCTIONS ---
    const switchFile = (fileName) => {
        setActiveFileName(fileName);
        const file = files.find(f => f.name === fileName);
        if (file) codeRef.current = file.value;
    };

  // We changed the arguments to accept the type ('file' or 'folder') and parentId
const createNewItem = (itemName, type = 'file', parentId = null) => {
    // 🔍 DEBUG: Step 1 - Function Called
    console.log(`[DEBUG] 📂 createNewItem called for: "${itemName}", Type: ${type}`);

    if (files.some(f => f.name === itemName)) {
        toast.error(`${type === 'folder' ? 'Folder' : 'File'} already exists!`);
        return false;
    }
    
    // ✨ THE UPGRADE: Added id, type, parentId, and dynamic language
    const newItem = { 
        id: Date.now().toString(), // Unique ID for the new sidebar
        name: itemName, 
        type: type,                // 'file' or 'folder'
        parentId: parentId,        // Enables nested folders in the UI
        language: type === 'file' ? (itemName.split('.').pop() || 'javascript') : null, 
        value: type === 'file' ? '// New File' : null 
    };
    
    const updatedFiles = [...files, newItem];
    
    // Update Local State
    setFiles(updatedFiles);
    
    // Keep your exact history logic (but only apply it to files, not folders)
    if (type === 'file') {
        fileHistoryRef.current[itemName] = [newItem.value];
    }
    
    // 🔍 DEBUG: Step 2 - Checking Socket (YOUR EXACT LOGIC)
    if(socketRef.current) {
        console.log(`[DEBUG] 🚀 Emitting FILE_CREATED to server for Room: ${roomId}`);
        console.log(`[DEBUG] 📦 Payload Files:`, updatedFiles);
        
        socketRef.current.emit(ACTIONS.FILE_CREATED, { roomId, files: updatedFiles });
    } else {
        console.error(`[DEBUG] ❌ Socket is NULL! Cannot emit FILE_CREATED.`);
    }
    
    toast.success(`${type === 'folder' ? 'Folder' : 'File'} created!`);
    return true;
};

    const deleteFile = (fileName) => {
        // ... (Keep existing delete logic)
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
        createNewItem,
        deleteFile
    };
};

export default useFileSystem;