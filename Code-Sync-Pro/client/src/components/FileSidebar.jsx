import React, { useState,useRef } from 'react';
import { 
    FileIcon, Folder, FolderOpen, FileCode2, FileJson, 
    Image as ImageIcon, FileText, Plus, FolderPlus, Upload,
    MoreVertical, Trash2, Edit2, ChevronRight, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
const FileSidebar = ({ 
    items = [], 
    activeFileId, 
    onFileClick, 
    onCreateItem, 
    onBulkImport,
    onDeleteItem ,
    clients = [],        // 🚨 NEW: Receive the active users
    currentUser
}) => {
    // State to track which folders are open
    const [expandedFolders, setExpandedFolders] = useState(new Set(['root']));
    const [hoveredItemId, setHoveredItemId] = useState(null);
// ✨ NEW: Ref for Folder Import
    const fileInputRef = useRef(null);
    const toggleFolder = (folderId, e) => {
        e.stopPropagation();
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) next.delete(folderId);
            else next.add(folderId);
            return next;
        });
    };
// ✨ NEW: Folder Import Logic
    const handleFolderImport = async (e) => {
        const importedFiles = e.target.files;
        if (!importedFiles || importedFiles.length === 0) return;

        toast.loading("Parsing folder...", { id: 'importing' });

        const MAX_FILES = 50; 
        const MAX_FILE_SIZE = 1024 * 500; 
        let fileCount = 0;
        const newItems = [];
        const folderMap = {};

        const getLanguageFromExt = (name) => {
            const ext = name.split('.').pop().toLowerCase();
            const map = { js: 'javascript', py: 'python', java: 'java', c: 'c', cpp: 'cpp', html: 'html', css: 'css' };
            return map[ext] || 'plaintext';
        };

        for (let i = 0; i < importedFiles.length; i++) {
            const file = importedFiles[i];
            const pathParts = file.webkitRelativePath.split('/');

            if (pathParts.includes('node_modules') || pathParts.includes('.git') || pathParts.includes('dist')) continue;
            if (file.size > MAX_FILE_SIZE || file.type.includes('image') || file.type.includes('video')) continue;

            if (fileCount >= MAX_FILES) {
                toast.error(`Folder is massive. Stopped at ${MAX_FILES} safe files.`, { id: 'importing' });
                break;
            }

            let currentParentId = null;
            let currentPath = '';

            for (let j = 0; j < pathParts.length; j++) {
                const part = pathParts[j];
                currentPath = currentPath ? `${currentPath}/${part}` : part;

                if (j === pathParts.length - 1) {
                    try {
                        const content = await file.text();
                        newItems.push({
                            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                            name: part,
                            type: 'file',
                            parentId: currentParentId,
                            language: getLanguageFromExt(part),
                            value: content
                        });
                        fileCount++;
                    } catch (err) {
                        console.error(`Failed to read ${part}`);
                    }
                } else {
                    if (!folderMap[currentPath]) {
                        const newFolderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
                        folderMap[currentPath] = newFolderId;
                        newItems.push({
                            id: newFolderId,
                            name: part,
                            type: 'folder',
                            parentId: currentParentId,
                            language: null,
                            value: null
                        });
                    }
                    currentParentId = folderMap[currentPath]; 
                }
            }
        }

        if (newItems.length > 0 && onBulkImport) {
            onBulkImport(newItems);
            toast.success(`Imported ${fileCount} files successfully!`, { id: 'importing' });
        } else {
            toast.error("No valid files found.", { id: 'importing' });
        }
        e.target.value = null; 
    };
    // 🎨 Smart Icon Selector based on file extension
    const getFileIcon = (filename) => {
        if (filename.endsWith('.js') || filename.endsWith('.jsx')) return <FileCode2 size={14} className="text-yellow-400" />;
        if (filename.endsWith('.css')) return <FileCode2 size={14} className="text-blue-400" />;
        if (filename.endsWith('.java')) return <FileCode2 size={14} className="text-red-500" />;
        if (filename.endsWith('.py')) return <FileCode2 size={14} className="text-yellow-400" />;
        if (filename.endsWith('.c')) return <FileCode2 size={14} className="text-indigo-400" />;
        if (filename.endsWith('.html')) return <FileCode2 size={14} className="text-orange-400" />;
        if (filename.endsWith('.json')) return <FileJson size={14} className="text-green-400" />;
        if (filename.match(/\.(png|jpe?g|svg|gif)$/)) return <ImageIcon size={14} className="text-purple-400" />;
        return <FileText size={14} className="text-gray-400" />;
    };

    // 🌳 Recursive function to render the file tree beautifully
    const renderTree = (parentId = null, level = 0) => {
        const children = items.filter(item => item.parentId === parentId);
        
        // Sort: Folders first, then alphabetically
        children.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        return children.map(item => {
            const isFolder = item.type === 'folder';
            const isExpanded = expandedFolders.has(item.id);
            const isActive = activeFileId === item.id;
// 🚨 NEW: Find anyone looking at this specific file (excluding ourselves)
            const activeUsersInFile = clients.filter(c => 
                c.activeFile === item.name && c.username !== currentUser
            );
            return (
                <div key={item.id}>
                    <div 
                        onClick={(e) => isFolder ? toggleFolder(item.id, e) : onFileClick(item.id)}
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                        className={`flex items-center justify-between py-1 px-2 cursor-pointer transition-colors text-sm ${
                            isActive ? 'bg-[#37373d] text-white' : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
                        }`}
                        style={{ paddingLeft: `${(level * 12) + 8}px` }}
                    >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                            {/* Folder Chevron */}
                            {isFolder ? (
                                <span className="text-gray-500 hover:text-gray-300 transition-colors">
                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                </span>
                            ) : (
                                <span className="w-[14px]" /> // Spacer for alignment
                            )}
                            
                            {/* Icon */}
                            {isFolder ? (
                                isExpanded ? <FolderOpen size={14} className="text-blue-400" /> : <Folder size={14} className="text-blue-400" />
                            ) : (
                                getFileIcon(item.name)
                            )}
                            
                            <span className="truncate select-none tracking-wide">{item.name}</span>
                             {!isFolder && activeUsersInFile.length > 0 && (
                                <div className="flex -space-x-1.5 ml-1">
                                    {activeUsersInFile.map((u, i) => (
                                        <div 
                                            key={i} 
                                            className="w-4 h-4 rounded-full bg-indigo-500 border border-[#1e1e1e] flex items-center justify-center text-[8px] font-bold text-white shadow-sm" 
                                            title={`${u.username} is editing`}
                                        >
                                            {u.username?.charAt(0).toUpperCase()}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hover Actions (Delete) */}
                        {hoveredItemId === item.id && (
                           <div className="flex items-center gap-2 opacity-60 hover:opacity-100 pr-1">
        {/* 🆕 ONLY SHOW ADD ICONS IF IT'S A FOLDER */}
        {isFolder && (
            <>
                <Plus 
                    size={12} 
                    className="hover:text-green-400 transition-colors" 
                    title="New File in Folder"
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        // Open the folder automatically when adding a file
                        setExpandedFolders(prev => new Set(prev).add(item.id));
                        onCreateItem('file', item.id); // 🚨 Pass the parentId!
                    }} 
                />
                <FolderPlus 
                    size={12} 
                    className="hover:text-blue-400 transition-colors" 
                    title="New Folder in Folder"
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        setExpandedFolders(prev => new Set(prev).add(item.id));
                        onCreateItem('folder', item.id); // 🚨 Pass the parentId!
                    }} 
                />
            </>
        )}
                                <Trash2 
                                    size={12} 
                                    className="hover:text-red-400 transition-colors" 
                                    onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Render Children if Folder is Open */}
                    {isFolder && isExpanded && (
                        <div>{renderTree(item.id, level + 1)}</div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-[#2d2d2d] select-none w-64">
            {/* Header Area */}
            <div className="flex items-center justify-between px-4 py-3 text-xs font-bold text-gray-400 tracking-wider group">
                <span className="uppercase">Explorer</span>
               <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onCreateItem('file', null)} className="hover:text-white transition-colors" title="New File at Root">
                        <Plus size={14} />
                    </button>
                    <button onClick={() => onCreateItem('folder', null)} className="hover:text-white transition-colors" title="New Folder at Root">
                        <FolderPlus size={14} />
                    </button>
                   {/* ✨ NEW UPLOAD BUTTON ADDED HERE */}
                    <button onClick={() => fileInputRef.current?.click()} className="hover:text-white transition-colors" title="Import Folder">
                        <Upload size={14} />
                    </button>
                </div>
            </div>
{/* ✨ NEW HIDDEN INPUT FOR BULK UPLOAD ADDED HERE */}
            <input 
                type="file" 
                webkitdirectory="true" 
                directory="true" 
                multiple 
                style={{ display: 'none' }} 
                ref={fileInputRef} 
                onChange={handleFolderImport} 
            />
            {/* Tree Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
                {items.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10 text-xs px-4">
                        No files yet. Click the + icon above to start.
                    </div>
                ) : (
                    renderTree(null, 0)
                )}
            </div>
        </div>
    );
};

export default FileSidebar;