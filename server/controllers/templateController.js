const Template = require('../models/Template');

// 1. Create a Template
exports.createTemplate = async (req, res) => {
    try {
        const { title, desc, code, language, userId } = req.body;
        
        const newTemplate = new Template({
            title,
            desc,
            code,
            language,
            author: userId
        });

        await newTemplate.save();
        res.status(201).json(newTemplate);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 2. Get Templates (For specific user OR all public ones)
exports.getTemplates = async (req, res) => {
    try {
        const { userId } = req.query;
        
        // If userId is provided, get THEIR templates. 
        // If not, get ALL public templates (for a "Community" tab)
        const filter = userId ? { author: userId } : { isPublic: true };
        
        const templates = await Template.find(filter).sort({ createdAt: -1 });
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 3. Delete Template
exports.deleteTemplate = async (req, res) => {
    try {
        const { templateId } = req.params;
        await Template.findByIdAndDelete(templateId);
        res.json({ message: "Template deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};