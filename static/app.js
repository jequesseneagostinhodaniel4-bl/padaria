let token = localStorage.getItem('token') || '';
let ME = null, PRODS = [], EDIT_ID = null, FOTO_TEMP = '', FOTO_PERFIL = '';
function H(){ return {'Content-Type':'application/json','Authorization':'Bearer '+token}; }
function atualizarTextoTema(preto){
  const b = document.getElementById('btn-tema'); if(b) b.innerText = preto ? 'Claro' : 'Escuro';
  const b2 = document.getElementById('btn-tema-login'); if(b2) b2.innerText = preto ? 'Claro' : 'Escuro';
}
async function aplicarTema(){
  let preto = localStorage.getItem('tema_jeq') === 'preto';
  if(token){
    try{ const r = await fetch('/api/tema', {headers: H()}); if(r.ok){ const d = await r.json(); preto = d.tema === 'preto'; localStorage.setItem('tema_jeq', d.tema); } }catch(e){}
  }
  document.body.classList.toggle('tema-preto', preto);
  document.documentElement.classList.toggle('tema-preto', preto);
  atualizarTextoTema(preto);
}
async function mudarTema(){
  const preto = !document.body.classList.contains('tema-preto');
  document.body.classList.toggle('tema-preto', preto);
  document.documentElement.classList.toggle('tema-preto', preto);
  localStorage.setItem('tema_jeq', preto ? 'preto' : 'branco');
  atualizarTextoTema(preto);
  if(token){ try{ await fetch('/api/tema?tema='+(preto?'preto':'branco'), {method:'POST', headers:H()}); }catch(e){} }
  toast(preto ? 'Modo Escuro ativado' : 'Modo Claro ativado');
}
async function api(u,m,b){
  const r=await fetch(u,{method:m||'GET',headers:H(),body:b?JSON.stringify(b):undefined});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.detail||'Erro');
  return d;
}
function val(id){ const el=document.getElementById(id); return el?el.value:''; }
function esc(s){ return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/"/g,'&quot;'); }
function toast(m){
  let t=document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.innerText=m; t.classList.add('show');
  clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2600);
}
function mostrarSec(id, btn){
  if(ME && (ME.is_admin || ME.tipo==='Funcionário')){
    if(id==='encomendasSec' || id==='minhasEncomendasSec'){
      alert('Admin / Funcionário não faz encomenda. Vê em Pedidos de Encomendas.');
      id='pedidosSec'; btn=document.querySelector('[data-sec="pedidosSec"]');
    }
  }
  if(ME && ME.tipo==='Cliente' && !ME.is_admin){
    const proibido=['dashSec','vendasSec','stockSec','dividasSec','adminSec','pessoasSec','fornecedorSec','historicoSec','pedidosSec','fichaSec','ingredientesSec'];
    if(proibido.includes(id)){
      alert('Como Cliente só podes ver Produtos e Encomendas.');
      id='produtosSec'; btn=document.querySelector('[data-sec="produtosSec"]');
    }
  }
  ['dashSec','pessoasSec','produtosSec','vendasSec','stockSec','fornecedorSec','encomendasSec','minhasEncomendasSec','pedidosSec','dividasSec','adminSec','historicoSec','fichaSec','ingredientesSec'].forEach(s=>{ const el=document.getElementById(s); if(el) el.classList.add('hidden'); });
  const target=document.getElementById(id); if(target) target.classList.remove('hidden');
  document.querySelectorAll('.sidebar button[data-sec]').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  const sb=document.getElementById('sidebar'); if(sb) sb.classList.remove('open');
  try{ history.pushState({page:id}, '', '#'+id); }catch(e){}
}
function mostrar(id){ mostrarSec(id, document.querySelector('[data-sec="'+id+'"]')); }
function sair(){ localStorage.removeItem('token'); localStorage.removeItem('adminToken'); location.reload(); }
function lerFoto(e){ const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>FOTO_TEMP=rd.result; rd.readAsDataURL(f); }
function lerFotoPerfil(e){ const f=e.target.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ FOTO_PERFIL=rd.result; document.getElementById('perfilFotoPrev').src=FOTO_PERFIL; }; rd.readAsDataURL(f); }
function mostrarLogin(){ document.getElementById('formLogin').classList.remove('hidden'); document.getElementById('formRegistar').classList.add('hidden'); document.getElementById('tabLogin').classList.add('on'); document.getElementById('tabRegisto').classList.remove('on'); }
function mostrarRegisto(){ document.getElementById('formLogin').classList.add('hidden'); document.getElementById('formRegistar').classList.remove('hidden'); document.getElementById('tabLogin').classList.remove('on'); document.getElementById('tabRegisto').classList.add('on'); }
function mostrarSenha(id,btn){ const el=document.getElementById(id); if(el.type==='password'){ el.type='text'; btn.innerText='Esconder'; }else{ el.type='password'; btn.innerText='Ver'; } }
function toggleMenu(){ document.getElementById('sidebar').classList.toggle('open'); }
async function login(){
  try{ const d=await api('/api/login','POST',{telefone:val('loginTel'),password:val('loginSenha')}); token=d.token; localStorage.setItem('token',token); await mostrarBoasVindas(); }catch(e){ document.getElementById('authMsg').innerText=e.message; }
}
async function registar(){
  try{ const d=await api('/api/register','POST',{nome:val('rNome'),telefone:val('rTel'),idade:parseInt(val('rIdade')||18),email:val('rEmail'),foto:'',pais:'Moçambique',bairro:val('rBairro'),tipo:val('rTipo'),password:val('rSenha')}); token=d.token; localStorage.setItem('token',token); await mostrarBoasVindas(); }catch(e){ document.getElementById('authMsg2').innerText=e.message; }
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
function entrarSistema(){
  const w=document.getElementById('welcome'); if(w) w.classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  carregarDados();
}
async function demitirPessoa(id,nome){
  if(ME.tipo==='Funcionário' && !ME.is_admin){ alert('Funcionário não pode demitir. Só Admin.'); return; }
  if(!confirm('Demitir '+nome+'?')) return;
  try{ const d=await api('/api/pessoas/'+id+'/demitir','POST',{}); toast(d.msg); carregarDados(); }catch(e){ alert(e.message); }
}
async function reativarPessoa(id,nome){
  if(!confirm('Reativar '+nome+'?')) return;
  try{ const d=await api('/api/pessoas/'+id+'/reativar','POST',{}); toast(d.msg); carregarDados(); }catch(e){ alert(e.message); }
}
async function pagarDivida(id,cliente){
  if(!confirm(cliente+' pagou?')) return;
  try{ await api('/api/vendas/'+id+'/pagar','POST',{}); toast('Dívida paga'); carregarDados(); }catch(e){ alert(e.message); }
}
function abrirPerfil(){
  document.getElementById('modalPerfil').classList.remove('hidden');
  document.getElementById('perfilNome').value=ME?.nome||'';
  document.getElementById('perfilBairro').value=ME?.bairro||'';
  document.getElementById('perfilEmail').value=ME?.email||'';
  document.getElementById('perfilFotoPrev').src=ME?.foto||'';
  FOTO_PERFIL='';
}
function fecharPerfil(){ document.getElementById('modalPerfil').classList.add('hidden'); }
async function salvarPerfil(){
  try{ await api('/api/me','PUT',{nome:val('perfilNome'),bairro:val('perfilBairro'),email:val('perfilEmail'),foto:FOTO_PERFIL}); toast('Perfil atualizado!'); fecharPerfil(); if(FOTO_PERFIL) ME.foto=FOTO_PERFIL; carregarDados(); }catch(e){ alert(e.message); }
}
async function mudarSenha(){
  try{ await api('/api/me/senha','POST',{antiga:val('senhaAntiga'),nova:val('senhaNova')}); toast('Senha trocada!'); }catch(e){ alert(e.message); }
}
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
  if(txt){ txt.innerText = 'Total da semana: '+total+' MT | Hoje: '+hojeV+' MT | Melhor dia: '+melhor+' MT'; }
  if(semanaEl) semanaEl.innerText = 'Semana ' + dados[0].label + ' - ' + dados[dados.length-1].label;
  box.innerHTML = dados.map((g,i)=>{
    const v = g.vendas || 0;
    const isHoje = i === dados.length - 1;
    const h = v === 0 ? 18 : Math.max(30, Math.round((v / maxV) * 150));
    let cls = 'barra-normal';
    if(v === 0) cls = 'barra-zero';
    if(isHoje && v > 0) cls = 'barra-hoje';
    return '<div class="grafico-col"><span class="grafico-valor">'+v+' MT</span><div class="grafico-barra '+cls+'" data-altura="'+h+'"></div></div>';
  }).join('');
  box.querySelectorAll('.grafico-barra').forEach(b=>{ b.style.height = b.dataset.altura + 'px'; });
  if(labels) labels.innerHTML = dados.map(g=>'<span class="grafico-label">'+g.label+'</span>').join('');
  const mini = document.getElementById('miniBarras');
  if(mini){
    mini.innerHTML = dados.map(g=>'<div class="mini-barra" data-altura="'+Math.max(12, Math.round(((g.vendas||0)/maxV)*70))+'"></div>').join('');
    mini.querySelectorAll('.mini-barra').forEach(b=>{ b.style.height = b.dataset.altura + 'px'; });
  }
  const mesV = window._mesVendas || total;
  const meta = window._metaObjetivo || 50000;
  const pct = Math.min(100, Math.round((mesV/meta)*100));
  const elMeta = document.getElementById('metaValor'); if(elMeta) elMeta.innerText = mesV + ' MT';
  const elPct = document.getElementById('metaPct'); if(elPct) elPct.innerText = pct + '%';
  const elMv = document.getElementById('metaVendas'); if(elMv) elMv.innerText = mesV + ' MT';
  const bar1 = document.getElementById('metaBar1'); if(bar1) bar1.style.width = pct + '%';
  const hj = document.getElementById('dashHojeValor'); if(hj) hj.innerText = hojeV + ' MT';
  const ms = document.getElementById('dashMesValor'); if(ms) ms.innerText = mesV + ' MT';
  const avatar = document.getElementById('dashAvatar'); if(avatar && ME?.foto) avatar.src = ME.foto;
}
function avatarCliente(foto, nome){
  if(foto) return '<img src="'+foto+'" class="avatar-cliente" alt="">';
  const ini=(nome||'?').trim().charAt(0).toUpperCase();
  return '<div class="avatar-inicial">'+ini+'</div>';
}
function atualizarPrecoEncomenda(){
  const nome = val('eTipo');
  const p = PRODS.find(x=>x.nome===nome);
  const box = document.getElementById('precoEncomendaBox'); if(!box) return;
  if(p) box.innerText = 'Preço: ' + p.preco + ' MT | Se personalizares muito, a Padaria confirma o preço final no WhatsApp.';
  else box.innerText = 'Preço: escolhe um produto para ver o preço';
}
function aplicarPermissoesCliente(){
  if(!ME) return;
  const isCliente = ME.tipo==='Cliente' && !ME.is_admin;
  const isFunc = ME.tipo==='Funcionário' && !ME.is_admin;
  document.body.classList.remove('user-admin','user-func','user-cliente');
  if(ME.is_admin) document.body.classList.add('user-admin');
  else if(isFunc) document.body.classList.add('user-func');
  else if(isCliente) document.body.classList.add('user-cliente');
  if(isCliente){
    const a=document.getElementById('avisoPerm');
    if(a){ a.classList.remove('hidden'); a.innerText='Como Cliente só podes ver produtos e encomendar. Pontos: '+(ME.pontos||0); }
  }
}
function addLinhaFicha(){
  const d=document.getElementById('fichaItens'); if(!d) return;
  d.insertAdjacentHTML('beforeend', '<div class="flex"><input placeholder="Ingrediente ex: Farinha" class="f-ing"><input type="number" placeholder="Qtd" class="f-qtd"><input placeholder="Kg/L/Un" class="f-un"><input type="number" placeholder="Custo MT" class="f-custo"></div>');
}
async function salvarFicha(){
  const pid=document.getElementById('fichaProd').value; if(!pid) return alert('Escolhe produto');
  const itens=[];
  document.querySelectorAll('#fichaItens > div').forEach(div=>{ itens.push({ingrediente:div.querySelector('.f-ing').value, qtd:div.querySelector('.f-qtd').value, unidade:div.querySelector('.f-un').value, custo:div.querySelector('.f-custo').value}); });
  const d=await api('/api/products/'+pid+'/ficha','POST',{itens}); toast(d.msg); carregarDados();
}
async function addIngrediente(){
  try{ await api('/api/ingredientes','POST',{nome:val('ingNome'), stock:parseFloat(val('ingStock')||0), validade:val('ingValidade')}); toast('Ingrediente adicionado'); carregarDados(); }catch(e){ alert(e.message); }
}
async function carregarIngredientesV21(){
  try{
    const ings=await api('/api/ingredientes');
    const el=document.getElementById('listaIngredientes');
    if(el){
      const hoje=new Date().toISOString().slice(0,10);
      el.innerHTML=ings.map(i=>{
        let badge = '<span class="badge-validade-ok">OK</span>';
        if(i.validade && i.validade < hoje) badge='<span class="badge-validade-vencido">VENCIDO</span>';
        else if(i.validade && i.validade <= new Date(Date.now()+3*86400000).toISOString().slice(0,10)) badge='<span class="badge-validade-aviso">A VENCER</span>';
        return '<div class="ingrediente-card"><span><b>'+i.nome+'</b> - Stock: <b>'+i.stock+' '+i.unidade+'</b> - Validade: '+(i.validade||'-')+'</span>'+badge+'</div>';
      }).join('') || 'Sem ingredientes';
    }
    const sel=document.getElementById('fichaProd'); if(sel) sel.innerHTML=PRODS.map(p=>'<option value="'+p.id+'">'+p.nome+'</option>').join('');
  }catch(e){}
}
async function carregarDados(){
  if(!token) return;
  aplicarTema();
  try{ ME=await api('/api/me'); }catch(e){ localStorage.removeItem('token'); token=''; location.reload(); return; }
  document.getElementById('loginPage').classList.add('hidden');
  const w=document.getElementById('welcome'); if(w) w.classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('saudacao').innerText='Olá, '+ME.nome+' | Pontos: '+(ME.pontos||0);
  document.getElementById('infoUser').innerText=ME.tipo+' | '+ME.telefone;
  const foto=ME.foto||''; if(foto){ document.getElementById('meuAvatar').src=foto; document.getElementById('sideFoto').src=foto; }
  const isAdmin=ME.is_admin; const isFunc=ME.tipo==='Funcionário'; const isCliente=ME.tipo==='Cliente' && !ME.is_admin;
  aplicarPermissoesCliente();
  const formAdd = document.getElementById('formAddProd'); if(formAdd) formAdd.classList.toggle('hidden', isCliente);
  const pPreco=document.getElementById('pPreco'); if(pPreco) pPreco.disabled = (isFunc && !isAdmin);
  const pCusto=document.getElementById('pCusto'); if(pCusto) pCusto.disabled = (isFunc && !isAdmin);
  const avisoCli = document.getElementById('avisoClienteProd'); if(avisoCli) avisoCli.classList.toggle('hidden', !isCliente);
  if(isCliente){ mostrarSec('produtosSec', document.querySelector('[data-sec="produtosSec"]')); }
  else if(isFunc){ mostrarSec('vendasSec', document.querySelector('[data-sec="vendasSec"]')); }
  else { mostrarSec('dashSec', document.querySelector('[data-sec="dashSec"]')); }
  if(!isCliente){
    try{
      const dash=await api('/api/dashboard');
      window._mesVendas = dash.mes.vendas;
      if(dash.meta) window._metaObjetivo = dash.meta.objetivo;
      const elV = document.getElementById('tVendas'); if(elV) elV.innerHTML = dash.semana.vendas + ' <small>MT</small>';
      const elL = document.getElementById('tLucro'); if(elL) elL.innerHTML = dash.semana.lucro + ' <small>MT</small>';
      const elC = document.getElementById('tClientes'); if(elC) elC.innerText = dash.totais.clientes;
      const elD = document.getElementById('tDividas'); if(elD) elD.innerHTML = dash.totais.dividas + ' <small>MT</small>';
      desenharGraficoProf(dash.grafico);
      const mvEl=document.getElementById('maisVendidos'); if(mvEl) mvEl.innerHTML=dash.mais_vendidos.map(m=>'<p class="linha-texto">'+m.produto+' - '+m.qtd+'</p>').join('')||'<p class="linha-texto">Ainda sem vendas</p>';
      const mvG=document.getElementById('maisVendidosGrid'); if(mvG) mvG.innerHTML=dash.mais_vendidos.map(m=>'<div class="prod-card"><b>'+m.produto+'</b><p>'+m.qtd+' vendidos</p></div>').join('');
      const pp=document.getElementById('porPag'); if(pp) pp.innerHTML=Object.entries(dash.por_pagamento).map(([k,v])=>'<p class="linha-texto">'+k+': '+v+' MT</p>').join('');
      const dh=document.getElementById('dashHoje'); if(dh) dh.innerHTML='<p>Hoje: '+dash.hoje.vendas+' MT | Mês: '+dash.mes.vendas+' MT</p>';
      const quemEl = document.getElementById('quemComprouGrid');
      if(quemEl){ quemEl.innerHTML = (dash.quem_comprou||[]).map(c=>'<div class="quem-card">'+avatarCliente(c.foto,c.cliente)+'<div class="quem-info"><b>'+c.cliente+'</b><br><small>Comprou: '+c.produto+' x'+c.qtd+'</small><br><b>'+c.total+' MT</b> | <small>'+c.pagamento+' | '+c.data+'</small></div></div>').join('') || '<p class="linha-texto">Ainda ninguém comprou. Faz a primeira venda!</p>'; }
      const encDash = document.getElementById('listaEncVendasDash');
      if(encDash){ encDash.innerHTML = (dash.vendas_encomendas||[]).map(v=>'<div class="linha">'+avatarCliente(v.foto,v.cliente)+'<span><b>'+v.cliente+'</b> comprou por encomenda: <b>'+v.produto+'</b> - '+v.total+' MT - '+v.data+'</span></div>').join('') || '<p class="linha-texto">Ainda nenhuma encomenda entregue.</p>'; }
    }catch(e){ console.log('dash erro', e); }
  }
  try{
    PRODS=await api('/api/products');
    const q=val('pesquisaProd').toLowerCase();
    const lista=PRODS.filter(p=>p.nome.toLowerCase().includes(q));
    const imgAuto=(n)=>{ n=n.toLowerCase(); if(n.includes('bolo')) return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400'; if(n.includes('pão')||n.includes('pao')) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400'; if(n.includes('croissant')||n.includes('pastel')) return 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400'; return 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400'; };
    const hojeStr=new Date().toISOString().slice(0,10);
    document.getElementById('gridProd').innerHTML=lista.map(p=>{
      let badgeVal = '';
      if(p.validade){ if(p.validade < hojeStr) badgeVal='<span class="badge-validade-vencido">VENCIDO</span>'; else if(p.validade <= new Date(Date.now()+3*86400000).toISOString().slice(0,10)) badgeVal='<span class="badge-validade-aviso">A VENCER</span>'; }
      if(isCliente){ return '<div class="prod-card"><img src="'+(p.foto||imgAuto(p.nome))+'" alt=""><b>'+p.nome+'</b><p>'+p.categoria+' | '+p.preco+' MT</p><p>Stock: <b>'+p.stock+'</b> '+badgeVal+' '+(p.validade?'<br><small>Validade: '+p.validade+'</small>':'')+'</p><button class="btn btn-gold btn-full" data-comprar="'+esc(p.nome)+'">Comprar / Encomendar</button></div>'; }
      return '<div class="prod-card"><img src="'+(p.foto||imgAuto(p.nome))+'" alt=""><b>'+p.nome+'</b><p>'+p.categoria+' | '+p.preco+' MT</p><p>Stock: <b>'+p.stock+'</b> '+(p.stock<=0?'ACABOU':p.stock<=5?'A ACABAR':'')+' '+badgeVal+'</p>'+(isAdmin?'<p class="muted">Lucro: '+(p.preco-p.custo)+' MT</p>':'')+'<button class="btn" data-editar="'+p.id+'">Editar</button><button class="btn btn-green" data-vender="'+p.id+'">Vender</button>'+(isAdmin?'<button class="btn btn-red" data-apagar="'+p.id+'">Apagar</button>':'')+'</div>';
    }).join('');
    document.querySelectorAll('[data-comprar]').forEach(b=>b.addEventListener('click', ()=>comprarComoCliente(b.dataset.comprar)));
    document.querySelectorAll('[data-editar]').forEach(b=>b.addEventListener('click', ()=>editarProd(parseInt(b.dataset.editar))));
    document.querySelectorAll('[data-vender]').forEach(b=>b.addEventListener('click', ()=>venderRapido(parseInt(b.dataset.vender))));
    document.querySelectorAll('[data-apagar]').forEach(b=>b.addEventListener('click', ()=>apagarProd(parseInt(b.dataset.apagar))));
    const vProdEl = document.getElementById('vProd'); if(vProdEl) vProdEl.innerHTML = PRODS.length ? PRODS.map(p=>'<option value="'+p.id+'">'+p.nome+' - '+p.preco+' MT (stock '+p.stock+')</option>').join('') : '<option value="">Sem produtos</option>';
    const eTipoEl = document.getElementById('eTipo'); if(eTipoEl){ const atual=eTipoEl.value; eTipoEl.innerHTML = '<option value="">Escolhe um produto...</option>' + (PRODS.length ? PRODS.map(p=>'<option value="'+p.nome+'">'+p.nome+' - '+p.preco+' MT</option>').join('') : '<option value="">Sem produtos - adiciona primeiro</option>'); if(atual) eTipoEl.value=atual; atualizarPrecoEncomenda(); }
    const ls=document.getElementById('listaStock'); if(ls) ls.innerHTML=PRODS.map(p=>'<p>'+p.nome+' - Stock <b>'+p.stock+'</b> '+(p.validade?'- Validade '+p.validade:'')+'</p>').join('');
    const al=document.getElementById('alertaStock'); if(al) al.innerText=PRODS.filter(p=>p.stock<=5).map(p=>p.nome).join(', ')||'Stock OK';
    carregarIngredientesV21();
  }catch(e){}
  try{
    if(isAdmin){
      const pessoas=await api('/api/pessoas');
      const listaEl=document.getElementById('listaPessoas');
      if(listaEl) listaEl.innerHTML=pessoas.map(p=>{
        const ativo=p.active!==false;
        const bot= isAdmin && p.id!==ME.id ? (ativo?'<button class="btn btn-red" data-demitir="'+p.id+'" data-nome="'+esc(p.nome)+'">Demitir</button>':'<button class="btn btn-green" data-reativar="'+p.id+'" data-nome="'+esc(p.nome)+'">Reativar</button>') : '';
        return '<div class="linha">'+(p.foto?'<img src="'+p.foto+'" class="avatar-mini" alt="">':'')+'<b>'+p.nome+'</b> - '+p.telefone+' - '+p.tipo+' - Pontos '+(p.pontos||0)+' '+(ativo?'<span class="badge-ok">Ativo</span>':'<span class="badge-off">DEMITIDO</span>')+' '+bot+'</div>';
      }).join('');
      document.querySelectorAll('[data-demitir]').forEach(b=>b.addEventListener('click', ()=>demitirPessoa(parseInt(b.dataset.demitir), b.dataset.nome)));
      document.querySelectorAll('[data-reativar]').forEach(b=>b.addEventListener('click', ()=>reativarPessoa(parseInt(b.dataset.reativar), b.dataset.nome)));
      const lt=document.getElementById('listaTroca'); if(lt) lt.innerHTML=pessoas.map(p=>'<button class="btn" data-troca="'+p.telefone+'">'+p.nome+' - '+p.telefone+'</button>').join('');
      document.querySelectorAll('[data-troca]').forEach(b=>b.addEventListener('click', ()=>{ document.getElementById('trocaTel').value=b.dataset.troca; }));
    }
  }catch(e){}
  if(!isCliente){
    try{
      const fin=await api('/api/financeiro');
      if(isAdmin){
        const lv=document.getElementById('listaVendas'); if(lv) lv.innerHTML=fin.vendas.slice(0,30).map(v=>'<div class="linha">'+v.data+' '+v.hora+' - '+v.produto+' x'+v.qtd+' = '+v.total+' MT - '+v.cliente+' <button class="btn" data-recibo-venda="'+v.id+'">Recibo</button> <button class="btn btn-red" data-anular="'+v.id+'">Anular</button></div>').join('');
        const ld=document.getElementById('listaDespesas'); if(ld) ld.innerHTML=fin.despesas.map(d=>'<div class="linha">'+d.descricao+' - '+d.valor+' MT</div>').join('');
        document.querySelectorAll('[data-recibo-venda]').forEach(b=>b.addEventListener('click', ()=>baixarReciboVenda(parseInt(b.dataset.reciboVenda))));
        document.querySelectorAll('[data-anular]').forEach(b=>b.addEventListener('click', ()=>anularVenda(parseInt(b.dataset.anular))));
      }
      const lc=document.getElementById('listaCompras'); if(lc) lc.innerHTML=fin.compras.map(c=>'<div class="linha">'+c.produto+' x'+c.qtd+' = '+c.total+' MT - '+c.fornecedor+' <button class="btn" data-recibo-compra="'+c.id+'">Recibo</button></div>').join('');
      document.querySelectorAll('[data-recibo-compra]').forEach(b=>b.addEventListener('click', ()=>baixarReciboCompra(parseInt(b.dataset.reciboCompra))));
      const ldiv=document.getElementById('listaDividas'); if(ldiv) ldiv.innerHTML=fin.dividas.map(d=>'<div class="linha"><b>'+d.cliente+'</b> deve '+d.total+' MT - '+d.produto+' '+(d.whatsapp_link?'<a href="'+d.whatsapp_link+'" target="_blank">WhatsApp</a>':'')+' <button class="btn btn-green" data-pagar="'+d.id+'" data-cliente="'+esc(d.cliente)+'">Marcar pago</button></div>').join('')||'Sem dívidas';
      document.querySelectorAll('[data-pagar]').forEach(b=>b.addEventListener('click', ()=>pagarDivida(parseInt(b.dataset.pagar), b.dataset.cliente)));
    }catch(e){}
    try{ const forn=await api('/api/fornecedores'); const lf=document.getElementById('listaForn'); if(lf) lf.innerHTML=forn.map(f=>'<div class="linha"><b>'+f.nome+'</b> - '+f.produto+' - '+f.preco+' MT - '+f.telefone+'</div>').join(''); const cf=document.getElementById('cForn'); if(cf) cf.innerHTML=forn.map(f=>'<option value="'+f.id+'">'+f.nome+'</option>').join(''); }catch(e){}
  }
  try{
    const enc=await api('/api/encomendas');
    const isFuncOuAdmin = isAdmin || isFunc;
    const htmlEnc = enc.map(e=>{
      const nota = e.avaliacao ? 'Nota: '+e.avaliacao+'/5' : '';
      const pontoTxt = e.ponto ? '<p class="ponto-box"><b>Ponto:</b> '+e.ponto+' '+nota+'</p>' : '<p class="ponto-vazio">Sem ponto ainda</p>';
      const btnEntregar = (isFuncOuAdmin && e.estado!=='Entregue' && e.estado!=='Cancelada') ? '<button class="btn btn-green" data-entregar="'+e.id+'">Entregar e virar Venda</button>' : '';
      const btnPronta = (isFuncOuAdmin && e.estado!=='Entregue' && e.estado!=='Cancelada') ? '<button class="btn btn-gold" data-pronta="'+e.id+'">Pronta</button>' : '';
      const btnCancelar = (isCliente && e.estado!=='Entregue' && e.estado!=='Cancelada') ? '<button class="btn btn-red" data-cancelar="'+e.id+'">Cancelar</button>' : '';
      let cls='estado-recebida'; if(e.estado==='Em Preparação') cls='estado-preparacao'; if(e.estado==='Pronta') cls='estado-pronta'; if(e.estado==='Entregue') cls='estado-entregue'; if(e.estado==='Cancelada') cls='estado-cancelada';
      return '<div class="linha"><div class="enc-top">'+avatarCliente(e.cliente_foto,e.cliente)+'<div class="enc-info"><b>'+e.cliente+'</b> ('+e.telefone+') - <b>'+e.tipo+'</b> - '+e.preco+' MT - Entrega: '+(e.data_entrega||'-')+' - <span class="'+cls+'">'+e.estado+'</span><br><small>Criado por: '+(e.criado_por||e.cliente)+' | Pagamento: '+e.sinal+' | Obs: '+(e.obs||'-')+'</small></div></div>'+pontoTxt+'<div class="flex enc-botoes">'+btnEntregar+btnPronta+btnCancelar+'<button class="btn" data-ponto="'+e.id+'">Deixar meu ponto</button></div></div>';
    }).join('') || 'Ainda não tens encomendas. Faz a primeira!';
    const minhas=document.getElementById('listaMinhasEnc'); if(minhas) minhas.innerHTML=htmlEnc;
    const antiga=document.getElementById('listaEnc'); if(antiga) antiga.innerHTML=htmlEnc;
    const pedidos=document.getElementById('listaPedidosEnc'); if(pedidos) pedidos.innerHTML=htmlEnc;
    document.querySelectorAll('[data-entregar]').forEach(b=>b.addEventListener('click', ()=>entregarEnc(parseInt(b.dataset.entregar))));
    document.querySelectorAll('[data-pronta]').forEach(b=>b.addEventListener('click', ()=>mudarEstadoEnc(parseInt(b.dataset.pronta),'Pronta')));
    document.querySelectorAll('[data-cancelar]').forEach(b=>b.addEventListener('click', ()=>cancelarEnc(parseInt(b.dataset.cancelar))));
    document.querySelectorAll('[data-ponto]').forEach(b=>b.addEventListener('click', ()=>deixarPonto(parseInt(b.dataset.ponto))));
    if(!isCliente){
      const fin2 = await api('/api/financeiro').catch(()=>null);
      if(fin2){ const vendasEnc = fin2.vendas.filter(v=>v.pagamento==='Encomenda'); const el=document.getElementById('listaEncVendas'); if(el) el.innerHTML = vendasEnc.map(v=>'<div class="linha"><b>'+v.produto+'</b> - '+v.cliente+' - '+v.total+' MT - '+v.data+'</div>').join('') || 'Ainda nenhuma encomenda entregue.'; }
    }
  }catch(e){ console.log('enc erro', e); }
}
async function venderRapido(id){ document.getElementById('vProd').value=id; mostrarSec('vendasSec', document.querySelector('[data-sec="vendasSec"]')); toast('Produto escolhido'); }
function comprarComoCliente(nomeProd){
  mostrarSec('encomendasSec', document.querySelector('[data-sec="encomendasSec"]'));
  setTimeout(()=>{
    const sel=document.getElementById('eTipo'); if(sel) sel.value=nomeProd; atualizarPrecoEncomenda();
    const cli=document.getElementById('eCliente'); if(cli && ME && !cli.value) cli.value=ME.nome;
    const tel=document.getElementById('eTel'); if(tel && ME && !tel.value) tel.value=ME.telefone;
    toast('Escolheste: '+nomeProd);
  },100);
}
async function salvarProd(){
  if(ME && ME.tipo==='Cliente'){ alert('Como Cliente não podes adicionar/editar produtos. Só podes comprar e encomendar.'); return; }
  if(ME && ME.tipo==='Funcionário' && !ME.is_admin && EDIT_ID){
    try{ await api('/api/products/'+EDIT_ID,'PUT',{nome:val('pNome'), stock:parseInt(val('pStock')||0), validade:val('pValidade')}); toast('Stock atualizado - Preço só Admin muda'); carregarDados(); return; }catch(e){ alert(e.message); return; }
  }
  if(ME && ME.tipo==='Funcionário' && !ME.is_admin && !EDIT_ID){ alert('Funcionário não pode criar produto com preço. Pede ao Admin.'); return; }
  const body={nome:val('pNome'),categoria:val('pCat'),preco:parseFloat(val('pPreco')||0),custo:parseFloat(val('pCusto')||0),stock:parseInt(val('pStock')||0),stock_minimo:5,foto:FOTO_TEMP,validade:val('pValidade')};
  if(!body.nome) return alert('Escreve nome');
  try{
    if(EDIT_ID) await api('/api/products/'+EDIT_ID,'PUT',body);
    else await api('/api/products','POST',body);
    EDIT_ID=null; FOTO_TEMP='';
    document.getElementById('btnSalvarProd').innerText='Adicionar produto';
    toast('Guardado'); carregarDados();
  }catch(e){ alert(e.message); }
}
function editarProd(id){
  if(ME && ME.tipo==='Cliente'){ alert('Cliente não pode editar.'); return; }
  const p=PRODS.find(x=>x.id===id); if(!p) return;
  EDIT_ID=id;
  document.getElementById('pNome').value=p.nome;
  document.getElementById('pCat').value=p.categoria;
  document.getElementById('pPreco').value=p.preco;
  document.getElementById('pCusto').value=p.custo;
  document.getElementById('pStock').value=p.stock;
  const pv=document.getElementById('pValidade'); if(pv) pv.value=p.validade||'';
  document.getElementById('btnSalvarProd').innerText='Guardar edição';
  mostrarSec('produtosSec', document.querySelector('[data-sec="produtosSec"]'));
}
async function apagarProd(id){
  if(!ME.is_admin){ alert('Só Admin pode apagar produto.'); return; }
  if(!confirm('Apagar?')) return;
  try{ await api('/api/products/'+id,'DELETE'); carregarDados(); }catch(e){ alert(e.message); }
}
async function anularVenda(id){
  if(!ME.is_admin){ alert('Só Admin pode anular venda. Funcionário precisa de autorização.'); return; }
  if(!confirm('Anular esta venda?')) return;
  try{ await api('/api/vendas/'+id+'/anular','POST',{}); toast('Venda anulada'); carregarDados(); }catch(e){ alert(e.message); }
}
async function addVenda(){
  try{
    const d=await api('/api/vendas','POST',{produto_id:parseInt(val('vProd')),qtd:parseInt(val('vQtd')||1),cliente:val('vCliente')||'Cliente Balcão',cliente_tel:val('vTel'),pagamento:val('vPag'),data_pagamento:val('vDataPag')});
    toast('Venda feita | '+d.total+' MT');
    if(confirm('Venda feita | '+d.total+' MT\nQueres baixar o recibo PDF?')){ baixarReciboVenda(d.venda_id); }
    if(d.whatsapp_link) window.open(d.whatsapp_link,'_blank');
    carregarDados();
  }catch(e){ alert(e.message); }
}
async function addDespesa(){
  try{ await api('/api/despesas','POST',{descricao:val('sDesc'),valor:parseFloat(val('sValor')||0),categoria:val('sCat')}); toast('Despesa registada'); carregarDados(); }catch(e){ alert(e.message); }
}
async function addForn(){
  try{ await api('/api/fornecedores','POST',{nome:val('fNome'),telefone:val('fTel'),produto:val('fProd'),preco:parseFloat(val('fPreco')||0),localizacao:val('fLocal')}); toast('Fornecedor adicionado'); carregarDados(); }catch(e){ alert(e.message); }
}
async function addCompra(){
  try{
    const d=await api('/api/compras','POST',{fornecedor_id:parseInt(val('cForn')),produto:val('cProd'),qtd:parseInt(val('cQtd')||1),preco_unitario:parseFloat(val('cPreco')||0),pagamento:val('cPag')});
    toast('Compra registada | '+d.total+' MT');
    if(confirm('Compra registada | '+d.total+' MT\nQueres baixar o recibo da compra?')){ baixarReciboCompra(d.compra_id); }
    carregarDados();
  }catch(e){ alert(e.message); }
}
async function addEnc(){
  if(ME && (ME.is_admin || ME.tipo==='Funcionário')){ alert('Admin / Funcionário não pode fazer encomenda. Só o Cliente encomenda.'); return; }
  try{
    const nomeProd=val('eTipo'); if(!nomeProd) return alert('Escolhe um produto primeiro.');
    const p=PRODS.find(x=>x.nome===nomeProd); const preco=p?p.preco:0;
    await api('/api/encomendas','POST',{cliente:val('eCliente')||ME.nome,telefone:val('eTel')||ME.telefone,tipo:nomeProd,data_entrega:val('eData'),preco:preco,sinal:val('eSinal'),obs:val('eObs')});
    toast('Encomenda guardada! Vê em Minhas Encomendas.');
    mostrarSec('minhasEncomendasSec', document.querySelector('[data-sec="minhasEncomendasSec"]'));
    carregarDados();
  }catch(e){ alert(e.message); }
}
async function entregarEnc(id){
  if(!confirm('Entregar? Vai virar Venda automaticamente e dar pontos ao cliente.')) return;
  try{ await api('/api/encomendas/'+id+'/entregar','POST',{}); toast('Entregue e virou Venda!'); carregarDados(); }catch(e){ alert(e.message); }
}
async function cancelarEnc(id){
  if(!confirm('Cancelar esta encomenda?')) return;
  try{ await api('/api/encomendas/'+id+'/cancelar','POST',{}); toast('Encomenda cancelada'); carregarDados(); }catch(e){ alert(e.message); }
}
async function mudarEstadoEnc(id,estado){
  try{ await api('/api/encomendas/'+id+'/estado','POST',{estado}); toast('Estado: '+estado); carregarDados(); }catch(e){ alert(e.message); }
}
async function deixarPonto(id){
  const ponto=prompt('Deixa o teu ponto / comentário sobre a encomenda:');
  if(ponto===null) return;
  const av=parseInt(prompt('Nota de 1 a 5 (opcional):')||'0');
  try{ await api('/api/encomendas/'+id+'/ponto','POST',{ponto:ponto,avaliacao:av}); toast('Ponto guardado!'); carregarDados(); }catch(e){ alert(e.message); }
}
async function carregarPainelAdmin(){
  if(!ME.is_admin){ alert('Só Admin vê Painel Admin'); return; }
  try{
    const d=await api('/api/admin/painel');
    document.getElementById('adminResumo').innerHTML='<p>Vendas: '+d.resumo.total_vendas+' MT | Lucro líquido: '+d.resumo.lucro_liquido_final+' MT | Dívidas: '+d.resumo.dividas+' MT</p>';
    document.getElementById('adminVendas').innerHTML='<h3>Últimas vendas</h3>'+d.ultimas_vendas.map(v=>'<div class="linha">'+v.data+' '+v.hora+' - '+v.produto+' x'+v.qtd+' = '+v.total+' MT - '+v.vendedor+' <button class="btn" data-recibo-admin="'+v.id+'">Recibo</button></div>').join('');
    document.getElementById('adminCompras').innerHTML='<h3>Últimas compras</h3>'+d.ultimas_compras.map(c=>'<div class="linha">'+c.data+' - '+c.produto+' x'+c.qtd+' = '+c.total+' MT <button class="btn" data-recibo-compra-admin="'+c.id+'">Recibo</button></div>').join('');
    document.getElementById('adminFluxo').innerHTML='<h3>Quem fez o quê</h3>'+d.fluxo.map(l=>'<div class="linha">'+l.data+' - '+l.quem+' - '+l.acao+' - '+l.detalhe+'</div>').join('');
    document.querySelectorAll('[data-recibo-admin]').forEach(b=>b.addEventListener('click', ()=>baixarReciboVenda(parseInt(b.dataset.reciboAdmin))));
    document.querySelectorAll('[data-recibo-compra-admin]').forEach(b=>b.addEventListener('click', ()=>baixarReciboCompra(parseInt(b.dataset.reciboCompraAdmin))));
  }catch(e){ alert(e.message); }
}
async function backup(){
  if(!ME.is_admin){ alert('Só Admin faz backup'); return; }
  try{
    const d=await api('/api/backup');
    const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='backup_padaria.json'; a.click();
  }catch(e){ alert(e.message); }
}
function abrirTroca(){ document.getElementById('modalTroca').classList.remove('hidden'); }
function fecharTroca(){ document.getElementById('modalTroca').classList.add('hidden'); }
async function trocarConta(){
  try{
    const d=await api('/api/admin/switch','POST',{target_telefone:val('trocaTel'),admin_password:val('trocaSenha')});
    localStorage.setItem('adminToken',token);
    token=d.token; localStorage.setItem('token',token); location.reload();
  }catch(e){ alert(e.message); }
}
async function baixarComToken(url, nomeFicheiro){
  if(!token){ alert('Faz login de novo'); return; }
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(url + sep + 'token=' + encodeURIComponent(token), { headers: { 'Authorization': 'Bearer ' + token } });
  if(res.status === 401){ alert('Sessão expirada. Faz login de novo.'); return; }
  if(!res.ok){ alert('Erro ao baixar: ' + res.status); return; }
  const blob = await res.blob();
  const u = window.URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = u; a.download = nomeFicheiro; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(u);
  toast('Baixado: ' + nomeFicheiro);
}
async function fechoDia(){
  if(!token){ alert('Faz login de novo'); return; }
  try{
    const res = await fetch('/api/recibo/diario/json?token=' + encodeURIComponent(token), { headers: { 'Authorization': 'Bearer ' + token } });
    if(res.status === 401){ alert('Sessão expirada. Faz login de novo.'); return; }
    if(!res.ok){ alert('Erro fecho: ' + res.status); return; }
    const r = await res.json();
    let modal = document.getElementById('modalFecho');
    if(!modal){ modal = document.createElement('div'); modal.id='modalFecho'; modal.className='modal-fecho'; document.body.appendChild(modal); }
    modal.innerHTML = '<div class="fecho-box"><div class="fecho-top"><h2>PADARIA JEQUESSENE</h2><p>Fecho do Dia - '+r.data+'</p><hr></div><div class="fecho-body"><p>Vendas Hoje: <b>'+r.vendas_qtd+' - '+r.vendas_total+' MT</b></p><p>Compras Hoje: <b>'+r.compras_total+' MT</b></p><p>Despesas Hoje: <b>'+r.despesas_total+' MT</b></p><p>M-Pesa: '+r.mpesa+' MT | e-Mola: '+r.emola+' MT | Dinheiro: '+r.dinheiro+' MT</p><h2>LUCRO LÍQUIDO: '+r.lucro_liquido+' MT</h2><hr><b>Vendas:</b><br><span>'+((r.vendas||[]).map(v=>v.produto+' x'+v.qtd+' - '+v.total+' MT ('+v.pagamento+')').join('<br>') || 'Sem vendas')+'</span><br><br><b>Compras:</b><br><span>'+((r.compras||[]).map(c=>c.produto+' x'+c.qtd+' - '+c.total+' MT ('+c.fornecedor+')').join('<br>') || 'Sem compras')+'</span></div><div class="fecho-botoes"><button id="btnImprimirFecho" class="btn btn-dark btn-flex">Imprimir Fecho</button><button id="btnFecharFecho" class="btn btn-flex">Fechar</button></div></div>';
    modal.classList.add('show');
    document.getElementById('btnImprimirFecho').addEventListener('click', ()=>window.print());
    document.getElementById('btnFecharFecho').addEventListener('click', ()=>modal.remove());
    modal.onclick = (e)=>{ if(e.target===modal) modal.remove(); };
  }catch(e){ alert('Erro fecho: ' + e.message); }
}
function exportarExcel(){
  if(ME.tipo==='Cliente'){ alert('Cliente não pode exportar'); return; }
  baixarComToken('/api/export/excel', 'padaria_jequessene.xlsx');
  toast('A exportar Excel...');
}
function exportarCSV(){ baixarComToken('/api/export/csv', 'padaria_jequessene.csv'); toast('A exportar CSV...'); }
function baixarReciboVenda(id){ baixarComToken('/api/recibo/venda/'+id, 'recibo_venda_'+id+'.pdf'); }
function baixarReciboCompra(id){ baixarComToken('/api/recibo/compra/'+id, 'recibo_compra_'+id+'.pdf'); }
async function limparSistema(){
  if(!ME.is_admin){ alert('Só Admin limpa sistema'); return; }
  const confirmar = val('limparConfirmar'); const senha = val('limparSenha');
  if(!confirmar || confirmar.toUpperCase() !== 'LIMPAR'){ alert('Escreve LIMPAR no campo para confirmar.'); return; }
  if(!senha){ alert('Escreve a tua senha de Admin.'); return; }
  if(!confirm('TENS A CERTEZA? Vai apagar TODAS as vendas, compras, despesas, encomendas e pessoas de teste. Não dá para voltar atrás!')) return;
  if(!confirm('Última confirmação: Limpar mesmo tudo para vender?')) return;
  try{
    const d = await api('/api/admin/limpar-tudo','POST',{confirmar:confirmar, senha_admin:senha});
    alert(d.msg);
    const elMsg = document.getElementById('limparMsg'); if(elMsg) elMsg.innerText = d.msg;
    const elC = document.getElementById('limparConfirmar'); if(elC) elC.value='';
    const elS = document.getElementById('limparSenha'); if(elS) elS.value='';
    toast('Sistema limpo!'); carregarDados();
  }catch(e){ alert(e.message); }
}
async function limparSoVendas(){
  const confirmar = val('limparConfirmar'); const senha = val('limparSenha');
  if(!confirmar || confirmar.toUpperCase() !== 'LIMPAR'){ alert('Escreve LIMPAR para confirmar.'); return; }
  if(!senha){ alert('Escreve a tua senha de Admin.'); return; }
  if(!confirm('Apagar só vendas e histórico? Produtos e pessoas ficam.')) return;
  try{
    const d = await api('/api/admin/limpar-vendas','POST',{confirmar:confirmar, senha_admin:senha});
    alert(d.msg);
    const elMsg = document.getElementById('limparMsg'); if(elMsg) elMsg.innerText = d.msg;
    carregarDados();
  }catch(e){ alert(e.message); }
}
async function pegarLimpar(){
  const confirmar = val('limparConfirmar'); const senha = val('limparSenha');
  if(!confirmar || confirmar.toUpperCase() !== 'LIMPAR'){ alert('Escreve LIMPAR no campo lá em cima para confirmar.'); return null; }
  if(!senha){ alert('Escreve a tua senha de Admin.'); return null; }
  return {confirmar:confirmar, senha_admin:senha};
}
async function limparUltimasVendas(){
  const body = await pegarLimpar(); if(!body) return;
  if(!confirm('Apagar TODAS as Últimas Vendas? Dashboard fica a 0.')) return;
  try{ const d = await api('/api/admin/limpar-ultimas-vendas','POST',body); alert(d.msg); const el=document.getElementById('limparPartesMsg'); if(el) el.innerText=d.msg; carregarDados(); carregarPainelAdmin(); }catch(e){ alert(e.message); }
}
async function limparUltimasCompras(){
  const body = await pegarLimpar(); if(!body) return;
  if(!confirm('Apagar TODAS as Últimas Compras?')) return;
  try{ const d = await api('/api/admin/limpar-ultimas-compras','POST',body); alert(d.msg); const el=document.getElementById('limparPartesMsg'); if(el) el.innerText=d.msg; carregarDados(); carregarPainelAdmin(); }catch(e){ alert(e.message); }
}
async function limparFluxo(){
  const body = await pegarLimpar(); if(!body) return;
  if(!confirm('Apagar o histórico de Quem fez o quê?')) return;
  try{ const d = await api('/api/admin/limpar-fluxo','POST',body); alert(d.msg); const el=document.getElementById('limparPartesMsg'); if(el) el.innerText=d.msg; carregarPainelAdmin(); }catch(e){ alert(e.message); }
}
function ligarBotoes(){
  const on = (id, fn)=>{ const el=document.getElementById(id); if(el) el.addEventListener('click', fn); };
  on('btn-tema', mudarTema);
  on('btn-tema-login', mudarTema);
  on('btnMenu', toggleMenu);
  on('tabLogin', mostrarLogin);
  on('tabRegisto', mostrarRegisto);
  on('btnVerLogin', (e)=>mostrarSenha('loginSenha', e.target));
  on('btnVerReg', (e)=>mostrarSenha('rSenha', e.target));
  on('btnLogin', login);
  on('btnRegistar', registar);
  on('btnEntrarSistema', entrarSistema);
  on('btnPerfilTop', abrirPerfil);
  on('btnTrocarFoto', abrirPerfil);
  on('btnTrocarContaMenu', abrirTroca);
  on('btnTrocarContaAdmin', abrirTroca);
  on('btnSairTop', sair);
  on('btnSairMenu', sair);
  on('meuAvatar', abrirPerfil);
  on('btnFecho1', fechoDia);
  on('btnFechoAdmin', fechoDia);
  on('btnExport1', exportarExcel);
  on('btnExportExcel', exportarExcel);
  on('btnAtualizarAdmin', carregarPainelAdmin);
  on('btnBackup', backup);
  on('btnAddLinhaFicha', addLinhaFicha);
  on('btnSalvarFicha', salvarFicha);
  on('btnAddIngrediente', addIngrediente);
  on('btnSalvarProd', salvarProd);
  on('btnAddVenda', addVenda);
  on('btnAddDespesa', addDespesa);
  on('btnAddForn', addForn);
  on('btnAddCompra', addCompra);
  on('btnAddEnc', addEnc);
  on('btnSalvarPerfil', salvarPerfil);
  on('btnFecharPerfil', fecharPerfil);
  on('btnMudarSenha', mudarSenha);
  on('btnTrocarConta', trocarConta);
  on('btnFecharTroca', fecharTroca);
  on('btnLimparTudo', limparSistema);
  on('btnLimparVendas', limparSoVendas);
  on('btnLimparUltVendas', limparUltimasVendas);
  on('btnLimparUltCompras', limparUltimasCompras);
  on('btnLimparFluxo', limparFluxo);
  const fotoProd = document.getElementById('inputFotoProd');
  if(fotoProd) fotoProd.addEventListener('change', lerFoto);
  const fotoPerfil = document.getElementById('inputFotoPerfil');
  if(fotoPerfil) fotoPerfil.addEventListener('change', lerFotoPerfil);
  const pesquisa = document.getElementById('pesquisaProd');
  if(pesquisa) pesquisa.addEventListener('input', carregarDados);
  const eTipo = document.getElementById('eTipo');
  if(eTipo) eTipo.addEventListener('change', atualizarPrecoEncomenda);
  document.querySelectorAll('[data-sec]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ mostrarSec(btn.dataset.sec, btn); });
  });
  const hoje = document.getElementById('dataHoje');
  if(hoje) hoje.innerText = new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'});
  const top = document.getElementById('dataTop');
  if(top) top.innerText = new Date().toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'});
  window.addEventListener('popstate', function(e){ e.preventDefault(); try{ mostrarSec('produtosSec', document.querySelector('[data-sec="produtosSec"]')); }catch(err){} });
  try{ history.pushState({page:'app'}, '', location.href); }catch(e){}
}
if(localStorage.getItem('tema_jeq')==='preto'){ document.body.classList.add('tema-preto'); document.documentElement.classList.add('tema-preto'); }
document.addEventListener('DOMContentLoaded', ()=>{ ligarBotoes(); aplicarTema(); });
setTimeout(aplicarTema, 300);
setTimeout(aplicarTema, 1000);
if(token){ carregarDados(); }
