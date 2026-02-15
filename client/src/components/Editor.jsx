import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { ACTIONS } from '../Actions';

const CodeEditor = ({ 
    socketRef, 
    roomId, 
    onCodeChange, 
    code, 
    theme = 'vs-dark', 
    language = 'javascript', 
    onLineSelect, 
    comments,
    fontSize = 16,
    fontFamily = 'monospace',
    wordWrap = false
}) => {
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const decorationsRef = useRef([]); 
    const [editorLoaded, setEditorLoaded] = useState(false);

    // 🔍 DEBUG: Check if props are actually arriving
    console.log("EDITOR PROPS RECEIVED:", { theme, fontSize, fontFamily, wordWrap });

    function handleEditorDidMount(editor, monaco) {
        console.log("✅ Editor Mounted!");
        editorRef.current = editor;
        monacoRef.current = monaco; 
        setEditorLoaded(true);

        // 1. Handle Code Changes
        editor.onDidChangeModelContent((event) => {
            const currentCode = editor.getValue();
            onCodeChange(currentCode); 
            if (event.isFlush) return;
            if (socketRef.current) {
                socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code: currentCode });
            }
        });

        // 2. Cursor Tracking
        editor.onDidChangeCursorPosition((e) => {
            if (onLineSelect) onLineSelect(e.position.lineNumber, false);
        });

        // 3. Right Click Action
        editor.addAction({
            id: 'add-comment-action',
            label: '💬 Add Comment to this Line',
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.5,
            run: (ed) => {
                const position = ed.getPosition();
                if (onLineSelect) onLineSelect(position.lineNumber, true);
                return null;
            }
        });
    }

    // Update Code from Parent
    useEffect(() => {
        if (editorRef.current && code !== undefined) {
            const currentEditorValue = editorRef.current.getValue();
            if (currentEditorValue !== code) {
                editorRef.current.setValue(code);
            }
        }
    }, [code]);

    // Socket Sync
    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code: newCode }) => {
                if (newCode !== null && editorRef.current && editorRef.current.getValue() !== newCode) {
                    editorRef.current.setValue(newCode);
                }
            });
        }
        return () => { if(socketRef.current) socketRef.current.off(ACTIONS.CODE_CHANGE); };
    }, [socketRef.current]);

    // ✅ FORCE UPDATE OPTIONS (The Nuclear Fix ☢️)
    useEffect(() => {
        if (editorRef.current) {
            console.log("⚡ Forcing Options Update:", { fontSize, fontFamily, wordWrap });
            editorRef.current.updateOptions({
                fontSize: parseInt(fontSize),
                fontFamily: fontFamily,
                wordWrap: wordWrap ? 'on' : 'off'
            });
        }
    }, [fontSize, fontFamily, wordWrap]); // Run whenever these props change

    // ✅ THEME DEFINITION
    useEffect(() => {
        if (monacoRef.current && editorLoaded) {
            console.log("🎨 Applying Theme:", theme);
            const monaco = monacoRef.current;

            monaco.editor.defineTheme('dracula', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'comment', foreground: '6272a4', fontStyle: 'italic' },
                    { token: 'keyword', foreground: 'ff79c6' },
                    { token: 'identifier', foreground: '50fa7b' },
                    { token: 'string', foreground: 'f1fa8c' },
                    { token: 'number', foreground: 'bd93f9' },
                    { token: 'type', foreground: '8be9fd' },
                ],
                colors: {
                    'editor.background': '#282a36',
                    'editor.foreground': '#f8f8f2',
                    'editor.lineHighlightBackground': '#44475a',
                    'editor.selectionBackground': '#44475a',
                },
            });

            monaco.editor.defineTheme('monokai', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'comment', foreground: '75715e' },
                    { token: 'keyword', foreground: 'f92672' },
                    { token: 'string', foreground: 'e6db74' },
                    { token: 'number', foreground: 'ae81ff' },
                ],
                colors: {
                    'editor.background': '#272822',
                    'editor.foreground': '#f8f8f2',
                    'editor.lineHighlightBackground': '#3e3d32',
                },
            });

            monaco.editor.setTheme(theme);
        }
    }, [theme, editorLoaded]);

    return (
        <Editor
            height="100%"
            theme={theme}
            language={language}
            value={code || ""}
            onMount={handleEditorDidMount}
            // We still pass options here for the initial load
            options={{
                minimap: { enabled: false },
                fontSize: parseInt(fontSize),
                fontFamily: fontFamily,
                wordWrap: wordWrap ? 'on' : 'off',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: true,
                automaticLayout: true,
                contextmenu: true,
                glyphMargin: true,
            }}
        />
    );
};

export default CodeEditor;