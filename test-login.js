(async () => {
    try {
        const res = await fetch("https://hlpu.onrender.com/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: "dhanushatmakuri@gmail.com", password: "password" })
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
})();
