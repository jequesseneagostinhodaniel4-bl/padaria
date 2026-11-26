# PADARIA JEQUESSENE - main.py v15 - PROTECAO CLIENTE NO BACKEND
import os, json, sqlite3, secrets, hashlib
from datetime import datetime, date, timedelta
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, "padaria.db")

def conn():
    c = sqlite3.connect(DB); c.row_factory = sqlite3.Row; return c

def init_db():
    c = conn()
    c.execute("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, telefone TEXT UNIQUE, idade INTEGER, email TEXT, foto TEXT, pais TEXT, bairro TEXT, tipo TEXT, password TEXT, is_admin INTEGER DEFAULT 0, active INTEGER DEFAULT 1, tema TEXT DEFAULT 'branco')")
    c.execute("CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, categoria TEXT, preco REAL, custo REAL, stock INTEGER, stock_minimo INTEGER DEFAULT 5, foto TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS vendas (id INTEGER PRIMARY KEY AUTOINCREMENT, produto TEXT, produto_id INTEGER, qtd INTEGER, total REAL, cliente TEXT, cliente_tel TEXT, pagamento TEXT, data TEXT, hora TEXT, vendedor TEXT, vendedor_id INTEGER, data_pagamento TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS compras (id INTEGER PRIMARY KEY AUTOINCREMENT, produto TEXT, qtd INTEGER, total REAL, fornecedor TEXT, fornecedor_id INTEGER, pagamento TEXT, data TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS despesas (id INTEGER PRIMARY KEY AUTOINCREMENT, descricao TEXT, valor REAL, categoria TEXT, data TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS fornecedores (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT, telefone TEXT, produto TEXT, preco REAL, localizacao TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS encomendas (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente TEXT, telefone TEXT, tipo TEXT, data_entrega TEXT, preco REAL, sinal TEXT, obs TEXT, estado TEXT DEFAULT 'Pendente', criado_por TEXT, cliente_foto TEXT, ponto TEXT, avaliacao INTEGER DEFAULT 0, data TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS fluxo (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT, quem TEXT, acao TEXT, detalhe TEXT)")
    c.execute("CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, user_id INTEGER)")
    c.commit(); c.close()
init_db()
def hash_pw(p): return hashlib.sha256(str(p).encode()).hexdigest()
def add_fluxo(quem, acao, detalhe):
    try:
        c = conn(); c.execute("INSERT INTO fluxo (data, quem, acao, detalhe) VALUES (?,?,?,?)", (datetime.now().strftime("%Y-%m-%d %H:%M"), quem, acao, detalhe)); c.commit(); c.close()
    except: pass
def get_user(token: str = None):
    if not token: raise HTTPException(401, "Sem token")
    c = conn(); r = c.execute("SELECT user_id FROM tokens WHERE token=?", (token,)).fetchone()
    if not r: c.close(); raise HTTPException(401, "Sessão expirada")
    u = c.execute("SELECT * FROM users WHERE id=?", (r["user_id"],)).fetchone(); c.close()
    if not u or u["active"]==0: raise HTTPException(401, "Conta inativa")
    return dict(u)
def auth(req: Request):
    t = req.headers.get("Authorization","").replace("Bearer ","") or req.query_params.get("token","")
    return get_user(t)
def so_admin(user):
    if not user["is_admin"]: raise HTTPException(403, "Só Admin pode ver isso.")
    return user
def so_func_ou_admin(user):
    if user["tipo"]=="Cliente" and not user["is_admin"]:
        raise HTTPException(403, "Como Cliente não podes ver o Dashboard / Vendas da padaria.")
    return user
def so_func_ou_admin_gerir(user):
    if user["tipo"]=="Cliente" and not user["is_admin"]:
        raise HTTPException(403, "Como Cliente não podes fazer isso. Só podes comprar e encomendar.")
    return user

class Login(BaseModel):
    telefone: str; password: str
class Register(BaseModel):
    nome: str; telefone: str; idade: int = 18; email: str = ""; foto: str = ""; pais: str = "Moçambique"; bairro: str = ""; tipo: str = "Cliente"; password: str
class Prod(BaseModel):
    nome: str; categoria: str = "Pães"; preco: float = 0; custo: float = 0; stock: int = 0; stock_minimo: int = 5; foto: str = ""
class VendaIn(BaseModel):
    produto_id: int; qtd: int = 1; cliente: str = "Cliente Balcão"; cliente_tel: str = ""; pagamento: str = "Dinheiro"; data_pagamento: Optional[str] = ""
class DespesaIn(BaseModel):
    descricao: str; valor: float = 0; categoria: str = "Geral"
class FornIn(BaseModel):
    nome: str; telefone: str = ""; produto: str = ""; preco: float = 0; localizacao: str = ""
class CompraIn(BaseModel):
    fornecedor_id: int; produto: str; qtd: int = 1; preco_unitario: float = 0; pagamento: str = "Dinheiro"
class EncIn(BaseModel):
    cliente: str; telefone: str; tipo: str; data_entrega: str = ""; preco: float = 0; sinal: str = "Sem Sinal"; obs: str = ""
class PontoIn(BaseModel):
    ponto: str = ""; avaliacao: int = 0
class LimparIn(BaseModel):
    confirmar: str = ""; senha_admin: str = ""
class SwitchIn(BaseModel):
    target_telefone: str; admin_password: str

@app.get("/", response_class=HTMLResponse)
def home():
    p = os.path.join(BASE, "templates", "index.html")
    if os.path.exists(p): return open(p, encoding="utf-8").read()
    return "<h1>Padaria Jequessene</h1>"
try:
    app.mount("/static", StaticFiles(directory=os.path.join(BASE, "static")), name="static")
except: pass

@app.post("/api/login")
def login(d: Login):
    c = conn(); u = c.execute("SELECT * FROM users WHERE telefone=?", (d.telefone,)).fetchone(); c.close()
    if not u or u["password"]!=hash_pw(d.password): raise HTTPException(400, "Telefone ou senha errada")
    if u["active"]==0: raise HTTPException(400, "Conta demitida.")
    tok = secrets.token_hex(24)
    c = conn(); c.execute("INSERT OR REPLACE INTO tokens (token, user_id) VALUES (?,?)", (tok, u["id"])); c.commit(); c.close()
    return {"token": tok}
@app.post("/api/register")
def register(d: Register):
    c = conn(); ex = c.execute("SELECT id FROM users WHERE telefone=?", (d.telefone,)).fetchone()
    if ex: c.close(); raise HTTPException(400, "Telefone já tem conta")
    is_admin = 1 if c.execute("SELECT COUNT(*) as n FROM users").fetchone()["n"]==0 else 0
    c.execute("INSERT INTO users (nome, telefone, idade, email, foto, pais, bairro, tipo, password, is_admin) VALUES (?,?,?,?,?,?,?,?,?,?)", (d.nome, d.telefone, d.idade, d.email, d.foto, d.pais, d.bairro, d.tipo, hash_pw(d.password), is_admin))
    uid = c.execute("SELECT last_insert_rowid() as id").fetchone()["id"]; c.commit(); c.close()
    tok = secrets.token_hex(24)
    c = conn(); c.execute("INSERT INTO tokens (token, user_id) VALUES (?,?)", (tok, uid)); c.commit(); c.close()
    return {"token": tok}
@app.get("/api/me")
def me(user=Depends(auth)):
    u = dict(user); u.pop("password", None); return u
@app.put("/api/me")
def update_me(d: dict, user=Depends(auth)):
    c = conn(); c.execute("UPDATE users SET nome=?, bairro=?, email=?, foto=COALESCE(NULLIF(?,''), foto) WHERE id=?", (d.get("nome", user["nome"]), d.get("bairro", user["bairro"]), d.get("email", user["email"]), d.get("foto",""), user["id"])); c.commit(); c.close(); return {"msg":"ok"}
@app.post("/api/me/senha")
def troca_senha(d: dict, user=Depends(auth)):
    if hash_pw(d.get("antiga","")) != user["password"]: raise HTTPException(400, "Senha antiga errada")
    c = conn(); c.execute("UPDATE users SET password=? WHERE id=?", (hash_pw(d.get("nova","")), user["id"])); c.commit(); c.close(); return {"msg":"Senha trocada"}
@app.get("/api/tema")
def get_tema(user=Depends(auth)): return {"tema": user.get("tema") or "branco"}
@app.post("/api/tema")
def set_tema(tema: str = "branco", user=Depends(auth)):
    c = conn(); c.execute("UPDATE users SET tema=? WHERE id=?", (tema, user["id"])); c.commit(); c.close(); return {"tema": tema}

@app.get("/api/dashboard")
def dashboard(user=Depends(auth)):
    so_func_ou_admin(user)
    hoje = date.today().strftime("%Y-%m-%d"); c = conn(); graf=[]
    for i in range(6, -1, -1):
        d = (date.today() - timedelta(days=i)).strftime("%Y-%m-%d")
        s = c.execute("SELECT COALESCE(SUM(total),0) as t FROM vendas WHERE data=?", (d,)).fetchone()["t"]
        graf.append({"label": d[5:], "vendas": s})
    semana_v = sum(g["vendas"] for g in graf)
    mes_v = c.execute("SELECT COALESCE(SUM(total),0) as t FROM vendas WHERE substr(data,1,7)=?", (hoje[:7],)).fetchone()["t"]
    hoje_v = c.execute("SELECT COALESCE(SUM(total),0) as t FROM vendas WHERE data=?", (hoje,)).fetchone()["t"]
    lucro = mes_v * 0.35
    clientes = c.execute("SELECT COUNT(*) as n FROM users WHERE tipo='Cliente'").fetchone()["n"]
    dividas = c.execute("SELECT COALESCE(SUM(total),0) as t FROM vendas WHERE pagamento LIKE '%Fiado%' OR pagamento LIKE '%Dívida%'").fetchone()["t"]
    mais = c.execute("SELECT produto, SUM(qtd) as qtd FROM vendas GROUP BY produto ORDER BY qtd DESC LIMIT 5").fetchall()
    por_pag = {}
    for r in c.execute("SELECT pagamento, SUM(total) as t FROM vendas GROUP BY pagamento").fetchall(): por_pag[r["pagamento"]] = r["t"]
    quem = c.execute("SELECT v.cliente, v.produto, v.qtd, v.total, v.pagamento, v.data, u.foto FROM vendas v LEFT JOIN users u ON u.telefone=v.cliente_tel OR u.nome=v.cliente ORDER BY v.id DESC LIMIT 8").fetchall()
    vend_enc = c.execute("SELECT * FROM vendas WHERE pagamento='Encomenda' ORDER BY id DESC LIMIT 10").fetchall()
    c.close()
    return {"hoje": {"vendas": hoje_v}, "semana": {"vendas": semana_v, "lucro": lucro}, "mes": {"vendas": mes_v}, "totais": {"clientes": clientes, "dividas": dividas}, "grafico": graf, "meta": {"objetivo": 50000}, "mais_vendidos": [dict(x) for x in mais], "por_pagamento": por_pag, "quem_comprou": [dict(x) for x in quem], "vendas_encomendas": [dict(x) for x in vend_enc]}

@app.get("/api/products")
def products(user=Depends(auth)):
    c = conn(); r = c.execute("SELECT * FROM products ORDER BY id DESC").fetchall(); c.close(); return [dict(x) for x in r]
@app.post("/api/products")
def add_prod(d: Prod, user=Depends(auth)):
    so_func_ou_admin_gerir(user)
    c = conn(); c.execute("INSERT INTO products (nome,categoria,preco,custo,stock,stock_minimo,foto) VALUES (?,?,?,?,?,?,?)", (d.nome,d.categoria,d.preco,d.custo,d.stock,d.stock_minimo,d.foto)); c.commit(); c.close(); add_fluxo(user["nome"], "Adicionou produto", d.nome); return {"msg":"ok"}
@app.put("/api/products/{pid}")
def edit_prod(pid: int, d: Prod, user=Depends(auth)):
    so_func_ou_admin_gerir(user)
    c = conn(); c.execute("UPDATE products SET nome=?, categoria=?, preco=?, custo=?, stock=?, foto=? WHERE id=?", (d.nome,d.categoria,d.preco,d.custo,d.stock,d.foto,pid)); c.commit(); c.close(); return {"msg":"ok"}
@app.delete("/api/products/{pid}")
def del_prod(pid: int, user=Depends(auth)):
    so_admin(user); c = conn(); c.execute("DELETE FROM products WHERE id=?", (pid,)); c.commit(); c.close(); return {"msg":"ok"}
@app.post("/api/vendas")
def add_venda(d: VendaIn, user=Depends(auth)):
    so_func_ou_admin_gerir(user)
    c = conn(); p = c.execute("SELECT * FROM products WHERE id=?", (d.produto_id,)).fetchone()
    if not p: c.close(); raise HTTPException(400, "Produto não existe")
    if p["stock"] < d.qtd: c.close(); raise HTTPException(400, f"Stock insuficiente. Só tens {p['stock']}")
    total = p["preco"] * d.qtd; agora = datetime.now()
    c.execute("UPDATE products SET stock=stock-? WHERE id=?", (d.qtd, d.produto_id))
    c.execute("INSERT INTO vendas (produto, produto_id, qtd, total, cliente, cliente_tel, pagamento, data, hora, vendedor, vendedor_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)", (p["nome"], d.produto_id, d.qtd, total, d.cliente, d.cliente_tel, d.pagamento, agora.strftime("%Y-%m-%d"), agora.strftime("%H:%M"), user["nome"], user["id"]))
    vid = c.execute("SELECT last_insert_rowid() as id").fetchone()["id"]; c.commit(); c.close(); add_fluxo(user["nome"], "Venda", f"{p['nome']} x{d.qtd} = {total} MT"); return {"total": total, "venda_id": vid, "whatsapp_link": ""}
@app.get("/api/financeiro")
def financeiro(user=Depends(auth)):
    so_func_ou_admin(user)
    c = conn(); vendas = [dict(x) for x in c.execute("SELECT * FROM vendas ORDER BY id DESC").fetchall()]; compras = [dict(x) for x in c.execute("SELECT * FROM compras ORDER BY id DESC").fetchall()]; despesas = [dict(x) for x in c.execute("SELECT * FROM despesas ORDER BY id DESC").fetchall()]; dividas = [dict(x) for x in c.execute("SELECT * FROM vendas WHERE pagamento LIKE '%Fiado%' OR pagamento LIKE '%Dívida%' ORDER BY id DESC").fetchall()]
    for d in dividas: d["whatsapp_link"] = ""
    c.close(); return {"vendas": vendas, "compras": compras, "despesas": despesas, "dividas": dividas}
@app.post("/api/despesas")
def add_despesa(d: DespesaIn, user=Depends(auth)):
    so_func_ou_admin_gerir(user); c = conn(); c.execute("INSERT INTO despesas (descricao, valor, categoria, data) VALUES (?,?,?,?)", (d.descricao, d.valor, d.categoria, date.today().strftime("%Y-%m-%d"))); c.commit(); c.close(); add_fluxo(user["nome"], "Despesa", f"{d.descricao} {d.valor} MT"); return {"msg":"ok"}
@app.get("/api/fornecedores")
def get_forn(user=Depends(auth)):
    c = conn(); r = [dict(x) for x in c.execute("SELECT * FROM fornecedores").fetchall()]; c.close(); return r
@app.post("/api/fornecedores")
def add_forn(d: FornIn, user=Depends(auth)):
    so_func_ou_admin_gerir(user); c = conn(); c.execute("INSERT INTO fornecedores (nome, telefone, produto, preco, localizacao) VALUES (?,?,?,?,?)", (d.nome,d.telefone,d.produto,d.preco,d.localizacao)); c.commit(); c.close(); return {"msg":"ok"}
@app.post("/api/compras")
def add_compra(d: CompraIn, user=Depends(auth)):
    so_func_ou_admin_gerir(user); total = d.qtd * d.preco_unitario; c = conn(); f = c.execute("SELECT * FROM fornecedores WHERE id=?", (d.fornecedor_id,)).fetchone(); nome_f = f["nome"] if f else "Fornecedor"
    c.execute("INSERT INTO compras (produto, qtd, total, fornecedor, fornecedor_id, pagamento, data) VALUES (?,?,?,?,?,?,?)", (d.produto, d.qtd, total, nome_f, d.fornecedor_id, d.pagamento, date.today().strftime("%Y-%m-%d"))); cid = c.execute("SELECT last_insert_rowid() as id").fetchone()["id"]; c.commit(); c.close(); add_fluxo(user["nome"], "Compra", f"{d.produto} x{d.qtd} = {total} MT"); return {"total": total, "compra_id": cid}
@app.get("/api/pessoas")
def pessoas(user=Depends(auth)):
    so_admin(user); c = conn(); r = [dict(x) for x in c.execute("SELECT id, nome, telefone, tipo, foto, active FROM users ORDER BY id").fetchall()]; c.close(); return r
@app.post("/api/pessoas/{pid}/demitir")
def demitir(pid: int, user=Depends(auth)):
    so_admin(user); c = conn(); c.execute("UPDATE users SET active=0 WHERE id=?", (pid,)); c.commit(); c.close(); return {"msg":"Demitido"}
@app.post("/api/pessoas/{pid}/reativar")
def reativar(pid: int, user=Depends(auth)):
    so_admin(user); c = conn(); c.execute("UPDATE users SET active=1 WHERE id=?", (pid,)); c.commit(); c.close(); return {"msg":"Reativado"}
@app.get("/api/encomendas")
def get_enc(user=Depends(auth)):
    c = conn()
    if user["tipo"]=="Cliente" and not user["is_admin"]:
        r = c.execute("SELECT * FROM encomendas WHERE telefone=? OR cliente=? ORDER BY id DESC", (user["telefone"], user["nome"])).fetchall()
    else:
        r = c.execute("SELECT * FROM encomendas ORDER BY id DESC").fetchall()
    c.close(); return [dict(x) for x in r]
@app.post("/api/encomendas")
def add_enc(d: EncIn, user=Depends(auth)):
    c = conn(); p = c.execute("SELECT * FROM products WHERE nome=?", (d.tipo,)).fetchone(); preco_real = p["preco"] if p else 0
    cliente_final = user["nome"] if user["tipo"]=="Cliente" else d.cliente; tel_final = user["telefone"] if user["tipo"]=="Cliente" else d.telefone
    c.execute("INSERT INTO encomendas (cliente, telefone, tipo, data_entrega, preco, sinal, obs, estado, criado_por, cliente_foto, data) VALUES (?,?,?,?,?,?,?,?,?,?,?)", (cliente_final, tel_final, d.tipo, d.data_entrega, preco_real, d.sinal, d.obs, "Pendente", user["nome"], user.get("foto",""), date.today().strftime("%Y-%m-%d"))); c.commit(); c.close(); add_fluxo(user["nome"], "Encomenda", f"{d.tipo} - {preco_real} MT"); return {"msg":"Encomenda guardada", "preco": preco_real}
@app.post("/api/encomendas/{eid}/entregar")
def entregar(eid: int, user=Depends(auth)):
    so_func_ou_admin_gerir(user); c = conn(); e = c.execute("SELECT * FROM encomendas WHERE id=?", (eid,)).fetchone()
    if not e: c.close(); raise HTTPException(404, "Encomenda não existe")
    c.execute("UPDATE encomendas SET estado='Entregue' WHERE id=?", (eid,)); agora = datetime.now()
    c.execute("INSERT INTO vendas (produto, qtd, total, cliente, cliente_tel, pagamento, data, hora, vendedor, vendedor_id) VALUES (?,?,?,?,?,?,?,?,?,?)", (e["tipo"], 1, e["preco"], e["cliente"], e["telefone"], "Encomenda", agora.strftime("%Y-%m-%d"), agora.strftime("%H:%M"), user["nome"], user["id"])); c.commit(); c.close(); add_fluxo(user["nome"], "Entregou encomenda", f"{e['tipo']} - {e['preco']} MT"); return {"msg":"Entregue"}
@app.post("/api/encomendas/{eid}/ponto")
def ponto(eid: int, d: PontoIn, user=Depends(auth)):
    c = conn(); c.execute("UPDATE encomendas SET ponto=?, avaliacao=? WHERE id=?", (d.ponto, d.avaliacao, eid)); c.commit(); c.close(); return {"msg":"Ponto guardado"}
@app.post("/api/vendas/{vid}/pagar")
def pagar_divida(vid: int, user=Depends(auth)):
    so_func_ou_admin_gerir(user); c = conn(); c.execute("UPDATE vendas SET pagamento='Dinheiro' WHERE id=?", (vid,)); c.commit(); c.close(); return {"msg":"Pago"}
@app.get("/api/admin/painel")
def painel(user=Depends(auth)):
    so_admin(user); c = conn(); total_v = c.execute("SELECT COALESCE(SUM(total),0) as t FROM vendas").fetchone()["t"]; div = c.execute("SELECT COALESCE(SUM(total),0) as t FROM vendas WHERE pagamento LIKE '%Fiado%'").fetchone()["t"]; ult_v = [dict(x) for x in c.execute("SELECT * FROM vendas ORDER BY id DESC LIMIT 20").fetchall()]; ult_c = [dict(x) for x in c.execute("SELECT * FROM compras ORDER BY id DESC LIMIT 20").fetchall()]; fluxo = [dict(x) for x in c.execute("SELECT * FROM fluxo ORDER BY id DESC LIMIT 30").fetchall()]; c.close()
    return {"resumo": {"total_vendas": total_v, "lucro_liquido_final": total_v*0.35, "dividas": div}, "ultimas_vendas": ult_v, "ultimas_compras": ult_c, "fluxo": fluxo}
@app.post("/api/admin/switch")
def switch(d: SwitchIn, user=Depends(auth)):
    so_admin(user)
    if hash_pw(d.admin_password) != user["password"]: raise HTTPException(400, "Senha Admin errada")
    c = conn(); t = c.execute("SELECT * FROM users WHERE telefone=?", (d.target_telefone,)).fetchone(); c.close()
    if not t: raise HTTPException(400, "Conta não existe")
    tok = secrets.token_hex(24); c = conn(); c.execute("INSERT INTO tokens (token, user_id) VALUES (?,?)", (tok, t["id"])); c.commit(); c.close(); return {"token": tok}
@app.get("/api/backup")
def backup(user=Depends(auth)):
    so_admin(user); c = conn(); out = {}
    for tbl in ["users","products","vendas","compras","despesas","fornecedores","encomendas","fluxo"]:
        try: out[tbl] = [dict(x) for x in c.execute(f"SELECT * FROM {tbl}").fetchall()]
        except: out[tbl] = []
    c.close(); return out
def check_limpar(d: LimparIn, user):
    so_admin(user)
    if (d.confirmar or "").upper() != "LIMPAR": raise HTTPException(400, "Escreve LIMPAR para confirmar")
    if hash_pw(d.senha_admin) != user["password"]: raise HTTPException(400, "Senha Admin errada")
@app.post("/api/admin/limpar-tudo")
def limpar_tudo(d: LimparIn, user=Depends(auth)):
    check_limpar(d, user); c = conn()
    for tbl in ["vendas","compras","despesas","encomendas","fluxo"]: c.execute(f"DELETE FROM {tbl}")
    c.execute("DELETE FROM users WHERE is_admin=0"); c.commit(); c.close(); return {"msg":"Sistema limpo para vender! Produtos mantidos."}
@app.post("/api/admin/limpar-vendas")
def limpar_vendas(d: LimparIn, user=Depends(auth)):
    check_limpar(d, user); c = conn(); c.execute("DELETE FROM vendas"); c.execute("DELETE FROM fluxo"); c.commit(); c.close(); return {"msg":"Vendas e histórico limpos."}
@app.post("/api/admin/limpar-ultimas-vendas")
def limpar_ult_v(d: LimparIn, user=Depends(auth)):
    check_limpar(d, user); c = conn(); c.execute("DELETE FROM vendas"); c.commit(); c.close(); return {"msg":"Últimas Vendas limpas."}
@app.post("/api/admin/limpar-ultimas-compras")
def limpar_ult_c(d: LimparIn, user=Depends(auth)):
    check_limpar(d, user); c = conn(); c.execute("DELETE FROM compras"); c.commit(); c.close(); return {"msg":"Últimas Compras limpas."}
@app.post("/api/admin/limpar-fluxo")
def limpar_fluxo(d: LimparIn, user=Depends(auth)):
    check_limpar(d, user); c = conn(); c.execute("DELETE FROM fluxo"); c.commit(); c.close(); return {"msg":"Quem fez o quê limpo."}
@app.get("/api/recibo/diario/json")
def fecho(user=Depends(auth)):
    so_func_ou_admin(user); hoje = date.today().strftime("%Y-%m-%d"); c = conn()
    v = [dict(x) for x in c.execute("SELECT * FROM vendas WHERE data=?", (hoje,)).fetchall()]; comp = [dict(x) for x in c.execute("SELECT * FROM compras WHERE data=?", (hoje,)).fetchall()]; desp = c.execute("SELECT COALESCE(SUM(valor),0) as t FROM despesas WHERE data=?", (hoje,)).fetchone()["t"]; c.close()
    vt = sum(x["total"] for x in v); ct = sum(x["total"] for x in comp)
    return {"data": hoje, "vendas_qtd": len(v), "vendas_total": vt, "compras_total": ct, "despesas_total": desp, "mpesa": sum(x["total"] for x in v if x["pagamento"]=="M-Pesa"), "emola": sum(x["total"] for x in v if x["pagamento"]=="e-Mola"), "dinheiro": sum(x["total"] for x in v if x["pagamento"]=="Dinheiro"), "lucro_liquido": vt-ct-desp, "vendas": v, "compras": comp}
@app.get("/api/export/excel")
def exp_excel(user=Depends(auth)): return {"msg":"Usa backup por agora"}
@app.get("/api/export/csv")
def exp_csv(user=Depends(auth)): return {"msg":"Usa backup por agora"}
