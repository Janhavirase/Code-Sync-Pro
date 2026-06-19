import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api.js';

const GithubCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        // 1. Grab the secret code GitHub put in the URL
        const code = searchParams.get('code');

        if (code) {
            // ✨ THE FIX: We define the variable FIRST, then log it!
            const returnPath = localStorage.getItem('returnPath');
            console.log("🕵️ BREADCRUMB FOUND:", returnPath); 

            // 2. Send the code to your backend to trade for the Access Token
            // ✅ PRODUCTION FIX: Using apiClient
            apiClient.post('/api/github/get-token', { code })
            .then(response => {
                const data = response.data;
                if (data.access_token) {
                    // 3. Save the golden ticket!
                    localStorage.setItem('github_token', data.access_token);
                    toast.success("GitHub Connected! You can now deploy.");
                    
                    // 4. Find the breadcrumb and route them back!
                    if (returnPath) {
                        localStorage.removeItem('returnPath'); // Clean up the trail
                        navigate(returnPath); // Boom! Right back to the editor room
                    } else {
                        navigate('/'); // Fallback if no breadcrumb was left
                    }

                } else {
                    throw new Error("No token received");
                }
            })
            .catch(err => {
                console.error(err);
                toast.error("GitHub authentication failed.");
                
                // Optional but great UX: Send them back to the editor even if it fails
                if (returnPath) {
                    localStorage.removeItem('returnPath');
                    navigate(returnPath);
                } else {
                    navigate('/');
                }
            });
        }
    }, [searchParams, navigate]);

    return (
        <div className="flex h-screen items-center justify-center bg-[#1a1a1a] text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl font-bold animate-pulse">Authenticating with GitHub...</p>
            </div>
        </div>
    );
};

export default GithubCallback;