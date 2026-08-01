import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { get_question_by_topic_prompt } from "../data/prompts/questions.prompt.js";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";


dotenv.config();



const ai = new GoogleGenAI({
    apiKey : process.env.GEMINI_API_KEY
})

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const multiTopicBankPath = path.resolve(__dirname, "../data/questions/multitopic_cse.json");

export const get_local_question_bank = async (topic) => {
    const normalized = String(topic ?? "").trim().toLowerCase();
    if (!["multi-topic cse", "multi-topic cse curriculum", "cse curriculum"].includes(normalized)) {
        return null;
    }
    return JSON.parse(await fs.readFile(multiTopicBankPath, "utf-8"));
};

export const get_question_by_topic = async (topic ) => { 
    const localBank = await get_local_question_bank(topic);
    if (localBank) return localBank;
    //generating prompt
    const prompt = get_question_by_topic_prompt(topic);


    //generating questions
    const response = await ai.models.generateContent({
        model : "gemini-3.5-flash",
        contents : prompt,
    });

    //saving questions
    const generatedText = response.text;
    const questions = JSON.parse(generatedText);

    return questions;

    
}
