// server.cjs
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Low, JSONFile } = require('lowdb');
const { nanoid } = require('nanoid');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --- LowDB setup ---
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const dbFile = path.join(dataDir, 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

function fmt(n) {
  return n.toLocaleString('en-PH');
}

function r(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- generate 500 transactions ---
function generatePool() {
  const pool = [];
  let id = 1;

  const easy = [
    ['Paid {amt} cash for rent','Rent Expense','Expense','Income Statement'],
    ['Received {amt} cash for services rendered','Service Revenue','Revenue','Income Statement'],
    ['Bought supplies {amt} cash','Supplies','Asset','Balance Sheet'],
    ['Paid salaries {amt}','Salaries Expense','Expense','Income Statement'],
    ['Owner invested {amt} cash into the business','Capital','Equity',"Owner's Equity"],
    ['Received {amt} cash from customer (payment on account)','Cash','Asset','Balance Sheet'],
    ['Paid {amt} for utilities','Utilities Expense','Expense','Income Statement'],
    ['Purchased small equipment {amt} cash','Equipment','Asset','Balance Sheet'],
    ['Received interest income {amt}','Interest Income','Revenue','Income Statement'],
    ['Withdrew {amt} for personal use','Drawing','Equity',"Owner's Equity"]
  ];

  const moderate = [
    ['Purchased inventory {amt} on account','Inventory','Asset','Balance Sheet'],
    ['Sold goods {amt} on account','Sales Revenue','Revenue','Income Statement'],
    ['Collected {amt} from accounts receivable','Cash','Asset','Balance Sheet'],
    ['Paid {amt} on accounts payable','Accounts Payable','Liability','Balance Sheet'],
    ['Paid {amt} cash for prepaid insurance','Prepaid Insurance','Asset','Balance Sheet'],
    ['Accrued salaries {amt}','Salaries Payable','Liability','Balance Sheet'],
    ['Received {amt} cash advance from customer','Unearned Revenue','Liability','Balance Sheet'],
    ['Paid bank service charge {amt}','Bank Charges Expense','Expense','Income Statement'],
    ['Sold equipment for {amt} cash (no gain/loss recorded)','Cash','Asset','Balance Sheet'],
    ['Recorded depreciation expense {amt}','Depreciation Expense','Expense','Income Statement']
  ];

  const hard = [
    ['Recognized amortization {amt}','Amortization Expense','Expense','Income Statement'],
    ['Write-off bad debt {amt} for an uncollectible account','Allowance for Doubtful Accounts','Asset','Balance Sheet'],
    ['Accrued interest payable {amt}','Interest Payable','Liability','Balance Sheet'],
    ['Reclassified portion of long-term note due within a year {amt}','Current Portion of Long-term Debt','Liability','Balance Sheet'],
    ['Adjusted supplies expense {amt} (used during period)','Supplies Expense','Expense','Income Statement'],
    ['Purchased equipment {amt} (paid {cash} cash and {onAcc} on account)','Equipment','Asset','Balance Sheet'],
    ['Received {amt} cash and recognized earned portion {earned}','Unearned Revenue','Liability','Balance Sheet'],
    ['Closing entry: close revenues to Income Summary {amt}','Income Summary','Equity',"Owner's Equity"],
    ['Correction of prior period error {amt} (adjust retained earnings)','Retained Earnings','Equity',"Owner's Equity"],
    ['Lease payment split: interest {interest} principal {principal}','Interest Expense','Expense','Income Statement']
  ];

  const fillPool = (arr, count, diffRange) => {
    for (let i = 0; i < count; i++) {
      const t = arr[i % arr.length];
      let amt = fmt(r(diffRange[0], diffRange[1]));
      let desc = t[0].replace('{amt}', '₱' + amt);
      desc = desc.replace('{cash}', '₱' + fmt(r(200, Math.floor(parseInt(amt.replace(/,/g, '')) / 2))));
      desc = desc.replace('{onAcc}', '₱' + fmt(r(200, Math.floor(parseInt(amt.replace(/,/g, '')) / 2))));
      desc = desc.replace('{earned}', '₱' + fmt(r(200, Math.floor(parseInt(amt.replace(/,/g, '')) / 2))));
      desc = desc.replace('{interest}', '₱' + fmt(r(50, Math.floor(parseInt(amt.replace(/,/g, '')) / 4))));
      desc = desc.replace('{principal}', '₱' + fmt(r(50, Math.floor(parseInt(amt.replace(/,/g, '')) / 3))));

      pool.push({
        id: id++,
        desc,
        account: t[1],
        type: t[2],
        statement: t[3],
        difficulty: t[0].includes('Recognized') ? 'Hard' : t[0].includes('Purchased') ? 'Moderate' : 'Easy',
        explanation_en: `${t[1]} (${t[2]}) behavior explanation.`,
        explanation_tl: `${t[1]} (${t[2]}) paliwanag.`
      });
    }
  };

  fillPool(easy, 200, [500, 15000]);
  fillPool(moderate, 200, [1500, 45000]);
  fillPool(hard, 100, [1000, 120000]);

  return pool;
}

// --- Initialize DB ---
async function initDB() {
  await db.read();
  db.data = db.data || { users: [], sets: null, history: [] };

  if (!db.data.sets) {
    console.log('Generating 500 transactions...');
    const pool = generatePool();
    const ids = pool.map(t => t.id);
    const sessions = [];
    const sessionSize = 100;

    for (let s = 0; s < 5; s++) {
      sessions.push(ids.slice(s * sessionSize, (s + 1) * sessionSize));
    }

    db.data.sets = { pool, ids, sessions, generatedAt: new Date().toISOString() };
    await db.write();
    console.log('Sets generated.');
  }
}

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Routes ---
app.get('/api/pool', async (req, res) => {
  await db.read();
  res.json({ pool: db.data.sets.pool });
});

app.get('/api/sets', async (req, res) => {
  await db.read();
  res.json({ sets: db.data.sets });
});

// --- Start server ---
initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch(err => console.error(err));
