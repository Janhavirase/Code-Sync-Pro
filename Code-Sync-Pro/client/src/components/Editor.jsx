import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';

const Editor = ({ 
    editorRef, 
    onCodeChange, 
    activeFileName,
    jumpToLine,
    theme = 'vs-dark', 
    language = 'javascript', 
    code, // 👈 RESTORED: This allows your Render socket to control the text!
    onLineSelect, 
    fontSize = 16,
    fontFamily = 'monospace',
    wordWrap = false,
    comments,
    roomId,
    username
}) => {
    const monacoRef = useRef(null);
    const [editorLoaded, setEditorLoaded] = useState(false);
    
    const commentDecorationsRef = useRef([]);

    // 1. Handle Editor Mounting
    function handleEditorDidMount(editor, monaco) {
        if (editorRef) {
            editorRef.current = editor; 
        }
        monacoRef.current = monaco; 
        setEditorLoaded(true);

        // Track cursor for local line selection (for comments)
        editor.onDidChangeCursorPosition((e) => {
            if (onLineSelect) onLineSelect(e.position.lineNumber, false);
        });

        // Add Right-Click "Add Comment" Action
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

    // 🚨 NEW: Capture typing and send it to your custom backend!
    const handleEditorChange = (value) => {
        if (onCodeChange) {
            onCodeChange(value);
        }
    };

    // ✅ JUMP TO LINE LOGIC
    useEffect(() => {
        if (editorRef && editorRef.current && jumpToLine) {
            const line = parseInt(jumpToLine);
            editorRef.current.revealLineInCenter(line);
            editorRef.current.setPosition({ lineNumber: line, column: 1 });
            editorRef.current.focus();
        }
    }, [jumpToLine, editorRef]);

    // ✅ APPLY COMMENT HIGHLIGHTS
    useEffect(() => {
        if (editorRef && editorRef.current && monacoRef.current && Array.isArray(comments)) {
            const newDecorations = comments
                .filter(comment => comment && comment.line !== undefined && comment.line !== null)
                .map(comment => {
                    const lineNum = parseInt(comment.line) || 1; 

                    return {
                        range: new monacoRef.current.Range(lineNum, 1, lineNum, 1),
                        options: {
                            isWholeLine: true,
                            className: 'monaco-comment-highlight', 
                            glyphMarginClassName: 'monaco-comment-glyph',
                            hoverMessage: { value: `**${comment.username || 'User'}**: ${comment.text || 'No text'}` },
                            stickiness: 1 
                        }
                    };
                });

            commentDecorationsRef.current = editorRef.current.deltaDecorations(
                commentDecorationsRef.current, 
                newDecorations          
            );
        }
    }, [comments, editorRef]);

    // ✅ UPDATE FONT & WRAP OPTIONS
    useEffect(() => {
        if (editorRef && editorRef.current) {
            editorRef.current.updateOptions({
                fontSize: parseInt(fontSize),
                fontFamily: fontFamily,
                wordWrap: wordWrap ? 'on' : 'off'
            });
        }
    }, [fontSize, fontFamily, wordWrap, editorRef]); 

    // ✅ CUSTOM THEME DEFINITIONS
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
        <MonacoEditor
            height="100%"
            theme={theme}
            language={language}
            value={code} // 🚨 RESTORED: Reads the live code state from EditorPage
            onChange={handleEditorChange} // 🚨 ADDED: Broadcasts changes to Socket.io
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

export default React.memo(Editor);