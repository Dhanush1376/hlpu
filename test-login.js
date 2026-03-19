const url = "https://hlpu.onrender.com/api/auth/login";

async function check() {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "dhanushatmakuri@gmail.com", password: "password" })
        });
        const text = await res.text();
        console.log(`[${new Date().toISOString()}] Status: ${res.status} | Response: ${text}`);
        if (!text.includes("Server error\"}")) {
            console.log("Deployment live with new message!");
            process.exit(0);
        }
    } catch (e) {
        console.error(`[${new Date().toISOString()}] Fetch failed:`, e.message);
    }
}

setInterval(check, 10000);
check();
