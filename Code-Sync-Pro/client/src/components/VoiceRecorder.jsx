import React, { useState } from 'react';
import toast from 'react-hot-toast';

const VoiceRecorder = ({ onTranscriptionComplete }) => {
    const [isListening, setIsListening] = useState(false);

    const startListening = () => {
        console.log("🎙️ [VoiceRecorder] Clicked! Attempting to initialize Speech Recognition...");
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("❌ [VoiceRecorder] SpeechRecognition object not found in window. This browser does not support Web Speech API.");
            toast.error("Browser unsupported! Please use Chrome, Edge, or Safari.");
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            
            // Configuration rules for clean single command inputs
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            // 1️⃣ Event triggered when the microphone formally turns on
            recognition.onstart = () => {
                console.log("🔊 [VoiceRecorder] Mic state: ACTIVE. Hardware is recording audio buffer...");
                setIsListening(true);
                toast('Listening for code command...', { icon: '🎙️', id: 'mic-status' });
            };

            // 2️⃣ Critical Error Interceptor (Catches permission/hardware blocks)
            recognition.onerror = (event) => {
                console.error("🚨 [VoiceRecorder] Speech Recognition Error Event:", event);
                setIsListening(false);
                
                // Explaining specific browser errors clearly to the user
                switch (event.error) {
                    case 'not-allowed':
                        toast.error("Permission Blocked! Click the padlock icon in your URL bar and allow microphone access.", { id: 'mic-status' });
                        break;
                    case 'no-speech':
                        toast.error("No speech detected. Please try speaking again.", { id: 'mic-status' });
                        break;
                    case 'network':
                        toast.error("Network link dropped during speech evaluation.", { id: 'mic-status' });
                        break;
                    default:
                        toast.error(`Mic Error: ${event.error}`, { id: 'mic-status' });
                }
            };

            // 3️⃣ Event triggered when processing stops
            recognition.onend = () => {
                console.log("🔇 [VoiceRecorder] Mic state: INACTIVE. Hardware capture session finished.");
                setIsListening(false);
            };
            
            // 4️⃣ Successful Audio Translation Processing
            recognition.onresult = (event) => {
                console.log("📝 [VoiceRecorder] Raw processing package received:", event);
                
                const transcript = event.results[0][0].transcript;
                console.log(`🗣️ [VoiceRecorder] Decoded Translation: "${transcript}"`);
                
                toast.success(`Captured: "${transcript}"`, { id: 'mic-status' });
                
                // Trigger your RAG/LLM generation cycle down in AIAnalysisPanel
                if (onTranscriptionComplete) {
                    onTranscriptionComplete(transcript);
                }
            };

            // Activating the browser engine
            recognition.start();

        } catch (error) {
            console.error("❌ [VoiceRecorder] Crash during engine initialization sequence:", error);
            toast.error("Failed to boot mic engine loop.");
        }
    };

    return (
        <button 
            type="button" 
            onClick={startListening} 
            disabled={isListening}
            className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                isListening 
                    ? 'bg-red-500/20 text-red-500 animate-pulse scale-105' 
                    : 'bg-transparent text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title={isListening ? "System is analyzing your voice input..." : "Activate Voice Command Engine"}
        >
            {isListening ? "🔴 Listening..." : "🎙️"}
        </button>
    );
};

export default VoiceRecorder;