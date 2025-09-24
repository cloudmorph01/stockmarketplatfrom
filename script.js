/* ----------------------
   Demo data & utilities
   ---------------------- */
const STOCKS = [
  {symbol:'INFY', price:1330},
  {symbol:'TCS', price:3450},
  {symbol:'RELI', price:2300},
  {symbol:'HDFCBANK', price:1525},
  {symbol:'TATA', price:240},
  {symbol:'ANGELONE', price:48}
];

function saveState(){ localStorage.setItem('equiedge_state', JSON.stringify(state)) }
function loadState(){ const s = localStorage.getItem('equiedge_state'); return s ? JSON.parse(s) : null }

let state = loadState() || {
  cash:100000,
  portfolio:{}, // {symbol:{qty, avg}}
  txs:[],
  demat:null,
  watch:[]
};

// format
const rupee = v => '₹ ' + (Math.round(v*100)/100).toLocaleString();

/* ----------------------
   Market simulator
   ---------------------- */
function updateRandomPrices(){
  STOCKS.forEach(s=>{
    const change = (Math.random()-0.5) * 2; // -1..1
    s.price = Math.max(1, Math.round((s.price*(1 + change*0.01))*100)/100);
  });
  renderMarket();
  renderPortfolio();
}
setInterval(updateRandomPrices, 3000); // simulate every 3s

/* ----------------------
   Render functions
   ---------------------- */
function renderMarket(){
  const tbody = document.querySelector('#stockTable tbody');
  tbody.innerHTML = '';
  STOCKS.forEach(s=>{
    const row = document.createElement('tr');
    const change = ((Math.random()-0.5)*2).toFixed(2); // fake change display
    row.innerHTML = `
      <td><strong style="cursor:pointer" onclick="toggleWatch('${s.symbol}')">${s.symbol}</strong></td>
      <td>${rupee(s.price)}</td>
      <td class="stock-change ${change>0?'positive':'negative'}">${change}%</td>
      <td style="text-align:right">
        <button class="btn secondary" onclick="openTrade('${s.symbol}','buy')">Buy</button>
        <button class="btn" onclick="openTrade('${s.symbol}','sell')">Sell</button>
      </td>`;
    tbody.appendChild(row);
  });
}
function renderWatch(){
  const ul = document.getElementById('watchUl'); ul.innerHTML='';
  state.watch.forEach(sym=>{
    const li = document.createElement('li');
    li.innerHTML = `<span>${sym}</span><span>${rupee(getPrice(sym))}</span>`;
    ul.appendChild(li);
  });
}
function renderPortfolio(){
  const table = document.getElementById('portfolioTable');
  const tbody = table.querySelector('tbody');
  const empty = document.getElementById('portfolioEmpty');
  const keys = Object.keys(state.portfolio);
  if(keys.length===0){ table.style.display='none'; empty.style.display='block'; }
  else{
    table.style.display='table'; empty.style.display='none';
    tbody.innerHTML='';
    keys.forEach(sym=>{
      const p = state.portfolio[sym];
      const cur = getPrice(sym);
      const value = p.qty * cur;
      const pl = (cur - p.avg) * p.qty;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${sym}</td><td>${p.qty}</td><td>${rupee(p.avg)}</td><td>${rupee(value)}</td><td class="${pl>=0?'positive':'negative'}">${rupee(pl)}</td>
        <td><button class="btn secondary" onclick="sellAll('${sym}')">Sell All</button></td>`;
      tbody.appendChild(tr);
    });
  }
  document.getElementById('cashBal').textContent = rupee(state.cash);
}
function renderTx(){
  const ul = document.getElementById('txList'); ul.innerHTML='';
  if(state.txs.length===0) document.getElementById('txEmpty').style.display='block'; else document.getElementById('txEmpty').style.display='none';
  state.txs.slice().reverse().forEach(tx=>{
    const li = document.createElement('li');
    li.className='small';
    li.textContent = `${tx.time} — ${tx.type.toUpperCase()} ${tx.qty} ${tx.symbol} @ ${rupee(tx.price)} (₹${tx.total})`;
    ul.appendChild(li);
  });
}

/* ----------------------
   Helpers
   ---------------------- */
function getPrice(sym){ const s = STOCKS.find(x=>x.symbol===sym); return s? s.price: 0 }
function addTx(type,symbol,qty,price){
  const obj = {type,symbol,qty,price,total: Math.round(qty*price*100)/100, time: new Date().toLocaleString()};
  state.txs.push(obj); saveState(); renderTx();
}

/* ----------------------
   Trade logic
   ---------------------- */
function openTrade(symbol, mode){
  openModal('trade', {symbol, mode});
}
function openModal(kind, data){
  const mb = document.getElementById('modalBack'); const content = document.getElementById('modalContent');
  if(kind==='trade'){
    const s = data.symbol; const mode = data.mode;
    content.innerHTML = `<h3 style="margin-top:0">${mode.toUpperCase()} ${s}</h3>
      <div class="form-row"><label>Price (current)</label><input type="text" id="trade-price" value="${getPrice(s)}" disabled></div>
      <div class="form-row"><label>Quantity</label><input id="trade-qty" type="number" min="1" value="1"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" onclick="executeTrade('${s}','${mode}')">${mode==='buy'?'Buy':'Sell'}</button>
      </div>`;
  } else if(kind==='demat'){
    content.innerHTML = `<h3 style="margin-top:0">Open Demo Demat</h3>
      <p class="small">This stores a demo demat profile in browser storage.</p>
      <div class="form-row"><label>Full name</label><input id="md-name"></div>
      <div class="form-row"><label>Email</label><input id="md-email"></div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button class="btn secondary" onclick="closeModal()">Cancel</button>
        <button class="btn" onclick="createDematFromModal()">Create</button>
      </div>`;
  }
  mb.style.display='flex';
}
function closeModal(e){ if(e && e.target && e.target.id!=='modalBack') return; document.getElementById('modalBack').style.display='none' }

function executeTrade(symbol, mode){
  const qty = Number(document.getElementById('trade-qty').value);
  if(!qty || qty<=0) return alert('Enter valid qty');
  const price = getPrice(symbol);
  if(mode==='buy'){
    const total = qty * price;
    if(total > state.cash) return alert('Insufficient demo cash');
    state.cash -= total;
    if(!state.portfolio[symbol]) state.portfolio[symbol] = {qty:0, avg:0};
    const p = state.portfolio[symbol];
    p.avg = ((p.qty * p.avg) + total) / (p.qty + qty);
    p.qty += qty;
    addTx('buy',symbol,qty,price);
  } else { // sell
    const p = state.portfolio[symbol];
    if(!p || p.qty < qty) return alert('Not enough holdings to sell');
    const total = qty * price;
    p.qty -= qty;
    if(p.qty===0) delete state.portfolio[symbol];
    state.cash += total;
    addTx('sell',symbol,qty,price);
  }
  saveState(); renderPortfolio(); renderWatch(); closeModal();
}

/* sell all */
function sellAll(sym){
  const p = state.portfolio[sym];
  if(!p) return;
  const qty = p.qty; executeTrade(sym,'sell');
}

/* ----------------------
   Demat & withdraw
   ---------------------- */
function createDemat(){
  const name = document.getElementById('dm-name').value.trim();
  const email = document.getElementById('dm-email').value.trim();
  const phone = document.getElementById('dm-phone').value.trim();
  if(!name || !email) return alert('Name and email required');
  state.demat = {name,email,phone,created: new Date().toLocaleString()};
  saveState();
  alert('Demo Demat created');
  document.getElementById('withdraw').style.display='block';
}
function createDematFromModal(){
  const name = document.getElementById('md-name').value.trim();
  const email = document.getElementById('md-email').value.trim();
  if(!name || !email) return alert('Name and email required');
  state.demat = {name,email,created:new Date().toLocaleString()};
  saveState();
  alert('Demo Demat created');
  closeModal();
  document.getElementById('withdraw').style.display='block';
}

/* withdraw */
function withdrawMoney(){
  const amt = Number(document.getElementById('wd-amt').value);
  if(!state.demat) return alert('Open demat first');
  if(!amt || amt<=0) return alert('Enter valid amount');
  if(amt > state.cash) return alert('Insufficient demo balance');
  state.cash -= amt;
  addTx('withdraw','CASH',1,amt);
  saveState(); renderPortfolio(); alert('Withdrawal request processed (demo)');
}

/* ----------------------
   Watchlist toggle
   ---------------------- */
function toggleWatch(sym){
  const idx = state.watch.indexOf(sym);
  if(idx===-1) state.watch.push(sym); else state.watch.splice(idx,1);
  saveState(); renderWatch(); renderMarket();
}

/* ----------------------
   Init render
   ---------------------- */
function init(){
  renderMarket(); renderWatch(); renderPortfolio(); renderTx();
}
init();
