import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const EditLibraryItem = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ title: '', desc: '' });

    useEffect(() => {
        const fetchItem = async () => {
            try {
                const res = await fetch(`http://127.0.0.1:5000/api/library/${id}`);
                const data = await res.json();
                setFormData({ title: data.title, desc: data.desc });
            } catch (err) {
                toast.error("Failed to load contribution details");
            }
        };
        fetchItem();
    }, [id]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`http://127.0.0.1:5000/api/library/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success("Contribution updated! ✨");
                navigate('/profile'); // Go back to profile after success
            }
        } catch (err) {
            toast.error("Update failed");
        }
    };

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white flex items-center justify-center p-6">
            <form onSubmit={handleUpdate} className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/5 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Edit Contribution</h2>
                
                <div className="mb-4">
                    <label className="text-sm text-gray-400 block mb-2">Title</label>
                    <input 
                        className="w-full bg-[#252526] border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                </div>

                <div className="mb-6">
                    <label className="text-sm text-gray-400 block mb-2">Description</label>
                    <textarea 
                        className="w-full bg-[#252526] border border-white/10 rounded-lg p-3 h-32 outline-none focus:border-blue-500"
                        value={formData.desc}
                        onChange={(e) => setFormData({...formData, desc: e.target.value})}
                    />
                </div>

                <div className="flex gap-3">
                    <button type="button" onClick={() => navigate('/profile')} className="flex-1 bg-white/5 py-3 rounded-xl hover:bg-white/10 transition-all">Cancel</button>
                    <button type="submit" className="flex-1 bg-blue-600 py-3 rounded-xl font-bold hover:bg-blue-500 transition-all">Save Changes</button>
                </div>
            </form>
        </div>
    );
};

export default EditLibraryItem;