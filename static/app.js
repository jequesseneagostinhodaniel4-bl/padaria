// PADARIA JEQUESSENE - app.js COMPLETO PREMIUM + DEMITIR + O QUE FALTAVA
let token = localStorage.getItem('token') || '';
let ME = null;
let PRODS = [];
let EDIT_ID = null;
let FOTO_TEMP = '';

function H(){ return {'Content-Type':'application/json','Authorization':'Bearer '+token}; }
async function api(u,m,b){
  const r = await fetch(u,{method:m||'GET',headers:H(),body:b?JSON.stringify(b):undefined});
  const d = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.detail||'Erro');
  return d;
}
function val(id){ return document.getElementById(id)?.value || ''; }
function esc(s){ return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }

// --- O QUE FALTAVA 1: MENU LATERAL ---
function ativarMenu(btn){
  document.querySelectorAll('.sidebar button').forEach(b=>b.classList.remove('ativo'));
  if(btn) btn.classList.add('ativo');
}
function mostrar(id){
  ['dashSec','pessoasSec','produtosSec','vendasSec','stockSec','fornecedorSec','encomendasSec','dividasSec','adminSec'].forEach(s=>{
    document.getElementById(s)?.classList.add('hidden');
  });
  document.getElementById(id)?.classList.remove('hidden');
  window.scrollTo({top:0, behavior:'smooth'});
}

// --- O QUE FALTAVA 2: LOGIN / SENHA ---
function mostrarSenha(id, btn){ var el=document.getElementById(id); if(!el) return; if(el.type==='password'){el.type='text';btn.innerText='Esconder';} else {el.type='password';btn.innerText='Ver';} }
function mostrarLogin(){ document.getElementById('formLogin')?.classList.remove('hidden'); document.getElementById('formRegistar')?.classList.add('hidden'); document.getElementById('tabLogin')?.classList.add('active'); document.getElementById('tabRegisto')?.classList.remove('active'); }
function mostrarRegisto(){ document.getElementById('formLogin')?.classList.add('hidden'); document.getElementById('formRegistar')?.classList.remove('hidden'); document.getElementById('tabLogin')?.classList.remove('active'); document.getElementById('tabRegisto')?.classList.add('active'); }

// --- O QUE FALTAVA 3: TOAST BONITO ---
function toast(msg){
  let t = document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#2B1A0E;color:#fff;padding:12px 20px;border-radius:999px;z-index:9999;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.3)'; document.body.appendChild(t); }
  t.innerText=msg; t.style.display='block';
  clearTimeout(t._h); t._h=setTimeout(()=>t.style.display='none',2500);
}

function sair(){ localStorage.removeItem('token'); localStorage.removeItem('adminToken'); location.reload(); }
function voltarAdmin(){
  const t = localStorage.getItem('adminToken');
  if(t){ localStorage.setItem('token',t); localStorage.removeItem('adminToken'); location.reload(); }
}
function lerFoto(e, prevId){
  const f = e.target.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ()=>{ FOTO_TEMP = rd.result; if(prevId && document.getElementById(prevId)) document.getElementById(prevId).src = FOTO_TEMP; };
  rd.readAsDataURL(f);
}
async function login(){
  try{
    const d = await api('/api/login','POST',{telefone:val('loginTel'), password:val('loginSenha')});
    token=d.token; localStorage.setItem('token',token); location.reload();
  }catch(e){ const m=document.getElementById('authMsg'); if(m) m.innerText=e.message; else alert(e.message); }
}
async function registar(){
  try{
    const d = await api('/api/register','POST',{nome:val('rNome'), telefone:val('rTel'), idade:parseInt(val('rIdade')||18), email:val('rEmail'), foto:FOTO_TEMP, pais:val('rPais'), bairro:val('rBairro'), tipo:val('rTipo'), password:val('rSenha')});
    token=d.token; localStorage.setItem('token',token);
    alert(d.ja_tinha_conta ? 'Já tinhas conta, entraste!' : 'Conta criada!'); location.reload();
  }catch(e){ const m=document.getElementById('authMsg'); if(m) m.innerText=e.message; else alert(e.message); }
}
async function demitirPessoa(id, nome){
  if(!confirm('Demitir '+nome+'? Ele vai perder o acesso na hora!')) return;
  try{ const d = await api('/api/pessoas/'+id+'/demitir','POST',{}); toast(d.msg); carregarDados(); }
  catch(e){ alert(e.message); }
}
async function reativarPessoa(id, nome){
  if(!confirm('Reativar '+nome+'? Ele volta a ter acesso.')) return;
  try{ const d = await api('/api/pessoas/'+id+'/reativar','POST',{}); toast(d.msg); carregarDados(); }
  catch(e){ alert(e.message); }
}

// --- O QUE FALTAVA 4: PAGAR DIVIDA ---
async function pagarDivida(id, cliente){
  if(!confirm(cliente+' pagou? Marcar como Pago?')) return;
  try{ await api('/api/vendas/'+id+'/pagar','POST',{}); toast('Dívida paga ✅'); carregarDados(); }
  catch(e){ alert(e.message); }
}

async function carregarDados(){
  if(!token) return;
  try{ ME = await api('/api/me'); }
  catch(e){ localStorage.removeItem('token'); token=''; location.reload(); return; }
  document.getElementById('loginBg')?.classList.add('hidden');
  document.getElementById('app')?.classList.remove('hidden');
  document.getElementById('barra')?.classList.remove('hidden');
  if(document.getElementById('saudacao')) document.getElementById('saudacao').innerText = 'Olá, '+ME.nome;
  if(document.getElementById('infoUser')) document.getElementById('infoUser').innerText = ME.tipo + ' • ' + ME.telefone + ' • ' + ME.bairro;
  if(ME.foto && document.getElementById('meuAvatar')) document.getElementById('meuAvatar').src = ME.foto;
  if(localStorage.getItem('adminToken') && document.getElementById('btnVoltarAdmin')) document.getElementById('btnVoltarAdmin').style.display='flex';
  if(ME.tipo==='Cliente'){ const a=document.getElementById('avisoPerm'); if(a){ a.style.display='block'; a.innerText='Como Cliente só podes ver produtos e encomendar.'; } }

  try{
    const dash = await api('/api/dashboard');
    document.getElementById('tVendas').innerText = dash.semana.vendas + ' MT';
    document.getElementById('tLucro').innerText = dash.semana.lucro + ' MT';
    document.getElementById('tClientes').innerText = dash.totais.clientes;
    document.getElementById('tDividas').innerText = dash.totais.dividas + ' MT';
    document.getElementById('grafico').innerHTML = dash.grafico.map(g=>`<div class="bar" style="height:${Math.max(5, Math.min(100, g.vendas/50))}px" title="${g.vendas} MT"></div>`).join('');
    document.getElementById('graficoLabels').innerHTML = dash.grafico.map(g=>`<span>${g.label}</span>`).join('');
    document.getElementById('maisVendidos').innerHTML = dash.mais_vendidos.map(m=>`<p>${m.produto} - ${m.qtd}</p>`).join('') || 'Ainda sem vendas';
    document.getElementById('maisVendidosGrid').innerHTML = dash.mais_vendidos.map(m=>`<div class="prod-card"><b>${m.produto}</b><p>${m.qtd} vendidos</p></div>`).join('');
    document.getElementById('porPag').innerHTML = Object.entries(dash.por_pagamento).map(([k,v])=>`<p>${k}: ${v} MT</p>`).join('');
    document.getElementById('dashHoje').innerHTML = `<div class="kpi"><span>Hoje</span><b>${dash.hoje.vendas} MT</b></div><div class="kpi"><span>Mês</span><b>${dash.mes.vendas} MT</b></div>`;
  }catch(e){}

  try{
    PRODS = await api('/api/products');
    const q = val('pesquisaProd').toLowerCase();
    const lista = PRODS.filter(p=>p.nome.toLowerCase().includes(q));
    // Imagem automática se o produto não tiver foto - fica bonito tipo loja
    const imgAuto = (nome)=>{
      const n=nome.toLowerCase();
      if(n.includes('bolo')) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400';
      if(n.includes('pão')||n.includes('pao')) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400';
      if(n.includes('croissant')||n.includes('pastel')) return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400';
      if(n.includes('donut')||n.includes('cupcake')||n.includes('doce')) return 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400';
      if(n.includes('sumo')||n.includes('bebida')) return 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400';
      return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400';
    };
    document.getElementById('gridProd').innerHTML = lista.map(p=>`
      <div class="prod-card" style="border:${p.stock<=0?'2px solid red':p.stock<=5?'2px solid #ff9800':'1px solid #eee'}">
        <img src="${p.foto||imgAuto(p.nome)}" style="width:100%;height:140px;object-fit:cover;border-radius:12px" onerror="this.src='https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'">
        <b>${p.nome}</b><p>${p.categoria} • ${p.preco} MT</p>
        <p>Stock: <b>${p.stock}</b> ${p.stock<=0?'<span style="color:red">❌ ACABOU</span>':p.stock<=5?'<span style="color:#e67e00">⚠️ ESTÁ A ACABAR</span>':''}</p>
        <p class="muted">Lucro: ${p.preco-p.custo} MT</p>
        <button onclick="editarProd(${p.id})">Editar</button>
        <button onclick="venderRapido(${p.id})" style="background:#27ae60;color:#fff">Vender ⚡</button>
        ${ME.is_admin?`<button onclick="apagarProd(${p.id})" style="background:#c0392b;color:#fff">Apagar</button>`:''}
      </div>`).join('');
    document.getElementById('vProd').innerHTML = PRODS.map(p=>`<option value="${p.id}">${p.nome} - ${p.preco} MT (stock ${p.stock})</option>`).join('');
    document.getElementById('listaStock').innerHTML = PRODS.map(p=>`<p>${p.nome} - Stock <b>${p.stock}</b> ${p.stock<=0?'❌ ACABOU':p.stock<=5?'⚠️ ESTÁ A ACABAR':''}</p>`).join('');
    const esg = PRODS.filter(p=>p.stock<=0).map(p=>p.nome).join(', ');
    const aca = PRODS.filter(p=>p.stock>0 && p.stock<=5).map(p=>p.nome+' ('+p.stock+')').join(', ');
    document.getElementById('alertaStock').innerText = (esg? '❌ ACABOU: '+esg+' | ':'') + (aca? '⚠️ ESTÁ A ACABAR: '+aca : '') || 'Stock OK ✅';
  }catch(e){}

  try{
    const pessoas = await api('/api/pessoas');
    document.getElementById('listaPessoas').innerHTML = pessoas.map(p=>{
      const ativo = p.active !== false;
      let botoes = '';
      if(ME.is_admin && p.id !== ME.id){
        botoes = ativo
          ? `<button class="btn-demitir" onclick="demitirPessoa(${p.id}, '${esc(p.nome)}')">Demitir ⛔</button>`
          : `<button class="btn-reativar" onclick="reativarPessoa(${p.id}, '${esc(p.nome)}')">Reativar ✅</button>`;
      }
      return `<div class="linha" style="${!ativo?'opacity:0.6;background:#ffe0e0':''}">
        ${p.foto?`<img src="${p.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover">`:''}
        <b>${p.nome}</b> - ${p.telefone} - ${p.tipo} - ${p.bairro}
        ${ativo?'<span class="badge-ativo">Ativo</span>':'<span class="badge-demitido">DEMITIDO - Sem acesso</span>'}
        ${botoes}
      </div>`;
    }).join('');
    // Lista para Trocar de Conta
    const lt = document.getElementById('listaTroca');
    if(lt) lt.innerHTML = pessoas.map(p=>`<button onclick="document.getElementById('trocaTel').value='${p.telefone}'" style="margin:2px">${p.nome} - ${p.telefone}</button>`).join('');
  }catch(e){}
  try{
    const fin = await api('/api/financeiro');
    document.getElementById('listaVendas').innerHTML = fin.vendas.slice(0,50).map(v=>`<div class="linha">${v.data} ${v.hora} - ${v.produto} x${v.qtd} = ${v.total} MT - ${v.cliente} (${v.pagamento} - ${v.estado}) <a href="/api/recibo/venda/${v.id}" target="_blank">Recibo</a></div>`).join('');
    document.getElementById('listaDespesas').innerHTML = fin.despesas.map(d=>`<div class="linha">${d.descricao} - ${d.valor} MT - ${d.categoria}</div>`).join('');
    document.getElementById('listaCompras').innerHTML = fin.compras.map(c=>`<div class="linha">${c.produto} x${c.qtd} = ${c.total} MT - ${c.fornecedor} <a href="/api/recibo/compra/${c.id}" target="_blank">Recibo</a></div>`).join('');
    document.getElementById('listaDividas').innerHTML = fin.dividas.map(d=>`<div class="linha"><b>${d.cliente}</b> deve ${d.total} MT - ${d.produto} - Paga: ${d.data_pagamento||'---'} ${d.whatsapp_link?`<a href="${d.whatsapp_link}" target="_blank">📱 WhatsApp</a>`:''} <button onclick="pagarDivida(${d.id}, '${esc(d.cliente)}')" style="background:#27ae60;color:#fff">Marcar como Pago ✅</button></div>`).join('') || 'Sem dívidas ✅';
  }catch(e){}
  try{
    const forn = await api('/api/fornecedores');
    document.getElementById('listaForn').innerHTML = forn.map(f=>`<div class="linha"><b>${f.nome}</b> - ${f.produto} - ${f.preco} MT - ${f.telefone} - ${f.localizacao}</div>`).join('');
    document.getElementById('cForn').innerHTML = forn.map(f=>`<option value="${f.id}">${f.nome}</option>`).join('');
  }catch(e){}
  try{
    const enc = await api('/api/encomendas');
    document.getElementById('listaEnc').innerHTML = enc.map(e=>`<div class="linha"><b>${e.cliente}</b> - ${e.tipo} - ${e.preco} MT - Entrega ${e.data_entrega} - ${e.estado} ${e.estado!=='Entregue'?`<button onclick="entregarEnc(${e.id})">Entregar</button>`:''} <a href="${e.whatsapp_link}" target="_blank">WhatsApp</a></div>`).join('');
  }catch(e){}
}

// --- O QUE FALTAVA 5: VENDER RÁPIDO NO CARD ---
async function venderRapido(id){
  const p = PRODS.find(x=>x.id===id); if(!p) return;
  document.getElementById('vProd').value = id;
  mostrar('vendasSec');
  toast('Escolhido: '+p.nome+' - só cola cliente e clica Vender');
}

async function salvarProd(){
  const body = {nome:val('pNome'), categoria:val('pCat'), preco:parseFloat(val('pPreco')||0), custo:parseFloat(val('pCusto')||0), stock:parseInt(val('pStock')||0), stock_minimo:5, foto:FOTO_TEMP};
  if(!body.nome) return alert('Escreve nome do produto');
  try{
    if(EDIT_ID) await api('/api/products/'+EDIT_ID,'PUT',body);
    else await api('/api/products','POST',body);
    EDIT_ID=null; FOTO_TEMP=''; document.getElementById('btnSalvarProd').innerText='Adicionar Produto';
    toast('Guardado! ✅'); carregarDados();
  }catch(e){ alert(e.message); }
}
function editarProd(id){
  const p = PRODS.find(x=>x.id===id); if(!p) return;
  EDIT_ID=id;
  document.getElementById('pNome').value=p.nome; document.getElementById('pCat').value=p.categoria;
  document.getElementById('pPreco').value=p.preco; document.getElementById('pCusto').value=p.custo; document.getElementById('pStock').value=p.stock;
  document.getElementById('btnSalvarProd').innerText='Guardar Edição';
  mostrar('produtosSec'); window.scrollTo(0,0);
}
async function apagarProd(id){
  if(!confirm('Apagar produto?')) return;
  try{ await api('/api/products/'+id,'DELETE'); carregarDados(); }catch(e){ alert(e.message); }
}
async function addVenda(){
  try{
    const d = await api('/api/vendas','POST',{produto_id:parseInt(val('vProd')), qtd:parseInt(val('vQtd')||1), cliente:val('vCliente')||'Cliente Balcão', cliente_tel:val('vTel'), pagamento:val('vPag'), data_pagamento:val('vDataPag')});
    toast('Venda feita! Total '+d.total+' MT ✅');
    if(d.whatsapp_link) window.open(d.whatsapp_link,'_blank');
    carregarDados();
  }catch(e){ alert(e.message); }
}
async function addDespesa(){
  try{ await api('/api/despesas','POST',{descricao:val('sDesc'), valor:parseFloat(val('sValor')||0), categoria:val('sCat')}); toast('Saída registada'); carregarDados(); }catch(e){ alert(e.message); }
}
async function addForn(){
  try{ await api('/api/fornecedores','POST',{nome:val('fNome'), telefone:val('fTel'), produto:val('fProd'), preco:parseFloat(val('fPreco')||0), localizacao:val('fLocal')}); toast('Fornecedor adicionado'); carregarDados(); }catch(e){ alert(e.message); }
}
async function addCompra(){
  try{ const d = await api('/api/compras','POST',{fornecedor_id:parseInt(val('cForn')), produto:val('cProd'), qtd:parseInt(val('cQtd')||1), preco_unitario:parseFloat(val('cPreco')||0), pagamento:val('cPag')}); toast('Compra registada! Total '+d.total+' MT'); carregarDados(); }catch(e){ alert(e.message); }
}
async function addEnc(){
  try{ await api('/api/encomendas','POST',{cliente:val('eCliente'), telefone:val('eTel'), tipo:val('eTipo'), data_entrega:val('eData'), preco:parseFloat(val('ePreco')||0), sinal:val('eSinal'), obs:val('eObs')}); toast('Encomenda registada'); carregarDados(); }catch(e){ alert(e.message); }
}
async function entregarEnc(id){
  try{ await api('/api/encomendas/'+id+'/entregar','POST',{}); carregarDados(); }catch(e){ alert(e.message); }
}
async function carregarPainelAdmin(){
  try{
    const d = await api('/api/admin/painel');
    document.getElementById('adminResumo').innerHTML = `<p><b>Vendas:</b> ${d.resumo.total_vendas} MT | <b>Lucro Líquido:</b> ${d.resumo.lucro_liquido_final} MT | <b>Dívidas:</b> ${d.resumo.dividas} MT</p>`;
    document.getElementById('adminVendas').innerHTML = '<h3>Últimas Vendas</h3>' + d.ultimas_vendas.map(v=>`<div class="linha">${v.data} ${v.hora} - ${v.produto} x${v.qtd} = ${v.total} MT - ${v.vendedor}</div>`).join('');
    document.getElementById('adminCompras').innerHTML = '<h3>Últimas Compras</h3>' + d.ultimas_compras.map(c=>`<div class="linha">${c.data} - ${c.produto} x${c.qtd} = ${c.total} MT - ${c.fornecedor}</div>`).join('');
    document.getElementById('adminFluxo').innerHTML = '<h3>Quem fez o quê</h3>' + d.fluxo.map(l=>`<div class="linha">${l.data} - ${l.quem} - ${l.acao} - ${l.detalhe}</div>`).join('');
  }catch(e){ alert(e.message); }
}
async function backup(){
  try{ const d = await api('/api/backup'); const blob = new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup_padaria.json'; a.click(); }catch(e){ alert(e.message); }
}
function abrirTroca(){ document.getElementById('modalTroca')?.classList.remove('hidden'); }
function fecharTroca(){ document.getElementById('modalTroca')?.classList.add('hidden'); }
async function trocarConta(){
  try{
    const d = await api('/api/admin/switch','POST',{target_telefone:val('trocaTel'), admin_password:val('trocaSenha')});
    localStorage.setItem('adminToken', token);
    token=d.token; localStorage.setItem('token',token);
    location.reload();
  }catch(e){ alert(e.message); }
}
if(token){ carregarDados().catch(()=>{ localStorage.removeItem('token'); location.reload(); }); }
