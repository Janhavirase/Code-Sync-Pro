import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';

// Note: We removed 'socketRef' and 'roomId' from props because 
// the parent component (EditorPage) handles the networking now.
const CodeEditor = ({ 
    onCodeChange, 
    code, 
    theme = 'vs-dark', 
    language = 'javascript', 
    onLineSelect, 
    fontSize = 16,
    fontFamily = 'monospace',
    wordWrap = false
}) => {
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const [editorLoaded, setEditorLoaded] = useState(false);

    function handleEditorDidMount(editor, monaco) {
        // console.log("✅ Editor Mounted!");
        editorRef.current = editor;
        monacoRef.current = monaco; 
        setEditorLoaded(true);

        // 1. Handle Code Changes
        editor.onDidChangeModelContent((event) => {
            // 🛑 STOP: Don't emit socket events here. 
            // Just tell the parent "The code changed".
            // The parent (EditorPage) will use the Hook to debounce and emit safely.
            const currentCode = editor.getValue();
            onCodeChange(currentCode); 
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

    // ✅ FORCE UPDATE OPTIONS
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({
                fontSize: parseInt(fontSize),
                fontFamily: fontFamily,
                wordWrap: wordWrap ? 'on' : 'off'
            });
        }
    }, [fontSize, fontFamily, wordWrap]); 

    // ✅ THEME DEFINITION (Kept your custom logic)
    useEffect(() => {
        if (monacoRef.current && editorLoaded) {
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

// ✅ IMPORTANT: React.memo prevents the editor from re-rendering 
// unless the props (code, language, theme) actually change.
export default React.memo(CodeEditor);