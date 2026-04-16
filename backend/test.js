const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function testWorkingModel() {
    // USE THE KEY FROM YOUR CURL COMMAND
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Your curl mapped to Gemini 3, but for SDK stability, use this:
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    try {
        console.log("⏳ Testing with gemini-1.5-flash...");
        const result = await model.generateContent("Say 'System Online'");
        console.log("✅ Success:", result.response.text());
    } catch (err) {
        console.log("❌ 1.5-flash failed, trying 2.0-flash...");
        try {
            const model2 = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result2 = await model2.generateContent("Say 'System Online'");
            console.log("✅ Success with 2.0:", result2.response.text());
        } catch (err2) {
            console.error("🚨 Both failed. Error:", err2.message);
        }
    }
}

testWorkingModel();
