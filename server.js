const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const db = new sqlite3.Database("database.db");

// ---------------- CUSTOMER TABLE ----------------
db.run(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    name TEXT,
    phone TEXT
)`);

// ---------------- TRANSACTION TABLE ----------------
db.run(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    fruit TEXT,
    quantity REAL,
    unit TEXT,
    rate REAL,
    amount REAL,
    type TEXT,
    date TEXT
)`);

// ---------------- ADD CUSTOMER ----------------
// Customer ID = last 3 digits of phone
app.post("/customer", (req, res) => {
    const { name, phone } = req.body;

    if (!phone || phone.length < 3) {
        return res.status(400).json({ error: "Phone must have at least 3 digits" });
    }

    const id = parseInt(phone.slice(-3));

    // Check if ID already exists
    db.get("SELECT id FROM customers WHERE id = ?", [id], (err, row) => {
        if (row) {
            return res.status(409).json({ error: `Customer ID ${id} already exists (same last 3 digits)` });
        }

        db.run(
            "INSERT INTO customers (id, name, phone) VALUES (?, ?, ?)",
            [id, name, phone],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, id });
            }
        );
    });
});

// ---------------- GET ALL CUSTOMERS ----------------
app.get("/customers", (req, res) => {
    db.all("SELECT * FROM customers ORDER BY name", [], (err, rows) => {
        res.json(rows || []);
    });
});

// ---------------- ADD TRANSACTION ----------------
app.post("/transaction", (req, res) => {
    const { customer_id, fruit, quantity, unit, rate, type, date } = req.body;

    const amount = Number(quantity) * Number(rate);
    const txDate = date || new Date().toISOString().split("T")[0];

    db.run(
        `INSERT INTO transactions 
        (customer_id, fruit, quantity, unit, rate, amount, type, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer_id, fruit, quantity, unit, rate, amount, type, txDate],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// ---------------- CUSTOMER REPORT (FIXED) ----------------
app.get("/customer/:key", (req, res) => {
    const key = req.params.key.trim();
    const numKey = parseInt(key);

    db.all(`
        SELECT 
            c.id,
            c.name,
            c.phone,
            t.id as txn_id,
            t.fruit,
            t.quantity,
            t.unit,
            t.rate,
            t.amount,
            t.type,
            t.date
        FROM customers c
        LEFT JOIN transactions t 
        ON c.id = t.customer_id
        WHERE c.id = ? OR c.name LIKE ?
        ORDER BY t.id DESC
    `, [numKey, `%${key}%`], (err, rows) => {

        if (err) {
            console.error(err);
            return res.json([]);
        }

        res.json(rows || []);
    });
});

// ---------------- BALANCE ----------------
app.get("/balance/:id", (req, res) => {
    const id = req.params.id;

    db.get(`
        SELECT 
        IFNULL(SUM(CASE WHEN type='borrow' THEN amount ELSE 0 END),0) AS total_borrow,
        IFNULL(SUM(CASE WHEN type='payment' THEN amount ELSE 0 END),0) AS total_payment,
        IFNULL(SUM(CASE WHEN type='borrow' THEN amount ELSE 0 END),0) -
        IFNULL(SUM(CASE WHEN type='payment' THEN amount ELSE 0 END),0) AS balance
        FROM transactions
        WHERE customer_id=?
    `, [id], (err, row) => {
        res.json(row || { balance: 0, total_borrow: 0, total_payment: 0 });
    });
});

// ---------------- DELETE TRANSACTION ----------------
app.delete("/transaction/:id", (req, res) => {
    db.run("DELETE FROM transactions WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ---------------- SERVER ----------------
app.listen(3000, () => {
    console.log("🔥 Server running on http://localhost:3000");
});