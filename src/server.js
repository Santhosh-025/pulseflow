
const express = require("express");
const pool = require("./db");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});


app.post("/webhooks/payment", async (req, res) => {
    const { eventId, type, amount } = req.body;

    if (
        !eventId ||
        !type ||
        amount === undefined ||
        amount === null ||
        amount === "" ||
        !Number.isFinite(Number(amount)) ||
        Number(amount) < 0
    ) {
        return res.status(400).json({
            error: "Valid eventId, type, and non-negative amount are required"
        });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `INSERT INTO processed_events (event_id, event_type, amount)
             VALUES ($1, $2, $3)
             ON CONFLICT (event_id) DO NOTHING
             RETURNING event_id`,
            [eventId, type, amount]
        );

        if (result.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(200).json({
                message: "Duplicate event ignored",
                eventId
            });
        }

        await client.query(
            `UPDATE processed_events
             SET status = 'processed'
             WHERE event_id = $1`,
            [eventId]
        );

        await client.query("COMMIT");

        return res.status(201).json({
            message: "Event processed successfully",
            eventId
        });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});

        console.error("Webhook processing failed:", error.message);

        return res.status(500).json({
            error: "Internal server error"
        });
    } finally {
        client.release();
    }
});

app.listen(PORT, () => {
    console.log(`PulseFlow running on port ${PORT}`);
});