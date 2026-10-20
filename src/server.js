
const express = require("express");

const app = express();
const PORT = 3000;

app.get("/health", (req, res) => {
    res.json({
        status: "ok"
    });
});

app.listen(PORT, () => {
    console.log(`PulseFlow running on port ${PORT}`);
});
