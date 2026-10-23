
const express = require("express");
const pool = require("./db");

const app = express();
const PORT = 3000;
const MAX_RETRIES = 3;

app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// Shared processing logic
async function processEvent(client, eventId, simulateFailure = false) {
    if (simulateFailure) {
        throw new Error("Simulated processing failure");
    }

    await client.query(
        `UPDATE processed_events
         SET status = 'processed',
             error_message = NULL
         WHERE event_id = $1`,
        [eventId]
    );
}

// Receive a new webhook
app.post("/webhooks/payment", async (req, res) => {
    const { eventId, type, amount } = req.body;
    const simulateFailure = req.body.simulateFailure === true;

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

    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const result = await client.query(
            `INSERT INTO processed_events
                (event_id, event_type, amount)
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

        await processEvent(client, eventId, simulateFailure);
        await client.query("COMMIT");

        return res.status(201).json({
            message: "Event processed successfully",
            eventId
        });

    } catch (error) {
        if (client) {
            await client.query("ROLLBACK").catch(() => {});
        }

        console.error("Webhook processing failed:", error.message);

        try {
            await pool.query(
                `INSERT INTO processed_events
                    (event_id, event_type, amount, status, error_message)
                 VALUES ($1, $2, $3, 'failed', $4)
                 ON CONFLICT (event_id) DO NOTHING`,
                [eventId, type, amount, error.message]
            );
        } catch (dbError) {
            console.error("Could not save failed event:", dbError.message);
        }

        return res.status(500).json({
            error: "Internal server error"
        });

    } finally {
        if (client) client.release();
    }
});

// Retry an existing failed event
app.post("/webhooks/retry/:eventId", async (req, res) => {
    const { eventId } = req.params;
    let client;

    try {
        client = await pool.connect();
        await client.query("BEGIN");

        const result = await client.query(
            `SELECT event_id, status, retry_count
             FROM processed_events
             WHERE event_id = $1
             FOR UPDATE`,
            [eventId]
        );

        if (result.rowCount === 0) {
            await client.query("ROLLBACK");

            return res.status(404).json({
                error: "Event not found"
            });
        }

        const event = result.rows[0];

        if (event.status !== "failed") {
            await client.query("ROLLBACK");

            return res.status(409).json({
                error: "Only failed events can be retried",
                currentStatus: event.status
            });
        }

        if (event.retry_count >= MAX_RETRIES) {
            await client.query("ROLLBACK");

            return res.status(429).json({
                error: "Maximum retry attempts reached",
                eventId
            });
        }

        try {
            await processEvent(
                client,
                eventId,
                req.body.simulateFailure === true
            );

            await client.query(
                `UPDATE processed_events
                 SET retry_count = retry_count + 1
                 WHERE event_id = $1`,
                [eventId]
            );

            await client.query("COMMIT");

            return res.status(200).json({
                message: "Event retried successfully",
                eventId,
                status: "processed"
            });

        } catch (processingError) {
            // Record the failed retry and its count
            // in the same transaction.
            await client.query(
                `UPDATE processed_events
                 SET status = 'failed',
                     error_message = $2,
                     retry_count = retry_count + 1
                 WHERE event_id = $1`,
                [eventId, processingError.message]
            );

            await client.query("COMMIT");

            console.error("Retry failed:", processingError.message);

            return res.status(500).json({
                error: "Retry processing failed",
                eventId
            });
        }

    } catch (error) {
        if (client) {
            await client.query("ROLLBACK").catch(() => {});
        }

        console.error("Retry endpoint failed:", error.message);

        return res.status(500).json({
            error: "Internal server error"
        });

    } finally {
        if (client) client.release();
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`PulseFlow running on port ${PORT}`);
    });
}

module.exports = app;