require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function testGroqAPI() {
  console.log('🧪 Testing Groq API...');
  console.log('🔑 API Key:', process.env.GROQ_API_KEY ? 'Present (starts with: ' + process.env.GROQ_API_KEY.substring(0, 7) + '...)' : 'MISSING!');

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond with a simple JSON array.'
        },
        {
          role: 'user',
          content: 'Return this JSON array: [{"test": "success"}]'
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.5,
      max_tokens: 100
    });

    console.log('✅ API Response:', completion.choices[0]?.message?.content);
    console.log('✅ Groq API is working correctly!');
  } catch (error) {
    console.error('❌ API Error:', error.message);
    console.error('❌ Full Error:', error);
  }
}

testGroqAPI();