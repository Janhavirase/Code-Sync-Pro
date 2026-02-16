import { useState, useEffect, useRef } from 'react';

const useEditorLayout = () => {
    const [layoutMode, setLayoutMode] = useState('bottom'); 
    const [consoleSize, setConsoleSize] = useState(250);
    const [isResizing, setIsResizing] = useState(false);
    
    // Use Ref to hold the current layout mode so the event listener always sees the latest value
    const layoutModeRef = useRef(layoutMode);
    
    useEffect(() => {
        layoutModeRef.current = layoutMode;
    }, [layoutMode]);

   const startResizing = (e) => {
        e.preventDefault();
        setIsResizing(true);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        
        // 🔒 LOCK UI: Prevent text selection & force cursor
        document.body.style.cursor = layoutModeRef.current === 'bottom' ? 'row-resize' : 'col-resize';
        document.body.style.userSelect = 'none'; 
        document.body.style.pointerEvents = 'none'; // Ignores all iframes/editors
    };

    const handleMouseMove = (e) => {
        if (layoutModeRef.current === 'bottom') {
            const newHeight = window.innerHeight - e.clientY;
            // Limit: Min 50px, Max 80% of screen
            if (newHeight > 50 && newHeight < window.innerHeight * 0.8) {
                setConsoleSize(newHeight);
            }
        } else {
            const newWidth = window.innerWidth - e.clientX;
            // Limit: Min 200px, Max 50% of screen
            if (newWidth > 200 && newWidth < window.innerWidth * 0.5) {
                setConsoleSize(newWidth);
            }
        }
    };
const stopResizing = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        
        // 🔓 UNLOCK UI
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
        document.body.style.pointerEvents = 'auto';
        
        // 🎨 Repaint Editor: Forces Monaco/CodeMirror to fit the new size
        window.dispatchEvent(new Event('resize')); 
    };

    return { layoutMode, setLayoutMode, consoleSize, setConsoleSize, isResizing, startResizing };
};

export default useEditorLayout;