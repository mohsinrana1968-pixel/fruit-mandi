const API = "https://fruit-mandi-production.up.railway.app";
let txType = "borrow";

// ============ INIT ============
window.onload = () => {
    // Set today's date in header
    const now = new Date();
    document.getElementById("headerDate").textContent =
        now.toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    // Set default transaction date to today
    document.getElementById("txDate").value = now.toISOString().split("T")[0];

    loadCustomers();
};

// ============ TABS ============
function switchTab(name) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
    document.getElementById("tab-" + name).classList.add("active");
    event.target.classList.add("active");

    if (name === "customers") loadCustomers();
}

// ============ ID PREVIEW FROM PHONE ============
function previewId() {
    const phone = document.getElementById("phone").value.trim();
    const preview = document.getElementById("idPreview");
    if (phone.length >= 3) {
        const id = phone.slice(-3);
        preview.textContent = `✅ Customer ID will be: ${id}`;
    } else {
        preview.textContent = "";
    }
}

// ============ ADD CUSTOMER ============
function addCustomer() {
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const msg = document.getElementById("customerMsg");

    if (!name || !phone) {
        showMsg(msg, "⚠️ Please fill all fields", "error");
        return;
    }
    if (phone.length < 3) {
        showMsg(msg, "⚠️ Phone must have at least 3 digits", "error");
        return;
    }

    fetch(API + "/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showMsg(msg, "❌ " + data.error, "error");
        } else {
            showMsg(msg, `✅ Customer added! ID: ${data.id}`, "success");
            document.getElementById("name").value = "";
            document.getElementById("phone").value = "";
            document.getElementById("idPreview").textContent = "";
            loadCustomers();
        }
    })
    .catch(() => showMsg(msg, "❌ Server error", "error"));
}

// ============ LOAD CUSTOMERS ============
function loadCustomers() {
    const list = document.getElementById("customerList");
    list.innerHTML = '<div class="loading">Loading...</div>';

    fetch(API + "/customers")
    .then(res => res.json())
    .then(data => {
        if (!data.length) {
            list.innerHTML = `<div class="empty-state"><div>👤</div><div>No customers yet</div></div>`;
            return;
        }
        list.innerHTML = data.map(c => `
            <div class="cust-row" onclick="quickSearch(${c.id})">
                <div class="cust-row-avatar">${c.name.charAt(0).toUpperCase()}</div>
                <div class="cust-row-info">
                    <div class="cust-row-name">${c.name}</div>
                    <div class="cust-row-phone">📞 ${c.phone}</div>
                </div>
                <div class="cust-row-id">ID: ${c.id}</div>
            </div>
        `).join("");
    })
    .catch(() => {
        list.innerHTML = '<div class="empty-state"><div>⚠️</div><div>Could not load customers</div></div>';
    });
}

// Quick search from customer list
function quickSearch(id) {
    document.getElementById("search").value = id;
    switchTabDirect("report");
    setTimeout(() => searchCustomer(), 100);
}

function switchTabDirect(name) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab").forEach(el => el.classList.remove("active"));
    document.getElementById("tab-" + name).classList.add("active");
    document.querySelectorAll(".tab")[2].classList.add("active");
}

// ============ TYPE TOGGLE ============
function setType(t) {
    txType = t;
    document.getElementById("btn-borrow").classList.toggle("active", t === "borrow");
    document.getElementById("btn-payment").classList.toggle("active", t === "payment");
}

// ============ AMOUNT PREVIEW ============
function calcPreview() {
    const qty = parseFloat(document.getElementById("qty").value) || 0;
    const rate = parseFloat(document.getElementById("rate").value) || 0;
    const preview = document.getElementById("amountPreview");

    if (qty > 0 && rate > 0) {
        document.getElementById("previewAmt").textContent = (qty * rate).toLocaleString();
        preview.style.display = "block";
    } else {
        preview.style.display = "none";
    }
}

// ============ ADD TRANSACTION ============
function addTransaction() {
    const customer_id = document.getElementById("cid").value.trim();
    const fruit = document.getElementById("fruit").value.trim();
    const qty = document.getElementById("qty").value;
    const unit = document.getElementById("unit").value;
    const rate = document.getElementById("rate").value;
    const date = document.getElementById("txDate").value;
    const msg = document.getElementById("txMsg");

    if (!customer_id || !fruit || !qty || !rate) {
        showMsg(msg, "⚠️ Please fill all fields", "error");
        return;
    }

    fetch(API + "/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            customer_id,
            fruit,
            quantity: qty,
            unit,
            rate,
            type: txType,
            date
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showMsg(msg, "❌ " + data.error, "error");
        } else {
            showMsg(msg, "✅ Transaction saved!", "success");
            // Clear fields
            document.getElementById("fruit").value = "";
            document.getElementById("qty").value = "";
            document.getElementById("rate").value = "";
            document.getElementById("amountPreview").style.display = "none";
        }
    })
    .catch(() => showMsg(msg, "❌ Server error", "error"));
}

// ============ SEARCH CUSTOMER - FIXED ============
function searchCustomer() {
    const key = document.getElementById("search").value.trim();
    const msg = document.getElementById("reportMsg");

    if (!key) {
        showMsg(msg, "⚠️ Please enter a name or ID", "error");
        return;
    }

    // Fetch report data
    fetch(API + "/customer/" + encodeURIComponent(key))
    .then(res => res.json())
    .then(rows => {

        if (!rows || rows.length === 0) {
            showMsg(msg, "❌ No customer found", "error");
            document.getElementById("reportSection").style.display = "none";
            return;
        }

        msg.textContent = "";

        // Fill customer info from first row
        const first = rows[0];
        document.getElementById("custAvatar").textContent = first.name.charAt(0).toUpperCase();
        document.getElementById("custName").textContent = first.name;
        document.getElementById("custPhone").textContent = "📞 " + (first.phone || "-");
        document.getElementById("custIdShow").textContent = "ID: " + first.id;

        // Filter only rows with transactions
        const txRows = rows.filter(r => r.fruit !== null);

        // Build table
        const tbody = document.getElementById("report");
        if (!txRows.length) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:20px">No transactions yet</td></tr>`;
        } else {
            tbody.innerHTML = txRows.map((r, i) => `
                <tr>
                    <td style="color:#64748b;font-size:11px">${i + 1}</td>
                    <td style="font-weight:600">${r.fruit}</td>
                    <td>${r.quantity}</td>
                    <td>${r.unit}</td>
                    <td>Rs. ${Number(r.rate).toLocaleString()}</td>
                    <td style="font-weight:700">Rs. ${Number(r.amount).toLocaleString()}</td>
                    <td><span class="badge badge-${r.type}">${r.type === 'borrow' ? '💸 Borrow' : '✅ Paid'}</span></td>
                    <td style="color:#94a3b8;font-size:12px">${r.date}</td>
                </tr>
            `).join("");
        }

        document.getElementById("reportSection").style.display = "block";

        // Fetch balance for this customer ID
        fetch(API + "/balance/" + first.id)
        .then(r => r.json())
        .then(b => {
            document.getElementById("totalBorrow").textContent = "Rs. " + Number(b.total_borrow || 0).toLocaleString();
            document.getElementById("totalPayment").textContent = "Rs. " + Number(b.total_payment || 0).toLocaleString();
            const bal = Number(b.balance || 0);
            const balEl = document.getElementById("netBalance");
            balEl.textContent = "Rs. " + bal.toLocaleString();
            balEl.style.color = bal > 0 ? "var(--borrow)" : bal < 0 ? "var(--payment)" : "var(--accent)";
        });
    })
    .catch(err => {
        showMsg(msg, "❌ Server error: " + err.message, "error");
    });
}

// ============ UTILITY ============
function showMsg(el, text, type) {
    el.textContent = text;
    el.className = "msg " + type;
    setTimeout(() => {
        el.textContent = "";
        el.className = "msg";
    }, 4000);
}