const API_KEY = 'AIzaSyBpFdlmTcFfQEi4Gf6Zi4VivW0ys8Ns1KU';
const models = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-pro'];

async function testModels() {
  for (const model of models) {
    console.log(`Testing model: ${model}...`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ Success with ${model}!`);
        return model;
      } else {
        console.log(`❌ Error with ${model}: ${data.error?.message || JSON.stringify(data)}`);
      }
    } catch (e) {
      console.log(`💥 Fetch failed for ${model}: ${e.message}`);
    }
  }
  return null;
}

testModels().then(workingModel => {
    if (workingModel) console.log("\nWORKING MODEL FOUND: " + workingModel);
    else console.log("\nNO WORKING MODEL FOUND.");
});
