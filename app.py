import os
import re
import io
from datetime import date, datetime, timedelta, timezone
from urllib.parse import quote
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, Depends, HTTPException, Request, Query
from fastapi.responses import HTMLResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from pwdlib import PasswordHash
from pydantic import BaseModel
from sqlalchemy import create_engine, String, Integer, DateTime, Text, Boolean, Float, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker, Session
from fpdf import FPDF
import openpyxl
SECRET = os.getenv("SECRET_KEY", "PADARIA_2026")
DBURL = os.getenv("DATABASE_URL", "sqlite:///./padaria.db")
if DBURL.startswith("postgres://"):
    DBURL = DBURL.replace("postgres://", "postgresql://", 1)
engine = create_engine(DBURL, connect_args={"check_same_thread": False} if DBURL.startswith("sqlite") else {}, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
pwd = PasswordHash.recommended()
def agora():
    return datetime.now(timezone.utc)
class Base(DeclarativeBase):
    pass
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    telefone: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    idade: Mapped[int] = mapped_column(Integer, default=18)
    email: Mapped[str] = mapped_column(String(180), default="")
    foto: Mapped[str] = mapped_column(Text, default="")
    pais: Mapped[str] = mapped_column(String(60), default="Moçambique")
    bairro: Mapped[str] = mapped_column(String(80), default="Matola")
    tipo: Mapped[str] = mapped_column(String(30), default="Cliente")
    password_hash: Mapped[str] = mapped_column(String(255))
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    tema: Mapped[str] = mapped_column(String(20), default="branco")
    pontos: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=agora)
class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    categoria: Mapped[str] = mapped_column(String(60), default="Pães")
    preco: Mapped[float] = mapped_column(Float, default=0)
    custo: Mapped[float] = mapped_column(Float, default=0)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    stock_minimo: Mapped[int] = mapped_column(Integer, default=5)
    foto: Mapped[str] = mapped_column(Text, default="")
    validade: Mapped[str] = mapped_column(String(20), default="")
    updated_by: Mapped[str] = mapped_column(String(120), default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=agora)
class Ficha(Base):
    __tablename__ = "fichas"
    id: Mapped[int] = mapped_column(primary_key=True)
    produto_id: Mapped[int] = mapped_column(Integer, default=0)
    ingrediente: Mapped[str] = mapped_column(String(120), default="")
    qtd: Mapped[float] = mapped_column(Float, default=0)
    unidade: Mapped[str] = mapped_column(String(20), default="Kg")
    custo: Mapped[float] = mapped_column(Float, default=0)
class Ingrediente(Base):
    __tablename__ = "ingredientes"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120), default="")
    stock: Mapped[float] = mapped_column(Float, default=0)
    unidade: Mapped[str] = mapped_column(String(20), default="Kg")
    validade: Mapped[str] = mapped_column(String(20), default="")
class Historico(Base):
    __tablename__ = "historico"
    id: Mapped[int] = mapped_column(primary_key=True)
    tipo: Mapped[str] = mapped_column(String(20), default="SAIDA")
    produto: Mapped[str] = mapped_column(String(120), default="")
    quantidade: Mapped[int] = mapped_column(Integer, default=0)
    valor: Mapped[float] = mapped_column(Float, default=0)
    motivo: Mapped[str] = mapped_column(String(20), default="VENDA")
    data: Mapped[datetime] = mapped_column(DateTime, default=agora)
class Fornecedor(Base):
    __tablename__ = "fornecedores"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(120))
    telefone: Mapped[str] = mapped_column(String(30), default="")
    produto: Mapped[str] = mapped_column(String(120), default="")
    preco: Mapped[float] = mapped_column(Float, default=0)
    localizacao: Mapped[str] = mapped_column(String(120), default="")
class Venda(Base):
    __tablename__ = "vendas"
    id: Mapped[int] = mapped_column(primary_key=True)
    cliente: Mapped[str] = mapped_column(String(120), default="Cliente Balcão")
    cliente_tel: Mapped[str] = mapped_column(String(30), default="")
    vendedor: Mapped[str] = mapped_column(String(120), default="")
    produto: Mapped[str] = mapped_column(String(120))
    qtd: Mapped[int] = mapped_column(Integer, default=1)
    total: Mapped[float] = mapped_column(Float, default=0)
    custo_total: Mapped[float] = mapped_column(Float, default=0)
    lucro: Mapped[float] = mapped_column(Float, default=0)
    pagamento: Mapped[str] = mapped_column(String(40), default="M-Pesa")
    estado: Mapped[str] = mapped_column(String(30), default="Pago")
    data_pagamento: Mapped[str] = mapped_column(String(20), default="")
    whatsapp_link: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=agora)
class Despesa(Base):
    __tablename__ = "despesas"
    id: Mapped[int] = mapped_column(primary_key=True)
    descricao: Mapped[str] = mapped_column(String(180))
    valor: Mapped[float] = mapped_column(Float, default=0)
    categoria: Mapped[str] = mapped_column(String(60), default="Geral")
    criado_por: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=agora)
class Compra(Base):
    __tablename__ = "compras"
    id: Mapped[int] = mapped_column(primary_key=True)
    fornecedor: Mapped[str] = mapped_column(String(120))
    produto: Mapped[str] = mapped_column(String(120))
    qtd: Mapped[int] = mapped_column(Integer, default=1)
    preco_unitario: Mapped[float] = mapped_column(Float, default=0)
    total: Mapped[float] = mapped_column(Float, default=0)
    pagamento: Mapped[str] = mapped_column(String(40), default="Dinheiro")
    comprado_por: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=agora)
class Encomenda(Base):
    __tablename__ = "encomendas"
    id: Mapped[int] = mapped_column(primary_key=True)
    cliente: Mapped[str] = mapped_column(String(120))
    telefone: Mapped[str] = mapped_column(String(30), default="")
    tipo: Mapped[str] = mapped_column(String(120))
    data_entrega: Mapped[str] = mapped_column(String(20), default="")
    preco: Mapped[float] = mapped_column(Float, default=0)
    sinal: Mapped[str] = mapped_column(String(60), default="Sem Sinal")
    obs: Mapped[str] = mapped_column(Text, default="")
    ponto: Mapped[str] = mapped_column(Text, default="")
    avaliacao: Mapped[int] = mapped_column(Integer, default=0)
    criado_por: Mapped[str] = mapped_column(String(120), default="")
    cliente_foto: Mapped[str] = mapped_column(Text, default="")
    estado: Mapped[str] = mapped_column(String(30), default="Pendente")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=agora)
class Log(Base):
    __tablename__ = "logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    quem: Mapped[str] = mapped_column(String(120), default="")
    tipo: Mapped[str] = mapped_column(String(30), default="")
    acao: Mapped[str] = mapped_column(String(80))
    detalhe: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=agora)
Base.metadata.create_all(engine)
try:
    with engine.connect() as conn:
        if DBURL.startswith("sqlite"):
            cols_u = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
            if "tema" not in cols_u:
                conn.execute(text("ALTER TABLE users ADD COLUMN tema VARCHAR(20) DEFAULT 'branco'")); conn.commit()
            if "pontos" not in cols_u:
                conn.execute(text("ALTER TABLE users ADD COLUMN pontos INTEGER DEFAULT 0")); conn.commit()
            cols_p = [r[1] for r in conn.execute(text("PRAGMA table_info(products)")).fetchall()]
            if "validade" not in cols_p:
                conn.execute(text("ALTER TABLE products ADD COLUMN validade VARCHAR(20) DEFAULT ''")); conn.commit()
            cols_e = [r[1] for r in conn.execute(text("PRAGMA table_info(encomendas)")).fetchall()]
            if "ponto" not in cols_e:
                conn.execute(text("ALTER TABLE encomendas ADD COLUMN ponto TEXT DEFAULT ''")); conn.commit()
            if "criado_por" not in cols_e:
                conn.execute(text("ALTER TABLE encomendas ADD COLUMN criado_por VARCHAR(120) DEFAULT ''")); conn.commit()
            if "avaliacao" not in cols_e:
                conn.execute(text("ALTER TABLE encomendas ADD COLUMN avaliacao INTEGER DEFAULT 0")); conn.commit()
            if "cliente_foto" not in cols_e:
                conn.execute(text("ALTER TABLE encomendas ADD COLUMN cliente_foto TEXT DEFAULT ''")); conn.commit()
        else:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS tema VARCHAR(20) DEFAULT 'branco'"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS pontos INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS validade VARCHAR(20) DEFAULT ''"))
            conn.execute(text("ALTER TABLE encomendas ADD COLUMN IF NOT EXISTS ponto TEXT DEFAULT ''"))
            conn.execute(text("ALTER TABLE encomendas ADD COLUMN IF NOT EXISTS criado_por VARCHAR(120) DEFAULT ''"))
            conn.execute(text("ALTER TABLE encomendas ADD COLUMN IF NOT EXISTS avaliacao INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE encomendas ADD COLUMN IF NOT EXISTS cliente_foto TEXT DEFAULT ''"))
            conn.commit()
except Exception as e:
    print("Migracao ignorada:", e)
def dbdep():
    d = SessionLocal()
    try:
        yield d
    finally:
        d.close()
def log_action(d, quem, tipo, acao, detalhe=""):
    try:
        d.add(Log(quem=quem, tipo=tipo, acao=acao, detalhe=detalhe[:600])); d.commit()
    except Exception:
        d.rollback()
def make_token(u):
    return jwt.encode({"sub": str(u.id), "exp": datetime.now(timezone.utc) + timedelta(hours=24)}, SECRET, algorithm="HS256")
def clean_tel(tel):
    return re.sub(r"\D", "", tel or "")
def normalizar_tipo(tipo):
    t = (tipo or "Cliente").strip().lower()
    if "funcion" in t:
        return "Funcionário"
    if "admin" in t:
        return "Admin"
    return "Cliente"
def is_funcionario(u):
    return u.is_admin or normalizar_tipo(u.tipo) == "Funcionário"
def is_cliente(u):
    return (not u.is_admin) and normalizar_tipo(u.tipo) == "Cliente"
def whatsapp_link(tel, msg):
    tel = clean_tel(tel)
    if not tel:
        return ""
    if tel.startswith("0"):
        tel = "258" + tel[1:]
    if not tel.startswith("258"):
        tel = "258" + tel
    return f"https://wa.me/{tel}?text={quote(msg)}"
def pagar_mpesa(telefone, valor):
    return {"ok": True, "metodo": "M-Pesa", "telefone": telefone, "valor": valor, "ref": f"MPESA-{datetime.now().strftime('%Y%m%d%H%M%S')}"}
def pagar_emola(telefone, valor):
    return {"ok": True, "metodo": "e-Mola", "telefone": telefone, "valor": valor, "ref": f"EMOLA-{datetime.now().strftime('%Y%m%d%H%M%S')}"}
def normalizar_sinal(s):
    s = (s or "").strip()
    if "50" in s:
        return "Sinal 50% - Vou pagar 50% agora e resto na entrega"
    if "Total" in s or "tudo" in s.lower() or "Pago Total" in s:
        return "Pago Total - Já paguei tudo"
    return "Sem Sinal - Ainda não paguei, vou pagar na entrega"
def verificar_senha_admin(admin, senha):
    if not senha:
        return False
    try:
        return pwd.verify(senha, admin.password_hash)
    except Exception:
        return False
def verificar_limpar(x, admin):
    if x.confirmar.strip().upper() != "LIMPAR":
        raise HTTPException(400, "Para limpar escreve LIMPAR no campo de confirmação.")
    if not verificar_senha_admin(admin, x.senha_admin):
        raise HTTPException(401, "Senha do Admin errada!")
def fornecedores_padrao(d):
    for f in [("Farinha Matola", "841234567", "Farinha 50kg", 1800, "Matola"), ("Ovos Maputo", "849876543", "Ovos 30 un", 900, "Maputo"), ("Açúcar Matola", "842222333", "Açúcar 25kg", 1500, "Matola")]:
        d.add(Fornecedor(nome=f[0], telefone=f[1], produto=f[2], preco=f[3], localizacao=f[4]))
def init_data():
    d = SessionLocal()
    try:
        if not d.query(User).filter_by(telefone="840000000").first():
            d.add(User(nome="Jequessene", telefone="840000000", idade=18, email="jequessene@padaria.co.mz", pais="Moçambique", bairro="Matola", tipo="Admin", password_hash=pwd.hash(os.getenv("ADMIN_PASSWORD", "Jequessene12345")), is_admin=True)); d.commit()
        if d.query(Product).count() == 0:
            dados = [("Pão Caseiro", "Pães", 80, 30, 40), ("Pão de Forma", "Pães", 150, 70, 20), ("Bolo de Chocolate", "Bolos", 800, 400, 5), ("Bolo de Aniversário", "Bolos", 2500, 1200, 2), ("Pastel de Nata (6)", "Pastéis", 300, 150, 20), ("Croissant", "Pastéis", 120, 60, 15), ("Cupcake", "Doces", 100, 45, 18), ("Donut", "Doces", 90, 40, 12), ("Chamuça", "Salgados", 60, 25, 30), ("Sumo Natural", "Bebidas", 120, 50, 15)]
            for p in dados:
                d.add(Product(nome=p[0], categoria=p[1], preco=p[2], custo=p[3], stock=p[4]))
            d.commit()
        if d.query(Fornecedor).count() == 0:
            fornecedores_padrao(d); d.commit()
    finally:
        d.close()
init_data()
oauth = OAuth2PasswordBearer(tokenUrl="/api/login", auto_error=False)
def current_user(request: Request, tok: str = Depends(oauth), d: Session = Depends(dbdep)):
    token = tok or request.query_params.get("token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth.replace("Bearer ", "")
    if not token:
        raise HTTPException(401, "Sessão inválida. Faz login de novo.")
    try:
        uid = int(jwt.decode(token, SECRET, algorithms=["HS256"])["sub"])
    except Exception:
        raise HTTPException(401, "Sessão inválida.")
    u = d.get(User, uid)
    if not u or not u.is_active:
        raise HTTPException(401, "Conta indisponível.")
    return u
def admin_only(u: User = Depends(current_user)):
    if not u.is_admin:
        raise HTTPException(403, "Só Admin Jequessene.")
    return u
def funcionario_only(u: User = Depends(current_user)):
    if not is_funcionario(u):
        raise HTTPException(403, "Como Cliente não podes ver o Dashboard / Vendas da padaria. Vê só Produtos e Encomendas.")
    return u
app = FastAPI(title="PADARIA")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.mount("/static", StaticFiles(directory="static"), name="static")
@app.get("/", response_class=HTMLResponse)
def home():
    return open("static/index.html", encoding="utf-8").read()
@app.get("/api/health")
def health():
    return {"status": "ok", "app": "PADARIA"}
class Register(BaseModel):
    nome: str; telefone: str; idade: int = 18; email: str = ""; foto: str = ""; pais: str = "Moçambique";```python
    bairro: str = "Matola"; tipo: str = "Cliente"; password: str
class Login(BaseModel):
    telefone: str; password: str
class SwitchIn(BaseModel):
    target_telefone: str; admin_password: str
class ProdIn(BaseModel):
    nome: str; categoria: str = "Pães"; preco: float = 0; custo: float = 0; stock: int = 0; stock_minimo: int = 5; foto: str = ""; validade: str = ""
class FornIn(BaseModel):
    nome: str; telefone: str = ""; produto: str = ""; preco: float = 0; localizacao: str = ""
class CompraIn(BaseModel):
    fornecedor_id: int; produto: str; qtd: int = 1; preco_unitario: float = 0; pagamento: str = "Dinheiro"
class VendaIn(BaseModel):
    produto_id: int; qtd: int = 1; cliente: str = "Cliente Balcão"; cliente_tel: str = ""; pagamento: str = "M-Pesa"; data_pagamento: str = ""
class DespesaIn(BaseModel):
    descricao: str; valor: float; categoria: str = "Geral"
class EncIn(BaseModel):
    cliente: str = ""; telefone: str = ""; tipo: str = "Bolo de Aniversário"; data_entrega: str = ""; preco: float = 0; sinal: str = "Sem Sinal"; obs: str = ""
class PontoIn(BaseModel):
    ponto: str = ""; avaliacao: int = 0
class SenhaIn(BaseModel):
    antiga: str; nova: str
class PessoaEditIn(BaseModel):
    nome: str = ""; bairro: str = ""; tipo: str = ""; email: str = ""
class PerfilIn(BaseModel):
    nome: str = ""; bairro: str = ""; foto: str = ""; email: str = ""
class LimparIn(BaseModel):
    confirmar: str = ""; senha_admin: str = ""
class FichaIn(BaseModel):
    itens: list = []
class IngredienteIn(BaseModel):
    nome: str; stock: float = 0; unidade: str = "Kg"; validade: str = ""
class EstadoIn(BaseModel):
    estado: str = "Pendente"
@app.post("/api/register")
def register(x: Register, d: Session = Depends(dbdep)):
    tel = clean_tel(x.telefone)
    if len(tel) < 9:
        raise HTTPException(400, "Telefone inválido.")
    existente = d.query(User).filter_by(telefone=tel).first()
    if existente:
        try:
            ok = pwd.verify(x.password, existente.password_hash)
        except Exception:
            ok = False
        if ok:
            if not existente.is_active:
                raise HTTPException(403, "Conta bloqueada. Fala com o Admin.")
            return {"token": make_token(existente), "user": {"nome": existente.nome, "tipo": existente.tipo}, "ja_tinha_conta": True}
        raise HTTPException(409, "Este número já tem conta! Vai para ENTRAR.")
    if not x.password or len(x.password) < 4:
        raise HTTPException(400, "Senha curta, usa 4+ caracteres.")
    u = User(nome=x.nome.strip(), telefone=tel, idade=x.idade, email=x.email, foto=x.foto, pais=x.pais, bairro=x.bairro, tipo=normalizar_tipo(x.tipo), password_hash=pwd.hash(x.password))
    d.add(u); d.commit(); log_action(d, u.nome, u.tipo, "registo", f"{u.nome} - {tel}")
    return {"token": make_token(u), "user": {"nome": u.nome, "tipo": u.tipo}}
@app.post("/api/login")
def login(x: Login, d: Session = Depends(dbdep)):
    tel = clean_tel(x.telefone)
    u = d.query(User).filter_by(telefone=tel).first()
    if not u:
        raise HTTPException(401, "Este número ainda não tem conta. Clica em Criar Conta.")
    try:
        ok = pwd.verify(x.password, u.password_hash)
    except Exception:
        ok = False
    if not ok:
        raise HTTPException(401, "Telefone ou senha errada.")
    if not u.is_active:
        raise HTTPException(403, "Conta bloqueada. Fala com o Admin.")
    log_action(d, u.nome, u.tipo, "login", "Entrou")
    return {"token": make_token(u), "user": {"nome": u.nome, "tipo": u.tipo, "is_admin": u.is_admin}}
@app.get("/api/me")
def me(u: User = Depends(current_user)):
    return {"id": u.id, "nome": u.nome, "telefone": u.telefone, "idade": u.idade, "email": u.email, "foto": u.foto, "pais": u.pais, "bairro": u.bairro, "tipo": u.tipo, "is_admin": u.is_admin, "pontos": getattr(u, "pontos", 0) or 0, "tema": getattr(u, "tema", "branco") or "branco"}
@app.post("/api/tema")
def salvar_tema(tema: str = Query("branco"), u: User = Depends(current_user), d: Session = Depends(dbdep)):
    try:
        u.tema = "preto" if tema == "preto" else "branco"; d.commit()
    except Exception:
        d.rollback()
    return {"ok": True, "tema": tema}
@app.get("/api/tema")
def ler_tema(u: User = Depends(current_user)):
    return {"tema": getattr(u, "tema", "branco") or "branco"}
@app.put("/api/me")
def atualizar_meu_perfil(x: PerfilIn, u: User = Depends(current_user), d: Session = Depends(dbdep)):
    if x.nome:
        u.nome = x.nome
    if x.bairro:
        u.bairro = x.bairro
    if x.email:
        u.email = x.email
    if x.foto:
        u.foto = x.foto
    d.commit(); log_action(d, u.nome, u.tipo, "perfil_foto", "Trocou foto / perfil")
    return {"ok": True, "msg": "Perfil atualizado!", "foto": u.foto}
@app.post("/api/me/senha")
def mudar_senha(x: SenhaIn, u: User = Depends(current_user), d: Session = Depends(dbdep)):
    try:
        ok = pwd.verify(x.antiga, u.password_hash)
    except Exception:
        ok = False
    if not ok:
        raise HTTPException(401, "Senha antiga errada.")
    if len(x.nova) < 4:
        raise HTTPException(400, "Nova senha muito curta")
    u.password_hash = pwd.hash(x.nova); d.commit(); log_action(d, u.nome, u.tipo, "senha_trocada", "Trocou a senha")
    return {"ok": True, "msg": "Senha trocada com sucesso!"}
@app.get("/api/pessoas")
def pessoas(u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    lista = d.query(User).all() if u.is_admin else d.query(User).filter_by(tipo="Cliente").all()
    return [{"id": x.id, "nome": x.nome, "telefone": x.telefone, "idade": x.idade, "email": x.email, "foto": x.foto, "pais": x.pais, "bairro": x.bairro, "tipo": x.tipo, "pontos": getattr(x, "pontos", 0) or 0, "active": x.is_active} for x in lista]
@app.post("/api/pessoas/{pid}/demitir")
def demitir_pessoa(pid: int, a: User = Depends(admin_only), d: Session = Depends(dbdep)):
    u = d.get(User, pid)
    if not u:
        raise HTTPException(404, "Pessoa não existe")
    if u.is_admin:
        raise HTTPException(400, "Não podes demitir o Admin!")
    u.is_active = False; d.commit(); log_action(d, a.nome, "Admin", "demitir", f"Demitiu {u.nome}")
    return {"ok": True, "msg": f"{u.nome} demitido"}
@app.post("/api/pessoas/{pid}/reativar")
def reativar_pessoa(pid: int, a: User = Depends(admin_only), d: Session = Depends(dbdep)):
    u = d.get(User, pid)
    if not u:
        raise HTTPException(404, "Pessoa não existe")
    u.is_active = True; d.commit(); log_action(d, a.nome, "Admin", "reativar", f"Reativou {u.nome}")
    return {"ok": True, "msg": f"{u.nome} reativado"}
@app.delete("/api/pessoas/{pid}")
def apagar_pessoa(pid: int, a: User = Depends(admin_only), d: Session = Depends(dbdep)):
    u = d.get(User, pid)
    if not u:
        raise HTTPException(404, "Pessoa não existe")
    if u.is_admin:
        raise HTTPException(400, "Não podes apagar o Admin!")
    nome = u.nome; d.delete(u); d.commit(); log_action(d, a.nome, "Admin", "apagar_pessoa", f"Apagou {nome}")
    return {"ok": True, "msg": f"{nome} apagado"}
@app.put("/api/pessoas/{pid}")
def editar_pessoa(pid: int, x: PessoaEditIn, a: User = Depends(admin_only), d: Session = Depends(dbdep)):
    u = d.get(User, pid)
    if not u:
        raise HTTPException(404, "Pessoa não existe")
    if x.nome:
        u.nome = x.nome
    if x.bairro:
        u.bairro = x.bairro
    if x.email:
        u.email = x.email
    if x.tipo:
        u.tipo = normalizar_tipo(x.tipo)
    d.commit()
    return {"ok": True, "msg": "Pessoa atualizada"}
@app.get("/api/alertas")
def alertas(u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    prods = d.query(Product).all()
    msgs = []
    for p in prods:
        if p.stock <= 0:
            msgs.append(f"ACABOU: {p.nome}")
        elif p.stock <= p.stock_minimo:
            msgs.append(f"ESTÁ A ACABAR: {p.nome} - só tem {p.stock}")
    hoje = date.today().isoformat()
    for p in prods:
        if p.validade and p.validade < hoje:
            msgs.append(f"VENCIDO: {p.nome} - validade {p.validade}")
        elif p.validade and p.validade <= (date.today() + timedelta(days=3)).isoformat():
            msgs.append(f"A VENCER: {p.nome} - {p.validade}")
    return {"total": len(msgs), "mensagens": msgs, "tem_alerta": len(msgs) > 0}
@app.post("/api/admin/switch")
def switch_account(x: SwitchIn, a: User = Depends(admin_only), d: Session = Depends(dbdep)):
    if not verificar_senha_admin(a, x.admin_password):
        raise HTTPException(401, "Senha do Admin errada!")
    t = d.query(User).filter_by(telefone=clean_tel(x.target_telefone)).first()
    if not t:
        raise HTTPException(404, "Pessoa não existe.")
    if not t.is_active:
        raise HTTPException(403, "Essa conta está demitida.")
    log_action(d, a.nome, "Admin", "troca_conta", f"Admin entrou na conta de {t.nome}")
    return {"token": make_token(t), "user": {"nome": t.nome, "tipo": t.tipo}}
@app.get("/api/products")
def get_products(u: User = Depends(current_user), d: Session = Depends(dbdep)):
    return [{"id": p.id, "nome": p.nome, "categoria": p.categoria, "preco": p.preco, "custo": p.custo if is_funcionario(u) else 0, "stock": p.stock, "stock_minimo": p.stock_minimo, "foto": p.foto, "validade": getattr(p, "validade", "") or "", "lucro": (p.preco - p.custo) if is_funcionario(u) else 0, "alerta": p.stock <= p.stock_minimo, "updated_by": p.updated_by} for p in d.query(Product).order_by(Product.nome).all()]
@app.post("/api/products")
def add_product(x: ProdIn, u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    if not u.is_admin and normalizar_tipo(u.tipo) == "Funcionário":
        raise HTTPException(403, "Funcionário não pode criar produto com preço. Pede ao Admin.")
    p = Product(**x.model_dump()); p.updated_by = u.nome; d.add(p); d.commit(); log_action(d, u.nome, u.tipo, "produto_criar", x.nome)
    return {"ok": True}
@app.put("/api/products/{pid}")
def edit_product(pid: int, x: ProdIn, u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    p = d.get(Product, pid)
    if not p:
        raise HTTPException(404, "Não existe")
    dados = x.model_dump()
    if not dados.get("foto"):
        dados.pop("foto")
    if not u.is_admin and normalizar_tipo(u.tipo) == "Funcionário":
        p.stock = dados.get("stock", p.stock); p.nome = dados.get("nome", p.nome)
        if dados.get("validade"):
            p.validade = dados["validade"]
    else:
        for k, v in dados.items():
            setattr(p, k, v)
    p.updated_by = u.nome; p.updated_at = agora(); d.commit(); log_action(d, u.nome, u.tipo, "produto_editar", p.nome)
    return {"ok": True}
@app.delete("/api/products/{pid}")
def del_product(pid: int, a: User = Depends(admin_only), d: Session = Depends(dbdep)):
    p = d.get(Product, pid)
    if not p:
        raise HTTPException(404, "Não existe")
    d.delete(p); d.commit(); log_action(d, a.nome, "Admin", "produto_apagar", p.nome)
    return {"ok": True}
@app.get("/api/products/{pid}/ficha")
def get_ficha(pid: int, u: User = Depends(admin_only), d: Session = Depends(dbdep)):
    return [{"id": f.id, "ingrediente": f.ingrediente, "qtd": f.qtd, "unidade": f.unidade, "custo": f.custo} for f in d.query(Ficha).filter_by(produto_id=pid).all()]
@app.post("/api/products/{pid}/ficha")
def save_ficha(pid: int, x: FichaIn, u: User = Depends(admin_only), d: Session = Depends(dbdep)):
    d.query(Ficha).filter_by(produto_id=pid).delete()
    total = 0
    for i in x.itens or []:
        f = Ficha(produto_id=pid, ingrediente=i.get("ingrediente", ""), qtd=float(i.get("qtd", 0) or 0), unidade=i.get("unidade", "Kg"), custo=float(i.get("custo", 0) or 0)); d.add(f); total += float(i.get("custo", 0) or 0)
    p = d.get(Product, pid)
    if p:
        p.custo = total
    d.commit()
    return {"ok": True, "msg": f"Ficha guardada! Custo real: {total} MT"}
@app.get("/api/ingredientes")
def list_ing(u: User = Depends(admin_only), d: Session = Depends(dbdep)):
    return [{"id": x.id, "nome": x.nome, "stock": x.stock, "unidade": x.unidade, "validade": x.validade} for x in d.query(Ingrediente).all()]
@app.post("/api/ingredientes")
def add_ing(x: IngredienteIn, u: User = Depends(admin_only), d: Session = Depends(dbdep)):
    ing = Ingrediente(**x.model_dump()); d.add(ing); d.commit()
    return {"ok": True, "msg": "Ingrediente adicionado"}
@app.get("/api/fornecedores")
def get_forn(u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    return [{"id": f.id, "nome": f.nome, "telefone": f.telefone, "produto": f.produto, "preco": f.preco, "localizacao": f.localizacao} for f in d.query(Fornecedor).all()]
@app.post("/api/fornecedores")
def add_forn(x: FornIn, u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    f = Fornecedor(**x.model_dump()); d.add(f); d.commit()
    return {"ok": True}
@app.post("/api/compras")
def add_compra(x: CompraIn, u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    f = d.get(Fornecedor, x.fornecedor_id)
    if not f:
        raise HTTPException(404, "Fornecedor não existe")
    total = x.qtd * x.preco_unitario
    c = Compra(fornecedor=f.nome, produto=x.produto, qtd=x.qtd, preco_unitario=x.preco_unitario, total=total, pagamento=x.pagamento, comprado_por=u.nome); d.add(c); d.commit(); log_action(d, u.nome, u.tipo, "compra", f"{x.produto} x{x.qtd} = {total} MT")
    d.add(Historico(tipo="ENTRADA", produto=x.produto, quantidade=x.qtd, valor=total, motivo="COMPRA")); d.commit()
    return {"ok": True, "total": total, "compra_id": c.id}
@app.get("/api/financeiro")
def financeiro(u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    vendas = d.query(Venda).order_by(Venda.created_at.desc()).limit(300).all()
    despesas = d.query(Despesa).order_by(Despesa.created_at.desc()).limit(300).all()
    compras = d.query(Compra).order_by(Compra.created_at.desc()).limit(300).all()
    return {"vendas": [{"id": v.id, "cliente": v.cliente, "cliente_tel": v.cliente_tel, "vendedor": v.vendedor, "produto": v.produto, "qtd": v.qtd, "total": v.total, "lucro": v.lucro, "pagamento": v.pagamento, "estado": v.estado, "data_pagamento": v.data_pagamento, "whatsapp_link": v.whatsapp_link, "data": v.created_at.isoformat(), "hora": v.created_at.strftime("%H:%M:%S")} for v in vendas], "despesas": [{"id": x.id, "descricao": x.descricao, "valor": x.valor, "categoria": x.categoria, "criado_por": x.criado_por, "data": x.created_at.isoformat()} for x in despesas], "compras": [{"id": c.id, "fornecedor": c.fornecedor, "produto": c.produto, "qtd": c.qtd, "total": c.total, "pagamento": c.pagamento, "comprado_por": c.comprado_por, "data": c.created_at.isoformat()} for c in compras], "dividas": [{"id": v.id, "cliente": v.cliente, "cliente_tel": v.cliente_tel, "produto": v.produto, "total": v.total, "data": v.created_at.strftime("%d/%m/%Y %H:%M"), "data_pagamento": v.data_pagamento, "whatsapp_link": v.whatsapp_link} for v in vendas if v.estado == "Dívida"], "resumo": {"entradas": sum(v.total for v in vendas), "lucro_vendas": sum(v.lucro for v in vendas), "saidas": sum(x.valor for x in despesas), "compras_total": sum(c.total for c in compras), "lucro_liquido": sum(v.total for v in vendas) - sum(c.total for c in compras) - sum(x.valor for x in despesas), "dividas": sum(v.total for v in vendas if v.estado == "Dívida")}}
@app.post("/api/vendas")
def add_venda(x: VendaIn, u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    p = d.get(Product, x.produto_id)
    if not p:
        raise HTTPException(404, "Produto não existe")
    if p.stock < x.qtd:
        raise HTTPException(400, f"Stock insuficiente! Só tem {p.stock}")
    p.stock -= x.qtd; total = p.preco * x.qtd; custo = p.custo * x.qtd; lucro = total - custo
    estado = "Dívida" if "Fiado" in x.pagamento or "Dívida" in x.pagamento else "Pago"
    pag_info = ""
    if x.pagamento == "M-Pesa":
        pag_info = str(pagar_mpesa(x.cliente_tel, total))
    if x.pagamento == "e-Mola":
        pag_info = str(pagar_emola(x.cliente_tel, total))
    msg = f"Ola {x.cliente}! Obrigado pela compra na Padaria Jequessene. {p.nome} x{x.qtd} = {total} MT. Pagamento: {x.pagamento}. Volte sempre!"
    wa = whatsapp_link(x.cliente_tel, msg) if x.cliente_tel else ""
    v = Venda(cliente=x.cliente, cliente_tel=x.cliente_tel, vendedor=u.nome, produto=p.nome, qtd=x.qtd, total=total, custo_total=custo, lucro=lucro, pagamento=x.pagamento, estado=estado, data_pagamento=x.data_pagamento, whatsapp_link=wa); d.add(v); d.commit(); log_action(d, u.nome, u.tipo, "venda", f"{p.nome} x{x.qtd} = {total} MT")
    d.add(Historico(tipo="SAIDA", produto=p.nome, quantidade=x.qtd, valor=total, motivo="VENDA")); d.commit()
    return {"ok": True, "total": total, "lucro": lucro, "venda_id": v.id, "whatsapp_link": wa, "pagamento_info": pag_info}
@app.post("/api/vendas/{vid}/pagar")
def pagar(vid: int, u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    v = d.get(Venda, vid)
    if not v:
        raise HTTPException(404, "Não existe")
    v.estado = "Pago"; v.pagamento = "M-Pesa (Pago)"; d.commit(); log_action(d, u.nome, u.tipo, "divida_paga", f"{v.cliente} pagou {v.total} MT")
    return {"ok": True}
@app.post("/api/vendas/{vid}/anular")
def anular_venda(vid: int, a: User = Depends(admin_only), d: Session = Depends(dbdep)):
    v = d.get(Venda, vid)
    if not v:
        raise HTTPException(404, "Não existe")
    p = d.query(Product).filter_by(nome=v.produto).first()
    if p:
        p.stock += v.qtd
    d.delete(v); d.commit(); log_action(d, a.nome, "Admin", "anular_venda", f"Anulou venda {vid} - {v.produto}")
    return {"ok": True, "msg": "Venda anulada pelo Admin"}
@app.post("/api/despesas")
def add_despesa(x: DespesaIn, u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    ds = Despesa(**x.model_dump(), criado_por=u.nome); d.add(ds); d.commit(); log_action(d, u.nome, u.tipo, "despesa", f"{x.descricao} = {x.valor} MT")
    return {"ok": True}
@app.get("/api/encomendas")
def get_enc(u: User = Depends(current_user), d: Session = Depends(dbdep)):
    if u.is_admin or is_funcionario(u):
        lista = d.query(Encomenda).order_by(Encomenda.created_at.desc()).all()
    else:
        lista = d.query(Encomenda).filter((Encomenda.telefone == u.telefone) | (Encomenda.criado_por == u.nome)).order_by(Encomenda.created_at.desc()).all()
    out = []
    for e in lista:
        cli = d.query(User).filter_by(telefone=e.telefone).first() if e.telefone else None
        foto = (cli.foto if cli else "") or getattr(e, "cliente_foto", "") or ""
        out.append({"id": e.id, "cliente": e.cliente, "telefone": e.telefone, "tipo": e.tipo, "data_entrega": e.data_entrega, "preco": e.preco, "sinal": e.sinal, "obs": e.obs, "ponto": getattr(e, "ponto", "") or "", "avaliacao": getattr(e, "avaliacao", 0) or 0, "criado_por": getattr(e, "criado_por", "") or "", "cliente_foto": foto, "estado": e.estado, "whatsapp_link": whatsapp_link(e.telefone, f"Ola {e.cliente}! A tua encomenda {e.tipo} esta {e.estado}.")})
    return out
@app.post("/api/encomendas")
def add_enc(x: EncIn, u: User = Depends(current_user), d: Session = Depends(dbdep)):
    if is_funcionario(u):
        raise HTTPException(403, "Admin / Funcionário não pode fazer encomenda. Só o Cliente encomenda.")
    prod = d.query(Product).filter_by(nome=x.tipo).first()
    preco_real = prod.preco if prod else 0
    e = Encomenda(cliente=u.nome, telefone=u.telefone, tipo=x.tipo, data_entrega=x.data_entrega, preco=preco_real, sinal=normalizar_sinal(x.sinal), obs=x.obs)
    e.criado_por = u.nome; e.cliente_foto = u.foto or ""
    d.add(e); d.commit(); log_action(d, u.nome, u.tipo, "encomenda", f"{x.tipo} para {u.nome} - {preco_real} MT - {e.sinal}")
    return {"ok": True, "id": e.id, "preco": preco_real, "msg": f"Encomenda guardada! Preço: {preco_real} MT."}
@app.post("/api/encomendas/{eid}/entregar")
def entregar(eid: int, u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    e = d.get(Encomenda, eid)
    if not e:
        raise HTTPException(404, "Não existe")
    if e.estado == "Entregue":
        return {"ok": True}
    e.estado = "Entregue"; d.commit()
    p = d.query(Product).filter_by(nome=e.tipo).first()
    total = e.preco or (p.preco if p else 0); custo = p.custo if p else 0
    if p and p.stock > 0:
        p.stock -= 1
    v = Venda(cliente=e.cliente, cliente_tel=e.telefone, vendedor=u.nome, produto=e.tipo, qtd=1, total=total, custo_total=custo, lucro=total - custo, pagamento="Encomenda", estado="Pago", data_pagamento=e.data_entrega)
    d.add(v)
    cli = d.query(User).filter_by(telefone=e.telefone).first()
    if cli:
        cli.pontos = (getattr(cli, "pontos", 0) or 0) + int(total // 100)
    d.commit(); log_action(d, u.nome, u.tipo, "encomenda_entregue_venda", f"{e.tipo} entregue -> venda {total} MT")
    return {"ok": True}
@app.post("/api/encomendas/{eid}/cancelar")
def cancelar_enc(eid: int, u: User = Depends(current_user), d: Session = Depends(dbdep)):
    e = d.get(Encomenda, eid)
    if not e:
        raise HTTPException(404, "Não existe")
    if e.estado == "Entregue":
        raise HTTPException(400, "Já entregue, não pode cancelar")
    if not u.is_admin and e.telefone != u.telefone:
        raise HTTPException(403, "Não é tua encomenda")
    e.estado = "Cancelada"; d.commit(); log_action(d, u.nome, u.tipo, "encomenda_cancelada", f"Cancelou {e.tipo}")
    return {"ok": True, "msg": "Encomenda cancelada"}
@app.post("/api/encomendas/{eid}/estado")
def mudar_estado(eid: int, x: EstadoIn, u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    e = d.get(Encomenda, eid)
    if not e:
        raise HTTPException(404, "Não existe")
    e.estado = x.estado; d.commit()
    return {"ok": True, "msg": f"Estado: {e.estado}"}
@app.post("/api/encomendas/{eid}/ponto")
def deixar_ponto(eid: int, x: PontoIn, u: User = Depends(current_user), d: Session = Depends(dbdep)):
    e = d.get(Encomenda, eid)
    if not e:
        raise HTTPException(404, "Não existe")
    e.ponto = x.ponto; e.avaliacao = x.avaliacao; d.commit(); log_action(d, u.nome, u.tipo, "ponto_cliente", f"{u.nome} deixou ponto: {x.ponto[:100]}")
    return {"ok": True, "msg": "Ponto guardado!"}
@app.get("/api/dashboard")
def dashboard(u: User = Depends(funcionario_only), d: Session = Depends(dbdep)):
    vendas = d.query(Venda).all(); produtos = d.query(Product).all(); users = d.query(User).all(); despesas = d.query(Despesa).all(); compras = d.query(Compra).all(); hoje = date.today()
    def soma(dia):
        vs = [x for x in vendas if x.created_at.date() == dia]; cs = [x for x in compras if x.created_at.date() == dia]; ds = [x for x in despesas if x.created_at.date() == dia]
        return {"data": dia.isoformat(), "label": dia.strftime("%d/%m"), "vendas": sum(x.total for x in vs), "lucro": sum(x.lucro for x in vs) - sum(x.total for x in cs) - sum(x.valor for x in ds), "n": len(vs)}
    ult7 = [soma(hoje - timedelta(days=i)) for i in range(6, -1, -1)]
    cont = {}
    for v in vendas:
        cont[v.produto] = cont.get(v.produto, 0) + v.qtd
    mais = sorted(cont.items(), key=lambda x: x[1], reverse=True)[:5]
    por_pag = {}
    for v in vendas:
        por_pag[v.pagamento] = por_pag.get(v.pagamento, 0) + v.total
    mes_vendas = sum(x.total for x in vendas if x.created_at.month == hoje.month)
    mes_lucro = sum(x.lucro for x in vendas if x.created_at.month == hoje.month) - sum(x.total for x in compras if x.created_at.month == hoje.month) - sum(x.valor for x in despesas if x.created_at.month == hoje.month)
    META_MES = 50000
    def foto_cliente(v):
        cli = None
        if v.cliente_tel:
            cli = d.query(User).filter_by(telefone=v.cliente_tel).first()
        if not cli:
            cli = d.query(User).filter_by(nome=v.cliente).first()
        return (cli.foto if cli else "") or ""
    ult_vendas = sorted(vendas, key=lambda x: x.created_at, reverse=True)[:8]
    quem_comprou = [{"cliente": v.cliente, "foto": foto_cliente(v), "produto": v.produto, "qtd": v.qtd, "total": v.total, "pagamento": v.pagamento, "data": v.created_at.strftime("%d/%m %H:%M")} for v in ult_vendas]
    vendas_enc = [{"cliente": v.cliente, "foto": foto_cliente(v), "produto": v.produto, "total": v.total, "data": v.created_at.strftime("%d/%m %H:%M")} for v in vendas if v.pagamento == "Encomenda"]
    return {"hoje": ult7[-1], "semana": {"vendas": sum(x["vendas"] for x in ult7), "lucro": sum(x["lucro"] for x in ult7)}, "mes": {"vendas": mes_vendas, "lucro": mes_lucro}, "meta": {"objetivo": META_MES, "atingido": mes_vendas, "pct": min(100, round(mes_vendas / META_MES * 100)) if META_MES else 0, "falta": max(0, META_MES - mes_vendas)}, "grafico": ult7, "mais_vendidos": [{"produto": k, "qtd": v} for k, v in mais], "por_pagamento": por_pag, "quem_comprou": quem_comprou, "vendas_encomendas": vendas_enc, "totais": {"clientes": len([x for x in users if x.tipo == "Cliente"]), "funcionarios": len([x for x in users if normalizar_tipo(x.tipo) == "Funcionário"]), "produtos": len(produtos), "vendas_total": sum(v.total for v in vendas), "lucro_liquido": sum(v.total for v in vendas) - sum(c.total for c in compras) - sum(x.valor for x in despesas), "dividas": sum(v.total for v in vendas if v.estado == "Dívida")}}
@app.get("/api/recibo/venda/{vid}")
def recibo_venda_pdf(vid: int, d: Session = Depends(dbdep), u: User = Depends(funcionario_only)):
    v = d.get(Venda, vid)
    if not v:
        raise HTTPException(404, "Não existe")
    pdf = FPDF(); pdf.add_page(); pdf.set_font("Helvetica", "B", 18); pdf.cell(0, 12, "PADARIA JEQUESSENE", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.set_font("Helvetica", "", 11); pdf.cell(0, 8, f"Recibo Venda #{vid} - {v.created_at.strftime('%d/%m/%Y %H:%M')}", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(0, 8, f"Cliente: {v.cliente} | Vendedor: {v.vendedor}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, f"Produto: {v.produto} x{v.qtd} | Pagamento: {v.pagamento} | Estado: {v.estado}", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 14); pdf.cell(0, 12, f"TOTAL: {v.total} MT | Lucro: {v.lucro} MT", new_x="LMARGIN", new_y="NEXT")
    out = bytes(pdf.output())
    return Response(content=out
