const API_URL = 'http://localhost:3333/api/chat';

async function verifyMemory() {
    console.log("Turn 1: Telling Masry my name...");
    const history = [{ role: 'user', parts: [{ text: "اسمي أحمد" }] }];
    
    const res1 = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "اسمي أحمد", history: history })
    });
    const data1 = await res1.json();
    console.log("Masry response:", data1.reply);
    
    // Update history for next turn
    history.push({ role: 'model', parts: [{ text: data1.reply }] });
    history.push({ role: 'user', parts: [{ text: "أنا قولتلك اسمي إيه؟" }] });

    console.log("\nTurn 2: Asking Masry to remember...");
    const res2 = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "أنا قولتلك اسمي إيه؟", history: history })
    });
    const data2 = await res2.json();
    console.log("Masry response:", data2.reply);
    
    if (data2.reply.includes("أحمد")) {
        console.log("\n✅ SUCCESS: Masry has a memory!");
    } else {
        console.log("\n❌ FAIL: Masry forgot...");
    }
}

verifyMemory();
