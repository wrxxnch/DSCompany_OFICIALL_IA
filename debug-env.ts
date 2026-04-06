import express from 'express';
const app = express();
console.log("All Env Vars:", Object.keys(process.env));
console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
if (process.env.GEMINI_API_KEY) {
  console.log("GEMINI_API_KEY length:", process.env.GEMINI_API_KEY.length);
  console.log("GEMINI_API_KEY prefix:", process.env.GEMINI_API_KEY.substring(0, 7));
}
