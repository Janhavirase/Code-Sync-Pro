import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import mongoose from "mongoose";
import 'dotenv/config';

// 1. Get native MongoDB collection
const getVectorCollection = () => {
    return mongoose.connection.db.collection("code_embeddings");
};

// 2. Initialize Gemini embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-2", 
    taskType: "RETRIEVAL_DOCUMENT",
    apiKey: process.env.GEMINI_API_KEY
});

/**
 * Splits a code file, generates vectors, and stores them in MongoDB.
 */
export const embedAndStoreFile = async (fileContent, language, metadata) => {
    try {
        if (typeof fileContent !== 'string' || !fileContent) {
            throw new Error("Invalid file content: Must be a non-empty string.");
        }

        const collection = getVectorCollection();
        const supportedLanguage = mapLanguageToLangchain(language);

        // HARDENED SPLITTER: Added explicit separators to prevent "includes" undefined error
        const splitter = RecursiveCharacterTextSplitter.fromLanguage(supportedLanguage, {
            chunkSize: 1000,
            chunkOverlap: 200,
            separators: ["\n\n", "\n", "function", "class", "export", " ", ""]
        });

        const rawDocuments = await splitter.createDocuments([fileContent], [metadata]);

        console.log(`Vectorizing ${metadata.fileName}: Split into ${rawDocuments.length} chunks.`);

        await MongoDBAtlasVectorSearch.fromDocuments(
            rawDocuments,
            embeddings,
            {
                collection,
                indexName: "default",
                textKey: "text",
                embeddingKey: "embedding",
            }
        );

        return { success: true, chunksCount: rawDocuments.length };
    } catch (error) {
        console.error("Error running RAG embedding pipeline:", error);
        throw error;
    }
};

/**
 * Searches the codebase using semantic similarity with security filtering.
 */
export const searchCodebase = async (userQuery, projectId) => {
    try {
        const collection = getVectorCollection();

        const vectorStore = new MongoDBAtlasVectorSearch(
            embeddings,
            {
                collection,
                indexName: "default",
                textKey: "text",
                embeddingKey: "embedding",
            }
        );

        // Semantic search with project-level isolation
        const searchResults = await vectorStore.similaritySearch(
            userQuery, 
            4, 
            { preFilter: { projectId: { $eq: projectId } } } 
        );

        return searchResults;
    } catch (error) {
        console.error("Error executing vector semantic search:", error);
        throw error;
    }
};

const mapLanguageToLangchain = (lang) => {
    const langMap = {
        'js': 'js', 'javascript': 'js', 'jsx': 'js',
        'ts': 'ts', 'tsx': 'ts',
        'python': 'python', 'py': 'python',
        'html': 'html', 'css': 'css', 'cpp': 'cpp', 'java': 'java'
    };
    return langMap[lang?.toLowerCase()] || 'js';
};