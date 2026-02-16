import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast'; // ✅ Added 'toast' for the logic
import React, { useEffect } from 'react'; // ✅ Added 'useEffect'
import { initSocket } from './socket'; // ✅ Added socket import

import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import ProfilePage from './pages/ProfilePage';
import EditLibraryItem from './pages/EditLibraryItem';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import LibraryPage from './pages/LibraryPage';

// Admin Imports
import AdminLayout from './pages/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminLibrary from './pages/Admin/AdminLibrary';
import UsersManager from './pages/Admin/UsersManager';
import SystemHealth from './pages/Admin/SystemHealth';

function App() {

    // ✅ GLOBAL LISTENER FOR SYSTEM ALERTS (Broadcasts + Config Changes)
    useEffect(() => {
        // 1. Define Broadcast Handler
        const handleSystemBroadcast = (data) => {
            toast.custom((t) => (
                <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#1a1a1a] border-l-4 border-red-500 shadow-2xl rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
                    <div className="flex-1 w-0 p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <span className="text-2xl">📢</span>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-red-400">
                                    SYSTEM ALERT
                                </p>
                                <p className="mt-1 text-sm text-gray-100">
                                    {data.message}
                                </p>
                                <p className="mt-2 text-xs text-gray-500">
                                    {new Date(data.time).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex border-l border-gray-700">
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-white focus:outline-none"
                        >
                            Close
                        </button>
                    </div>
                </div>
            ), { duration: 8000, position: 'top-center' });
        };

        // 2. Define Config Update Handler (Feature Flags)
        const handleConfigUpdate = (config) => {
            // Save new config to storage so other components can react
            localStorage.setItem('systemConfig', JSON.stringify(config));
            
            // Notify user about major state changes
            if (config.maintenanceMode) {
                toast.error("⚠️ System entering Maintenance Mode. Saves disabled.", { duration: 5000 });
            } else if (!config.enableCompiler) {
                toast("⚠️ Code Execution Engine disabled by admin.", { icon: '⚡', duration: 5000 });
            }
        };

        // 3. Connect Listeners
        const setupListener = async () => {
            try {
                const socket = await initSocket();
                socket.on('server:broadcast', handleSystemBroadcast);
                socket.on('server:configUpdate', handleConfigUpdate); // ✅ Listen for feature flags
            } catch (err) {
                console.error("Socket Init Failed in App:", err);
            }
        };

        setupListener();

        // 4. Cleanup
        return async () => {
            try {
                const socket = await initSocket();
                socket.off('server:broadcast', handleSystemBroadcast);
                socket.off('server:configUpdate', handleConfigUpdate);
            } catch (err) {
                console.error("Socket Cleanup Failed:", err);
            }
        };
    }, []);

    return (
        <>
            {/* Notifications component (sits on top of everything) */}
            <div>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        success: {
                            theme: {
                                primary: '#4ade80',
                            },
                        },
                    }}
                />
            </div>

            <BrowserRouter>
                <Routes>
                    {/* ADMIN ROUTES */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminDashboard />} /> {/* ✅ Added index to load Dashboard by default */}
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="health" element={<SystemHealth />} />
                        <Route path="users" element={<UsersManager />} />
                        <Route path="library" element={<AdminLibrary />} />
                    </Route>

                    {/* PUBLIC ROUTES */}
                    <Route path="/" element={<Home />}></Route>
                    <Route path="/auth" element={<Auth />}></Route>
                    <Route path="/dashboard" element={<Dashboard />}></Route>
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/library/edit/:id" element={<EditLibraryItem />} />
                    <Route
                        path="/editor/:roomId"
                        element={<EditorPage />}
                    ></Route>
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;