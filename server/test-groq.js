require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function testGroqAPI() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 Testing Groq API Connection');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔑 API Key:', process.env.GROQ_API_KEY ? 
    `Present (${process.env.GROQ_API_KEY.substring(0, 10)}...)` : 
    '❌ MISSING!');

  if (!process.env.GROQ_API_KEY) {
    console.error('❌ Please set GROQ_API_KEY in your .env file');
    console.log('Get your API key from: https://console.groq.com/keys');
    return;
  }

  try {
    console.log('\n📤 Sending test request to Groq...');
    console.log('🤖 Model:', process.env.GROQ_MODEL || 'openai/gpt-oss-120b');
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond with a simple JSON array.'
        },
        {
          role: 'user',
          content: 'Return exactly this JSON: ["test", "success"]'
        }
      ],
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.5,
      max_tokens: 100
    });

    const response = completion.choices[0]?.message?.content;
    console.log('📥 Response:', response);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ Groq API is working correctly!');
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('\n❌ API Error:', error.message);
    
    if (error.message.includes('401') || error.message.includes('invalid')) {
      console.log('\n⚠️ Your API key appears to be invalid.');
      console.log('Please get a new key from: https://console.groq.com/keys');
    }
    
    if (error.message.includes('rate') || error.message.includes('limit')) {
      console.log('\n⚠️ Rate limit exceeded. Please wait and try again.');
    }
  }
}

testGroqAPI();