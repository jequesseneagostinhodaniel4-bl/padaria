// PADARIA JEQUESSENE V2 - PROFISSIONAL - TUDO ADICIONADO
let token = localStorage.getItem('token') || '';
let ME = null, PRODS = [], EDIT_ID = null, FOTO_TEMP = '', FOTO_PERFIL = '';
function H(){ return {'Content-Type':'application/json','Authorization':'Bearer '+token}; }
async function api(u,m,b){ const r=await fetch(u,{method:m||'GET',headers:H(),body:b?JSON.stringify(b):undefined}); const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.detail||'Erro'); return d; }
function val(id){ return document.getElementById(id)?.value||''; }
function esc(s){ return String(s||'').replace(/'/g,"\\'"); }
function toast(m){ let t=document.getElementById('toast'); if(!t){ t=document.createElement('div'); t.id='toast'; t.style.cssText='position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:#1F150C;color:#fff;padding:12px 20px;border-radius:999px;z-index:999;font-weight:700'; document.body.appendChild(t);} t.innerText=m; t.style.display='block'; clearTimeout(t._h); t._h=setTimeout(()=>t.style.display='none',2600); }
function mostrarSec(id, btn){
  ['dashSec','pessoasSec','produtosSec','vendasSec','stockSec','fornecedorSec','encomendasSec','dividasSec','adminSec','historicoSec'].forEach(s=>document.getElementById(s)?.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
  document.querySelectorAll('.sidebar button[data-sec]').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  document.getElementById('sidebar')?.classList.remove('open');
}
function mostrar(id){ mostrarSec(id, document.querySelector(`[data-sec="${id}"]`)); }
function sair(){ localStorage.removeItem('token'); localStorage.removeItem('adminToken'); location.reload(); }
function voltarAdmin(){ const t=localStorage.getItem('adminToken'); if(t){ localStorage.setItem('token',t); localStorage.removeItem('adminToken'); location.reload(); } }
function lerFoto(e){ const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>FOTO_TEMP=rd.result; rd.readAsDataURL(f); }
function lerFotoPerfil(e){ const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ FOTO_PERFIL=rd.result; document.getElementById('perfilFotoPrev').src=FOTO_PERFIL; }; rd.readAsDataURL(f); }
async function login(){
  try{ const d=await api('/api/login','POST',{telefone:val('loginTel'),password:val('loginSenha')}); token=d.token; localStorage.setItem('token',token); await mostrarBoasVindas(); }
  catch(e){ document.getElementById('authMsg').innerText=e.message; }
}
async function registar(){
  try{ const d=await api('/api/register','POST',{nome:val('rNome'),telefone:val('rTel'),idade:parseInt(val('rIdade')||18),email:val('rEmail'),foto:'',pais:'Moçambique',bairro:val('rBairro'),tipo:val('rTipo'),password:val('rSenha')}); token=d.token; localStorage.setItem('token',token); await mostrarBoasVindas(); }
  catch(e){ document.getElementById('authMsg2').innerText=e.message; }
}
async function mostrarBoasVindas(){
  try{ ME=await api('/api/me'); }catch(e){ location.reload(); return; }
  document.getElementById('loginPage').classList.add('hidden');
  const w=document.getElementById('welcome'); w.classList.remove('hidden');
  document.getElementById('welcomeNome').innerText='Bem-vindo, '+ME.nome+'!';
  const hora=new Date().getHours();
  document.getElementById('welcomeTexto').innerText = hora<12 ? 'Bom dia! Pão fresco à tua espera.' : hora<18 ? 'Boa tarde! Vamos vender bem hoje.' : 'Boa noite! Vamos fechar o dia bem.';
  document.getElementById('welcomeFoto').src=ME.foto||'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200';
}
function entrarSistema(){ document.getElementById('welcome').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); carregarDados(); }
async function demitirPessoa(id,nome){ if(!confirm('Demitir '+nome+'? Perde acesso na hora.')) return; try{ const d=await api('/api/pessoas/'+id+'/demitir','POST',{}); toast(d.msg); carregarDados(); }catch(e){ alert(e.message); } }
async function reativarPessoa(id,nome){ if(!confirm('Reativar '+nome+'?')) return; try{ const d=await api('/api/pessoas/'+id+'/reativar','POST',{}); toast(d.msg); carregarDados(); }catch(e){ alert(e.message); } }
async function pagarDivida(id,cliente){ if(!confirm(cliente+' pagou?')) return; try{ await api('/api/vendas/'+id+'/pagar','POST',{}); toast('Dívida paga'); carregarDados(); }catch(e){ alert(e.message); } }
function abrirPerfil(){ document.getElementById('modalPerfil').classList.remove('hidden'); document.getElementById('perfilNome').value=ME?.nome||''; document.getElementById('perfilBairro').value=ME?.bairro||''; document.getElementById('perfilEmail').value=ME?.email||''; document.getElementById('perfilFotoPrev').src=ME?.foto||''; FOTO_PERFIL=''; }
function fecharPerfil(){ document.getElementById('modalPerfil').classList.add('hidden'); }
async function salvarPerfil(){
  try{ const d=await api('/api/me','PUT',{nome:val('perfilNome'),bairro:val('perfilBairro'),email:val('perfilEmail'),foto:FOTO_PERFIL}); toast('Perfil atualizado!'); fecharPerfil(); if(FOTO_PERFIL) ME.foto=FOTO_PERFIL; carregarDados(); }catch(e){ alert(e.message); }
}
async function mudarSenha(){ try{ await api('/api/me/senha','POST',{antiga:val('senhaAntiga'),nova:val('senhaNova')}); toast('Senha trocada!'); }catch(e){ alert(e.message); } }

// ===== GRÁFICO NOVO - IGUAL À FOTO - NÃO COLA MAIS =====
function desenharGraficoProf(dados){
  const box = document.getElementById('graficoProf');
  const labels = document.getElementById('graficoLabels');
  const txt = document.getElementById('resumoSemanaTxt');
  const semanaEl = document.getElementById('semanaTxt');
  if(!box || !dados || !dados.length) return;
  const maxV = Math.max(...dados.map(g=>g.vendas||0), 100);
  const total = dados.reduce((s,g)=>s+(g.vendas||0),0);
  const hojeV = dados[dados.length-1]?.vendas || 0;
  const melhor = Math.max(...dados.map(g=>g.vendas||0));
  if(txt) txt.innerText = `Total da semana: ${total} MT • Hoje: ${hojeV} MT • Melhor dia: ${melhor} MT`;
  if(semanaEl) semanaEl.innerText = 'Semana ' + dados[0].label + ' - ' + dados[dados.length-1].label;
  box.innerHTML = dados.map((g,i)=>{
    const v = g.vendas || 0;
    const isHoje = i === dados.length - 1;
    const h = v === 0 ? 28 : Math.max(28, Math.round((v / maxV) * 155));
    const cor = v === 0 ? '#D9D9D9' : isHoje ? '#111111' : '#E8B84B';
    return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%">
      <span style="font-size:12px;font-weight:700;color:#111;margin-bottom:8px;white-space:nowrap">${v} MT</span>
      <div style="width:100%;max-width:46px;height:${h}px;background:${cor};border-radius:8px 8px 3px 3px"></div>
    </div>`;
  }).join('');
  if(labels) labels.innerHTML = dados.map(g=>`<span style="flex:1;text-align:center">${g.label}</span>`).join('');
  const avatar = document.getElementById('dashAvatar');
  if(avatar && ME?.foto) avatar.src = ME.foto;
}

async function carregarDados(){
  if(!token) return;
  try{ ME=await api('/api/me'); }catch(e){ localStorage.removeItem('token'); token=''; location.reload(); return; }
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('saudacao').innerText='Olá, '+ME.nome;
  document.getElementById('infoUser').innerText=ME.tipo+' • '+ME.telefone;
  const foto=ME.foto||'';
  if(foto){ document.getElementById('meuAvatar').src=foto; document.getElementById('sideFoto').src=foto; }
  const isAdmin=ME.is_admin;
  const isFunc=ME.tipo==='Funcionário';
  const isCliente=ME.tipo==='Cliente';
  document.querySelectorAll('#menuGestao button, #tituloGestao').forEach(el=>{ el.style.display = isAdmin ? '' : 'none'; });
  if(isCliente){
    document.querySelectorAll('#menuOperacao button').forEach(b=>{ const s=b.getAttribute('data-sec'); if(!['produtosSec','encomendasSec'].includes(s)) b.style.display='none'; });
    const a=document.getElementById('avisoPerm'); a.classList.remove('hidden'); a.innerText='Como Cliente só podes ver produtos e encomendar.';
    mostrarSec('produtosSec', document.querySelector('[data-sec="produtosSec"]'));
  } else if(isFunc){ mostrarSec('vendasSec', document.querySelector('[data-sec="vendasSec"]')); }
  else { mostrarSec('dashSec', document.querySelector('[data-sec="dashSec"]')); }
  try{
    const dash=await api('/api/dashboard');
    // ===== DASHBOARD NOVO - IGUAL À FOTO =====
    const elV = document.getElementById('tVendas'); if(elV) elV.innerHTML = dash.semana.vendas + ' <small>MT</small>';
    const elL = document.getElementById('tLucro'); if(elL) elL.innerHTML = dash.semana.lucro + ' <small>MT</small>';
    const elC = document.getElementById('tClientes'); if(elC) elC.innerText = dash.totais.clientes;
    const elD = document.getElementById('tDividas'); if(elD) elD.innerHTML = dash.totais.dividas + ' <small>MT</small>';
    // CORRIGIDO: usa graficoProf, não o grafico velho
    desenharGraficoProf(dash.grafico);
    document.getElementById('maisVendidos').innerHTML=dash.mais_vendidos.map(m=>`<p>${m.produto} - ${m.qtd}</p>`).join('')||'Ainda sem vendas';
    document.getElementById('maisVendidosGrid').innerHTML=dash.mais_vendidos.map(m=>`<div class="prod-card"><b>${m.produto}</b><p>${m.qtd} vendidos</p></div>`).join('');
    document.getElementById('porPag').innerHTML=Object.entries(dash.por_pagamento).map(([k,v])=>`<p>${k}: ${v} MT</p>`).join('');
    document.getElementById('dashHoje').innerHTML=`<p>Hoje: ${dash.hoje.vendas} MT • Mês: ${dash.mes.vendas} MT</p>`;
  }catch(e){ console.log('dash erro', e); }
  try{
    PRODS=await api('/api/products');
    const q=val('pesquisaProd').toLowerCase();
    const lista=PRODS.filter(p=>p.nome.toLowerCase().includes(q));
    const imgAuto=(n)=>{ n=n.toLowerCase(); if(n.includes('bolo')) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400'; if(n.includes('pão')||n.includes('pao')) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'; if(n.includes('croissant')||n.includes('pastel')) return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400'; return 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400'; };
    document.getElementById('gridProd').innerHTML=lista.map(p=>`<div class="prod-card"><img src="${p.foto||imgAuto(p.nome)}"><b>${p.nome}</b><p>${p.categoria} • ${p.preco} MT</p><p>Stock: <b>${p.stock}</b> ${p.stock<=0?'ACABOU':p.stock<=5?'A ACABAR':''}</p><p class="muted">Lucro: ${p.preco-p.custo} MT</p><button class="btn" onclick="editarProd(${p.id})">Editar</button><button class="btn btn-green" onclick="venderRapido(${p.id})">Vender</button>${isAdmin?`<button class="btn btn-red" onclick="apagarProd(${p.id})">Apagar</button>`:''}</div>`).join('');
    document.getElementById('vProd').innerHTML=PRODS.map(p=>`<option value="${p.id}">${p.nome} - ${p.preco} MT (stock ${p.stock})</option>`).join('');
    document.getElementById('listaStock').innerHTML=PRODS.map(p=>`<p>${p.nome} - Stock <b>${p.stock}</b></p>`).join('');
    document.getElementById('alertaStock').innerText=PRODS.filter(p=>p.stock<=5).map(p=>p.nome).join(', ')||'Stock OK';
  }catch(e){}
  try{
    if(isAdmin){
      const pessoas=await api('/api/pessoas');
      document.getElementById('listaPessoas').innerHTML=pessoas.map(p=>{ const ativo=p.active!==false; const bot= isAdmin && p.id!==ME.id ? (ativo?`<button class="btn btn-red" onclick="demitirPessoa(${p.id},'${esc(p.nome)}')">Demitir</button>`:`<button class="btn btn-green" onclick="reativarPessoa(${p.id},'${esc(p.nome)}')">Reativar</button>`) : ''; return `<div class="linha">${p.foto?`<img src="${p.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover">`:''}<b>${p.nome}</b> - ${p.telefone} - ${p.tipo} ${ativo?'<span class="badge-ok">Ativo</span>':'<span class="badge-off">DEMITIDO</span>'} ${bot}</div>`; }).join('');
      const lt=document.getElementById('listaTroca'); if(lt) lt.innerHTML=pessoas.map(p=>`<button class="btn" onclick="document.getElementById('trocaTel').value='${p.telefone}'">${p.nome} - ${p.telefone}</button>`).join('');
    }
  }catch(e){}
  try{
    const fin=await api('/api/financeiro');
    if(isAdmin){ document.getElementById('listaVendas').innerHTML=fin.vendas.slice(0,30).map(v=>`<div class="linha">${v.data} ${v.hora} - ${v.produto} x${v.qtd} = ${v.total} MT - ${v.cliente} <button class="btn" onclick="baixarReciboVenda(${v.id})">🧾 Recibo</button></div>`).join(''); document.getElementById('listaDespesas').innerHTML=fin.despesas.map(d=>`<div class="linha">${d.descricao} - ${d.valor} MT</div>`).join(''); }
    document.getElementById('listaCompras').innerHTML=fin.compras.map(c=>`<div class="linha">${c.produto} x${c.qtd} = ${c.total} MT - ${c.fornecedor} <button class="btn" onclick="baixarReciboCompra(${c.id})">🧾 Recibo</button></div>`).join('');
    document.getElementById('listaDividas').innerHTML=fin.dividas.map(d=>`<div class="linha"><b>${d.cliente}</b> deve ${d.total} MT - ${d.produto} ${d.whatsapp_link?`<a href="${d.whatsapp_link}" target="_blank">WhatsApp</a>`:''} <button class="btn btn-green" onclick="pagarDivida(${d.id},'${esc(d.cliente)}')">Marcar pago</button></div>`).join('')||'Sem dívidas';
  }catch(e){}
  try{ const forn=await api('/api/fornecedores'); document.getElementById('listaForn').innerHTML=forn.map(f=>`<div class="linha"><b>${f.nome}</b> - ${f.produto} - ${f.preco} MT - ${f.telefone}</div>`).join(''); document.getElementById('cForn').innerHTML=forn.map(f=>`<option value="${f.id}">${f.nome}</option>`).join(''); }catch(e){}
  try{ const enc=await api('/api/encomendas'); document.getElementById('listaEnc').innerHTML=enc.map(e=>`<div class="linha"><b>${e.cliente}</b> - ${e.tipo} - ${e.preco} MT - ${e.estado} ${e.estado!=='Entregue'?`<button class="btn" onclick="entregarEnc(${e.id})">Entregar</button>`:''}</div>`).join(''); }catch(e){}
}
async function venderRapido(id){ document.getElementById('vProd').value=id; mostrarSec('vendasSec', document.querySelector('[data-sec="vendasSec"]')); toast('Produto escolhido'); }
async function salvarProd(){ const body={nome:val('pNome'),categoria:val('pCat'),preco:parseFloat(val('pPreco')||0),custo:parseFloat(val('pCusto')||0),stock:parseInt(val('pStock')||0),stock_minimo:5,foto:FOTO_TEMP}; if(!body.nome) return alert('Escreve nome'); try{ if(EDIT_ID) await api('/api/products/'+EDIT_ID,'PUT',body); else await api('/api/products','POST',body); EDIT_ID=null; FOTO_TEMP=''; document.getElementById('btnSalvarProd').innerText='Adicionar produto'; toast('Guardado'); carregarDados(); }catch(e){ alert(e.message); } }
function editarProd(id){ const p=PRODS.find(x=>x.id===id); if(!p) return; EDIT_ID=id; document.getElementById('pNome').value=p.nome; document.getElementById('pCat').value=p.categoria; document.getElementById('pPreco').value=p.preco; document.getElementById('pCusto').value=p.custo; document.getElementById('pStock').value=p.stock; document.getElementById('btnSalvarProd').innerText='Guardar edição'; mostrarSec('produtosSec', document.querySelector('[data-sec="produtosSec"]')); }
async function apagarProd(id){ if(!confirm('Apagar?')) return; try{ await api('/api/products/'+id,'DELETE'); carregarDados(); }catch(e){ alert(e.message); } }
async function addVenda(){
  try{
    const d=await api('/api/vendas','POST',{produto_id:parseInt(val('vProd')),qtd:parseInt(val('vQtd')||1),cliente:val('vCliente')||'Cliente Balcão',cliente_tel:val('vTel'),pagamento:val('vPag'),data_pagamento:val('vDataPag')});
    toast('Venda feita • '+d.total+' MT');
    if(confirm('Venda feita • '+d.total+' MT\nQueres baixar o recibo PDF?')){ baixarReciboVenda(d.venda_id); }
    if(d.whatsapp_link) window.open(d.whatsapp_link,'_blank');
    carregarDados();
  }catch(e){ alert(e.message); }
}
async function addDespesa(){ try{ await api('/api/despesas','POST',{descricao:val('sDesc'),valor:parseFloat(val('sValor')||0),categoria:val('sCat')}); toast('Despesa registada'); carregarDados(); }catch(e){ alert(e.message); } }
async function addForn(){ try{ await api('/api/fornecedores','POST',{nome:val('fNome'),telefone:val('fTel'),produto:val('fProd'),preco:parseFloat(val('fPreco')||0),localizacao:val('fLocal')}); toast('Fornecedor adicionado'); carregarDados(); }catch(e){ alert(e.message); } }
async function addCompra(){
  try{
    const d=await api('/api/compras','POST',{fornecedor_id:parseInt(val('cForn')),produto:val('cProd'),qtd:parseInt(val('cQtd')||1),preco_unitario:parseFloat(val('cPreco')||0),pagamento:val('cPag')});
    toast('Compra registada • '+d.total+' MT');
    if(confirm('Compra registada • '+d.total+' MT\nQueres baixar o recibo da compra?')){ baixarReciboCompra(d.compra_id); }
    carregarDados();
  }catch(e){ alert(e.message); }
}
async function addEnc(){ try{ await api('/api/encomendas','POST',{cliente:val('eCliente'),telefone:val('eTel'),tipo:val('eTipo'),data_entrega:val('eData'),preco:parseFloat(val('ePreco')||0),sinal:val('eSinal'),obs:val('eObs')}); toast('Encomenda registada'); carregarDados(); }catch(e){ alert(e.message); } }
async function entregarEnc(id){ try{ await api('/api/encomendas/'+id+'/entregar','POST',{}); carregarDados(); }catch(e){ alert(e.message); } }
async function carregarPainelAdmin(){ try{ const d=await api('/api/admin/painel'); document.getElementById('adminResumo').innerHTML=`<p>Vendas: ${d.resumo.total_vendas} MT • Lucro líquido: ${d.resumo.lucro_liquido_final} MT • Dívidas: ${d.resumo.dividas} MT</p>`; document.getElementById('adminVendas').innerHTML='<h3>Últimas vendas</h3>'+d.ultimas_vendas.map(v=>`<div class="linha">${v.data} ${v.hora} - ${v.produto} x${v.qtd} = ${v.total} MT - ${v.vendedor} <button class="btn" onclick="baixarReciboVenda(${v.id})">🧾 Recibo</button></div>`).join(''); document.getElementById('adminCompras').innerHTML='<h3>Últimas compras</h3>'+d.ultimas_compras.map(c=>`<div class="linha">${c.data} - ${c.produto} x${c.qtd} = ${c.total} MT <button class="btn" onclick="baixarReciboCompra(${c.id})">🧾 Recibo</button></div>`).join(''); document.getElementById('adminFluxo').innerHTML='<h3>Quem fez o quê</h3>'+d.fluxo.map(l=>`<div class="linha">${l.data} - ${l.quem} - ${l.acao} - ${l.detalhe}</div>`).join(''); }catch(e){ alert(e.message); } }
async function backup(){ try{ const d=await api('/api/backup'); const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup_padaria.json'; a.click(); }catch(e){ alert(e.message); } }
function abrirTroca(){ document.getElementById('modalTroca').classList.remove('hidden'); }
function fecharTroca(){ document.getElementById('modalTroca').classList.add('hidden'); }
async function trocarConta(){ try{ const d=await api('/api/admin/switch','POST',{target_telefone:val('trocaTel'),admin_password:val('trocaSenha')}); localStorage.setItem('adminToken',token); token=d.token; localStorage.setItem('token',token); location.reload(); }catch(e){ alert(e.message); } }
async function baixarComToken(url, nomeFicheiro){
  if(!token){ alert('Faz login de novo'); return; }
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(url + sep + 'token=' + encodeURIComponent(token), { headers: { 'Authorization': 'Bearer ' + token } });
  if(res.status === 401){ alert('Sessão expirada. Faz login de novo.'); return; }
  if(!res.ok){ alert('Erro ao baixar: ' + res.status); return; }
  const blob = await res.blob();
  const u = window.URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = u; a.download = nomeFicheiro;
  document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(u);
  toast('✅ Baixado: ' + nomeFicheiro);
}
async function fechoDia(){
  if(!token){ alert('Faz login de novo'); return; }
  try{
    const res = await fetch('/api/recibo/diario/json?token=' + encodeURIComponent(token), { headers: { 'Authorization': 'Bearer ' + token } });
    if(res.status === 401){ alert('Sessão expirada. Faz login de novo.'); return; }
    if(!res.ok){ alert('Erro fecho: ' + res.status); return; }
    const r = await res.json();
    let modal = document.getElementById('modalFecho');
    if(!modal){ modal = document.createElement('div'); modal.id='modalFecho'; modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px'; document.body.appendChild(modal); }
    modal.innerHTML = `<div style="background:#fff;width:100%;max-width:520px;max-height:90vh;overflow:auto;padding:22px;border-radius:16px;font-family:Arial">
      <div style="text-align:center"><h2>🍞 PADARIA JEQUESSENE</h2><p>Fecho do Dia - ${r.data}</p><hr style="border:1px dashed #ccc;margin:12px 0"></div>
      <p>Vendas Hoje: <b>${r.vendas_qtd} - ${r.vendas_total} MT</b></p>
      <p>Compras Hoje: <b>${r.compras_total} MT</b></p>
      <p>Despesas Hoje: <b>${r.despesas_total} MT</b></p>
      <p>M-Pesa: ${r.mpesa} MT | e-Mola: ${r.emola} MT | Dinheiro: ${r.dinheiro} MT</p>
      <h2 style="margin:12px 0">LUCRO LÍQUIDO: ${r.lucro_liquido} MT</h2>
      <hr style="border:1px dashed #ccc;margin:12px 0">
      <b>Vendas:</b><br>${r.vendas.map(v=>`${v.produto} x${v.qtd} - ${v.total} MT (${v.pagamento})`).join('<br>') || 'Sem vendas'}
      <br><br><b>Compras:</b><br>${r.compras.map(c=>`${c.produto} x${c.qtd} - ${c.total} MT (${c.fornecedor})`).join('<br>') || 'Sem compras'}
      <div style="display:flex;gap:8px;margin-top:16px"><button onclick="window.print()" style="flex:1;padding:12px;background:#111;color:#fff;border:none;border-radius:10px;cursor:pointer">🖨️ Imprimir Fecho</button><button onclick="document.getElementById('modalFecho').remove()" style="flex:1;padding:12px;border-radius:10px;border:1px solid #ddd;background:#fff;cursor:pointer">Fechar</button></div>
    </div>`;
    modal.style.display='flex';
  }catch(e){ alert('Erro fecho: ' + e.message); }
}
function exportarExcel(){ baixarComToken('/api/export/excel', 'padaria_jequessene.xlsx'); toast('A exportar Excel...'); }
function exportarCSV(){ baixarComToken('/api/export/csv', 'padaria_jequessene.csv'); toast('A exportar CSV...'); }
function baixarReciboVenda(id){ baixarComToken('/api/recibo/venda/'+id, 'recibo_venda_'+id+'.pdf'); }
function baixarReciboCompra(id){ baixarComToken('/api/recibo/compra/'+id, 'recibo_compra_'+id+'.pdf'); }
if(token){ carregarDados(); }
