const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const db = new Database("database.db");

db.exec(`CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    name TEXT,
    phone TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS transactions (
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

app.post("/customer", (req, res) => {
    const { name, phone } = req.body;
    if (!phone || phone.length < 3)
        return res.status(400).json({ error: "Phone must have at least 3 digits" });

    const id = parseInt(phone.slice(-3));
    const existing = db.prepare("SELECT id FROM customers WHERE id = ?").get(id);
    if (existing)
        return res.status(409).json({ error: `Customer ID ${id} already exists` });

    db.prepare("INSERT INTO customers (id, name, phone) VALUES (?, ?, ?)").run(id, name, phone);
    res.json({ success: true, id });
});

app.get("/customers", (req, res) => {
    const rows = db.prepare("SELECT * FROM customers ORDER BY name").all();
    res.json(rows);
});

app.post("/transaction", (req, res) => {
    const { customer_id, fruit, quantity, unit, rate, type, date } = req.body;
    const amount = Number(quantity) * Number(rate);
    const txDate = date || new Date().toISOString().split("T")[0];
    const result = db.prepare(`
        INSERT INTO transactions (customer_id, fruit, quantity, unit, rate, amount, type, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customer_id, fruit, quantity, unit, rate, amount, type, txDate);
    res.json({ success: true, id: result.lastInsertRowid });
});

app.get("/customer/:key", (req, res) => {
    const key = req.params.key.trim();
    const numKey = parseInt(key) || 0;
    const rows = db.prepare(`
        SELECT c.id, c.name, c.phone,
            t.id as txn_id, t.fruit, t.quantity, t.unit, t.rate, t.amount, t.type, t.date
        FROM customers c
        LEFT JOIN transactions t ON c.id = t.customer_id
        WHERE c.id = ? OR c.name LIKE ?
        ORDER BY t.id DESC
    `).all(numKey, `%${key}%`);
    res.json(rows || []);
});

app.get("/balance/:id", (req, res) => {
    const row = db.prepare(`
        SELECT
        IFNULL(SUM(CASE WHEN type='borrow' THEN amount ELSE 0 END),0) AS total_borrow,
        IFNULL(SUM(CASE WHEN type='payment' THEN amount ELSE 0 END),0) AS total_payment,
        IFNULL(SUM(CASE WHEN type='borrow' THEN amount ELSE 0 END),0) -
        IFNULL(SUM(CASE WHEN type='payment' THEN amount ELSE 0 END),0) AS balance
        FROM transactions WHERE customer_id = ?
    `).get(req.params.id);
    res.json(row || { balance: 0, total_borrow: 0, total_payment: 0 });
});

app.delete("/transaction/:id", (req, res) => {
    db.prepare("DELETE FROM transactions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});