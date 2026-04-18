const API_KEY = 'AIzaSyBpFdlmTcFfQEi4Gf6Zi4VivW0ys8Ns1KU';

async function findAnyWorkingModel() {
  const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
  const listData = await listRes.json();
  
  if (!listData.models) {
      console.log("Error listing models:", JSON.stringify(listData));
      return;
  }

  const modelNames = listData.models
    .filter(m => m.supportedGenerationMethods.includes('generateContent'))
    .map(m => m.name);

  console.log(`Found ${modelNames.length} models supporting generateContent. Testing top 10...`);

  for (const modelPath of modelNames.slice(0, 10)) {
    console.log(`Testing ${modelPath}...`);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`✅ SUCCESS WITH: ${modelPath}`);
        return modelPath;
      } else {
        console.log(`❌ FAIL ${modelPath}: ${data.error?.message || "Unknown error"}`);
      }
    } catch (e) {
      console.log(`💥 ERROR ${modelPath}: ${e.message}`);
    }
  }
}

findAnyWorkingModel();
