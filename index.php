// server.cjs
const express = require('express');
const path = require('path');
const fs = require('fs');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const { nanoid } = require('nanoid');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Ensure data folder exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// Ensure db.json exists
const dbFile = path.join(dataDir, 'db.json');
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, '{}', 'utf8');

// Setup lowdb
const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

// Utility functions
function r(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
function fmt(n){ return n.toLocaleString('en-PH'); }

function explain(account,type){
  if(type==='Asset') return `${account} is an asset — increases with Debit, decreases with Credit.`;
  if(type==='Liability') return `${account} is a liability — increases with Credit, decreases with Debit.`;
  if(type==='Equity') return `${account} is equity — usually increases with Credit, decreases with withdrawals.`;
  if(type==='Revenue') return `${account} is revenue — increases with Credit, appears on Income Statement.`;
  if(type==='Expense') return `${account} is an expense — increases with Debit, appears on Income Statement.`;
  return '';
}

function explain_tl(account,type){
  if(type==='Asset') return `${account} ay ari-arian — tumataas sa Debit, bumababa sa Credit.`;
  if(type==='Liability') return `${account} ay pananagutan — tumataas sa Credit, bumababa sa Debit.`;
  if(type==='Equity') return `${account} ay equity — karaniwang tumataas sa Credit, bumababa sa withdrawals.`;
  if(type==='Revenue') return `${account} ay kita — tumataas sa Credit, makikita sa Income Statement.`;
  if(type==='Expense') return `${account} ay gastos — tumataas sa Debit, makikita sa Income Statement.`;
  return '';
}

// Generate 500 transactions
function generatePool(){
  const pool=[];
  let id=1;
  const easy=[['Paid {amt} cash for rent','Rent Expense','Expense','Income Statement'],
              ['Received {amt} cash for services','Service Revenue','Revenue','Income Statement'],
              ['Bought supplies {amt} cash','Supplies','Asset','Balance Sheet'],
              ['Paid salaries {amt}','Salaries Expense','Expense','Income Statement'],
              ['Owner invested {amt} cash','Capital','Equity',"Owner's Equity"],
              ['Received {amt} cash from customer','Cash','Asset','Balance Sheet'],
              ['Paid for utilities {amt}','Utilities Expense','Expense','Income Statement'],
              ['Purchased equipment {amt} cash','Equipment','Asset','Balance Sheet'],
              ['Received interest income {amt}','Interest Income','Revenue','Income Statement'],
              ['Withdrew {amt} for personal use','Drawing','Equity',"Owner's Equity"]];
  const moderate=[['Purchased inventory {amt} on account','Inventory','Asset','Balance Sheet'],
                  ['Sold goods {amt} on account','Sales Revenue','Revenue','Income Statement'],
                  ['Collected {amt} from accounts receivable','Cash','Asset','Balance Sheet'],
                  ['Paid {amt} on accounts payable','Accounts Payable','Liability','Balance Sheet'],
                  ['Paid cash for prepaid insurance {amt}','Prepaid Insurance','Asset','Balance Sheet'],
                  ['Accrued salaries {amt}','Salaries Payable','Liability','Balance Sheet'],
                  ['Received cash advance from customer {amt}','Unearned Revenue','Liability','Balance Sheet'],
                  ['Paid bank service charge {amt}','Bank Charges Expense','Expense','Income Statement'],
                  ['Sold equipment for {amt} cash','Cash','Asset','Balance Sheet'],
                  ['Recorded depreciation expense {amt}','Depreciation Expense','Expense','Income Statement']];
  const hard=[['Recognized amortization {amt}','Amortization Expense','Expense','Income Statement'],
              ['Write-off bad debt {amt}','Allowance for Doubtful Accounts','Asset','Balance Sheet'],
              ['Accrued interest payable {amt}','Interest Payable','Liability','Balance Sheet'],
              ['Reclassified portion of long-term note due within a year {amt}','Current Portion of Long-term Debt','Liability','Balance Sheet'],
              ['Adjusted supplies expense {amt}','Supplies Expense','Expense','Income Statement']];

  for(let i=0;i<200;i++){
    const t=easy[i%easy.length];
    const amt=fmt(r(500,15000));
    pool.push({id:id++, desc:t[0].replace('{amt}','₱'+amt), account:t[1], type:t[2], statement:t[3], difficulty:'Easy', explanation_en:explain(t[1],t[2]), explanation_tl:explain_tl(t[1],t[2])});
  }
  for(let i=0;i<200;i++){
    const t=moderate[i%moderate.length];
    const amt=fmt(r(1500,45000));
    pool.push({id:id++, desc:t[0].replace('{amt}','₱'+amt), account:t[1], type:t[2], statement:t[3], difficulty:'Moderate', explanation_en:explain(t[1],t[2]), explanation_tl:explain_tl(t[1],t[2])});
  }
  for(let i=0;i<100;i++){
    const t=hard[i%hard.length];
    const amt=fmt(r(1000,120000));
    pool.push({id:id++, desc:t[0].replace('{amt}','₱'+amt), account:t[1], type:t[2], statement:t[3], difficulty:'Hard', explanation_en:explain(t[1],t[2]), explanation_tl:explain_tl(t[1],t[2])});
  }
  return pool;
}

// Initialize DB
async function initDB(){
  await db.read();
  db.data = db.data || { users: [], sets: null, history: [] };
  if(!db.data.sets){
    console.log('Generating 500 transactions...');
    const pool=generatePool();
    db.data.sets={ pool, generatedAt: new Date().toISOString() };
    await db.write();
    console.log('Generated.');
  }
}

// Serve frontend HTML with a simple table
app.get('/', async (req,res)=>{
  await db.read();
  const pool=db.data.sets.pool;
  let html=`<html><head><title>Stud.Rev</title>
    <style>
      body{font-family:sans-serif;margin:20px;}
      table{border-collapse:collapse;width:100%;}
      th,td{border:1px solid #ccc;padding:5px;text-align:left;}
      th{background:#eee;}
      tr:nth-child(even){background:#f9f9f9;}
    </style>
  </head><body>
  <h1>Stud.Rev 500 Transactions</h1>
  <table>
    <tr><th>ID</th><th>Description</th><th>Account</th><th>Type</th><th>Difficulty</th><th>Explanation (EN)</th><th>Explanation (TL)</th></tr>`;
  for(const t of pool){
    html+=`<tr>
      <td>${t.id}</td>
      <td>${t.desc}</td>
      <td>${t.account}</td>
      <td>${t.type}</td>
      <td>${t.difficulty}</td>
      <td>${t.explanation_en}</td>
      <td>${t.explanation_tl}</td>
    </tr>`;
  }
  html+=`</table></body></html>`;
  res.send(html);
});

// API endpoints
app.get('/api/pool', async (req,res)=>{
  await db.read();
  res.json(db.data.sets.pool);
});

app.post('/api/register', async (req,res)=>{
  const { email, password } = req.body;
  await db.read();
  if(db.data.users.find(u=>u.email===email)) return res.status(400).json({ ok:false, msg:'Email exists' });
  const user={ id:nanoid(8), email, password };
  db.data.users.push(user);
  await db.write();
  res.json({ ok:true, user:{ email } });
});

app.post('/api/login', async (req,res)=>{
  const { email, password } = req.body;
  await db.read();
  const user=db.data.users.find(u=>u.email===email && u.password===password);
  if(!user) return res.status(401).json({ ok:false, msg:'Invalid credentials' });
  res.json({ ok:true, user:{ email } });
});

// Start server
initDB().then(()=>{
  app.listen(PORT, ()=>console.log(`Stud.Rev running at http://localhost:${PORT}`));
}).catch(err=>console.error(err));
