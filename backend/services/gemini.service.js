
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY;

let genAI = null;
let model = null;

if (API_KEY) {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
} else {
    console.warn("⚠️ GOOGLE_API_KEY is missing. Gemini service will not function.");
}

/**
 * Extract event details from HTML content using Gemini
 * @param {string} htmlContent - The raw HTML of the page
 * @param {string} url - The URL of the page (for context)
 * @returns {Promise<Object>} - The extracted event object
 */
export async function extractEventFromHtml(htmlContent, url) {
    if (!model) {
        throw new Error("Google Gemini API key is not configured.");
    }

    try {
        // Truncate HTML if it's massive (Gemini Pro has 32k context, 1.5 Pro has 1M+ but let's be safe/efficient)
        // A simplified approach is to take the body content or first 30000 chars if we are using Pro 1.0
        // But since we want to be robust, let's assume standard behavior.
        const truncatedHtml = htmlContent.length > 50000 ? htmlContent.substring(0, 50000) : htmlContent;

        const prompt = `
      You are an event extraction AI. I will provide you with HTML content from a webpage ("${url}").
      Your task is to extract the details of a single primary event found on this page.
      
      Return ONLY a JSON object with the following fields (no markdown formatting, just raw JSON):
      - title: String (Title of the contest/event)
      - description: String (A summary of the event)
      - start_time: String (ISO 8601 format if possible, or clear date string)
      - duration: String (e.g., "2 hours", "3h")
      - platform: String (The venue or platform name, e.g., "Codeforces", "AtCoder")
      - event_url: String (The link to the event, usually the one provided: "${url}")

      HTML Content:
      ${truncatedHtml}
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanText);

    } catch (error) {
        console.error("Gemini Extraction Error:", error);
        throw error;
    }
}
