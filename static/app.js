// ===== PADARIA JEQUESSENE - APP.JS COMPLETO - TUDO JUNTO =====

// --- 1. TOKEN / LOGIN ---
function getToken(){ return localStorage.getItem('token') || ''; }
function setToken(t){ localStorage.setItem('token', t); }
function logout(){ localStorage.removeItem('token'); location.reload(); }

async function api(url, method='GET', body=null){
  const opt = { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() } };
  if(body) opt.body = JSON.stringify(body);
  const r = await fetch(url, opt);
  const d = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.detail || 'Erro');
  return d;
}

// --- 2. LOGIN / REGISTO ---
async function fazerLogin(){
  const tel = document.getElementById('loginTel')?.value || document.getElementById('telefone')?.value;
  const pass = document.getElementById('loginPass')?.value || document.getElementById('senha')?.value;
  if(!tel || !pass) return alert('Escreve telefone e senha');
  try{
    const d = await api('/api/login','POST',{telefone: tel, password: pass});
    setToken(d.token);
    alert('Bem-vindo, ' + d.user.nome);
    location.reload();
  }catch(e){ alert(e.message); }
}

async function fazerRegisto(){
  const nome = document.getElementById('regNome')?.value;
  const tel = document.getElementById('regTel')?.value;
  const pass = document.getElementById('regPass')?.value;
  if(!nome || !tel || !pass) return alert('Preenche nome, telefone e senha');
  try{
    const d = await api('/api/register','POST',{nome, telefone: tel, password: pass, tipo: document.getElementById('regTipo')?.value || 'Cliente'});
    setToken(d.token);
    alert(d.ja_tinha_conta ? 'Já tinhas conta, entraste direto!' : 'Conta criada!');
    location.reload();
  }catch(e){ alert(e.message); }
}

// --- 3. PRODUTOS ---
async function carregarProdutos(){
  const el = document.getElementById('listaProdutos');
  if(!el) return;
  try{
    const prods = await api('/api/products');
    el.innerHTML = prods.map(p => `
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;margin:8px 0;background:${p.stock<=0 ? '#ffe0e0' : p.stock<=5 ? '#fff3cd' : '#fff'}">
        <b>${p.nome}</b> - ${p.categoria}<br>
        Preço: <b>${p.preco} MT</b> | Stock: <b>${p.stock}</b>
        ${p.stock<=0 ? '<br><span style="color:red;font-weight:bold">❌ ACABOU</span>' : p.stock<=5 ? '<br><span style="color:#e67e00;font-weight:bold">⚠️ ESTÁ A ACABAR - só tem '+p.stock+'</span>' : ''}
        <br><button onclick="venderProduto(${p.id},'${p.nome}')" style="margin-top:8px;padding:8px 14px;border-radius:8px;background:#ff9800;color:#fff;border:none">Vender</button>
      </div>
    `).join('') || '<p>Sem produtos</p>';
  }catch(e){ el.innerHTML = '<p>Entra primeiro para ver produtos</p>'; }
}

async function venderProduto(id, nome){
  const qtd = prompt('Quantos '+nome+'?', '1');
  if(!qtd) return;
  const cliente = prompt('Nome do cliente?', 'Cliente Balcão') || 'Cliente Balcão';
  const pag = prompt('Pagamento? (M-Pesa / e-Mola / Dinheiro / Fiado)', 'M-Pesa') || 'M-Pesa';
  try{
    const d = await api('/api/vendas','POST',{produto_id: id, qtd: parseInt(qtd), cliente, pagamento: pag});
    let msg = 'Venda feita! Total: '+d.total+' MT';
    if(d.alerta_stock) msg += '\n\n' + d.alerta_stock;
    alert(msg);
    carregarProdutos();
    carregarAlertas();
    carregarDashboard();
  }catch(e){ alert(e.message); }
}

// --- 4. DASHBOARD ---
async function carregarDashboard(){
  const el = document.getElementById('dashboard');
  if(!el) return;
  try{
    const d = await api('/api/dashboard');
    el.innerHTML = `
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div style="background:#fff;padding:14px;border-radius:12px;flex:1">Hoje<br><b>${d.hoje.vendas} MT</b></div>
        <div style="background:#fff;padding:14px;border-radius:12px;flex:1">Semana<br><b>${d.semana.vendas} MT</b></div>
        <div style="background:#fff;padding:14px;border-radius:12px;flex:1">Mês<br><b>${d.mes.vendas} MT</b></div>
        <div style="background:#fff;padding:14px;border-radius:12px;flex:1">Dívidas<br><b style="color:red">${d.totais.dividas} MT</b></div>
      </div>`;
  }catch(e){}
}

// --- 5. ALERTAS DE STOCK 🔔 - ADMIN + FUNCIONARIO ---
async function carregarAlertas(){
  try{
    const token = getToken();
    if(!token) return;
    const r = await fetch('/api/alertas', {headers:{Authorization:'Bearer '+token}});
    const d = await r.json();
    let sino = document.getElementById('btnSino');
    if(!sino){
      sino = document.createElement('div');
      sino.id = 'btnSino';
      sino.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;background:#fff;border:2px solid #ff9800;border-radius:50px;padding:8px 14px;font-size:20px;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.2)';
      sino.onclick = function(){ const c=document.getElementById('caixaAlertas'); if(c) c.style.display = c.style.display==='none'?'block':'none'; };
      document.body.appendChild(sino);
      const caixa = document.createElement('div');
      caixa.id = 'caixaAlertas';
      caixa.style.cssText = 'position:fixed;top:60px;right:10px;z-index:9999;background:#fff3cd;border:2px solid #ff9800;padding:14px;border-radius:12px;max-width:320px;display:none';
      document.body.appendChild(caixa);
    }
    const caixa = document.getElementById('caixaAlertas');
    if(d.total > 0){
      sino.innerHTML = '🔔 <span style="background:red;color:#fff;border-radius:50%;padding:2px 7px;font-size:13px">'+d.total+'</span>';
      caixa.style.display = 'block';
      caixa.innerHTML = '<b>🔔 ALERTA DE STOCK</b><br><br>' + d.mensagens.join('<br><br>') + '<br><br><button onclick="document.getElementById(\'caixaAlertas\').style.display=\'none\'" style="padding:8px 14px;border-radius:8px">Fechar</button>';
    } else {
      sino.innerHTML = '🔔';
      if(caixa) caixa.style.display = 'none';
    }
    // Atualiza também o badge se já existir no HTML
    const badge = document.getElementById('numAlertas');
    if(badge){ badge.textContent = d.total; badge.style.display = d.total>0 ? 'inline' : 'none'; }
  }catch(e){}
}

function mostrarAlertas(){
  const c = document.getElementById('caixaAlertas');
  if(c) c.style.display = c.style.display==='none' ? 'block' : 'none';
}

// --- 6. INICIO AUTOMATICO ---
document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos();
  carregarDashboard();
  carregarAlertas();
  setInterval(carregarAlertas, 30000);
  setInterval(carregarProdutos, 30000);
});

// Se a página já carregou
carregarAlertas();
setInterval(carregarAlertas, 30000);
