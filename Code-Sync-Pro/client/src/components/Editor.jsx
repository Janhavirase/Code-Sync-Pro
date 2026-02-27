import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';

const Editor = ({ 
    onCodeChange, 
    code, 
    jumpToLine,
    theme = 'vs-dark', 
    language = 'javascript', 
    onLineSelect, 
    fontSize = 16,
    fontFamily = 'monospace',
    wordWrap = false,
    comments 
}) => {
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const [editorLoaded, setEditorLoaded] = useState(false);
    const decorationsRef = useRef([]);

    // 1. Handle Editor Mounting
    function handleEditorDidMount(editor, monaco) {
        editorRef.current = editor;
        monacoRef.current = monaco; 
        setEditorLoaded(true);

        // Sync local changes to parent
        editor.onDidChangeModelContent(() => {
            const currentCode = editor.getValue();
            onCodeChange(currentCode); 
        });

        // Track cursor for line selection
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

    // ✅ JUMP TO LINE LOGIC
    useEffect(() => {
        if (editorRef.current && jumpToLine) {
            const line = parseInt(jumpToLine);
            editorRef.current.revealLineInCenter(line);
            editorRef.current.setPosition({ lineNumber: line, column: 1 });
            editorRef.current.focus();
        }
    }, [jumpToLine]);

    // ✅ APPLY COMMENT HIGHLIGHTS (WITH SAFETY & STICKINESS)
    useEffect(() => {
        if (editorRef.current && monacoRef.current && Array.isArray(comments)) {
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
                            stickiness: 1 // NeverGrowsWhenTypingAtEdges
                        }
                    };
                });

            decorationsRef.current = editorRef.current.deltaDecorations(
                decorationsRef.current, 
                newDecorations          
            );
        }
    }, [comments]);

    // ✅ UPDATE FONT & WRAP OPTIONS
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({
                fontSize: parseInt(fontSize),
                fontFamily: fontFamily,
                wordWrap: wordWrap ? 'on' : 'off'
            });
        }
    }, [fontSize, fontFamily, wordWrap]); 

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

export default React.memo(Editor);