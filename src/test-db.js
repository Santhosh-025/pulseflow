
const pool = require("./db");

async function testConnection() {
    try {
        const result = await pool.query("SELECT NOW()");
        console.log("PostgreSQL connected!", result.rows[0]);
    } catch (error) {
        console.error("Database connection failed:", error.message);
    } finally {
        await pool.end();
    }
}

testConnection();
