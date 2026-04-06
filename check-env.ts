console.log("Environment keys:", Object.keys(process.env).filter(k => k.includes("API") || k.includes("KEY") || k.includes("GEMINI")));
