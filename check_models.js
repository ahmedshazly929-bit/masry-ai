const API_KEY = 'AIzaSyBpFdlmTcFfQEi4Gf6Zi4VivW0ys8Ns1KU';
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`)
  .then(res => res.json())
  .then(data => {
    if (data.models) {
        console.log("Available Models:");
        data.models.forEach(m => console.log("- " + m.name));
    } else {
        console.log("No models found or Error:", JSON.stringify(data, null, 2));
    }
  }).catch(console.error);
