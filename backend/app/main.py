import os
from fastapi.responses import StreamingResponse
from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import extract
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from typing import List
from fastapi.responses import StreamingResponse
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from datetime import datetime

from . import models, schemas, database, auth

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção, trocaremos para o endereço exato do React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Diz para o FastAPI que o token de acesso será gerado na rota "/login"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Função que funciona como o "Segurança da Porta": extrai e valida o Token
def get_usuario_atual(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    erro_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais (Token inválido ou expirado)",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Tenta abrir o token com a nossa chave secreta
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise erro_credenciais
    except JWTError:
        raise erro_credenciais
        
    # Vai no banco e verifica se o usuário do token realmente existe
    usuario = db.query(models.Usuario).filter(models.Usuario.username == username).first()
    if usuario is None:
        raise erro_credenciais
    return usuario

# Rotas de Usuário e Login
@app.post("/usuarios/", response_model=schemas.Usuario)
def criar_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(database.get_db)):
    # Verifica se o nome de usuário já existe
    usuario_existente = db.query(models.Usuario).filter(models.Usuario.username == usuario.username).first()
    if usuario_existente:
        raise HTTPException(status_code=400, detail="Usuário já cadastrado.")
    
    # Criptografa a senha antes de salvar no banco
    senha_criptografada = auth.obter_hash_senha(usuario.password)
    novo_usuario = models.Usuario(username=usuario.username, hashed_password=senha_criptografada)
    
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@app.post("/login/")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    # Busca o usuário
    usuario = db.query(models.Usuario).filter(models.Usuario.username == form_data.username).first()
    
    # Confere se o usuário existe e se a senha digitada bate com a do banco
    if not usuario or not auth.verificar_senha(form_data.password, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Gera o Token
    token_jwt = auth.criar_token_acesso(dados={"sub": usuario.username})
    return {"access_token": token_jwt, "token_type": "bearer"}

# Rota para salvar uma nova transação
@app.post("/transacoes/", response_model=schemas.Transacao)
def criar_transacao(
    transacao: schemas.TransacaoCreate, 
    db: Session = Depends(database.get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual)):    

    # Salva no banco de dados
    nova_transacao = models.Transacao(**transacao.model_dump(), usuario_id=usuario_atual.id)
    db.add(nova_transacao)
    db.commit()
    db.refresh(nova_transacao)
    return nova_transacao

# Rota para ler todas as transações 
@app.get("/transacoes/", response_model=list[schemas.Transacao])
def listar_transacoes(
    data_inicio: str = None,
    data_fim: str = None,
    db: Session = Depends(database.get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual)):
    query = db.query(models.Transacao).filter(models.Transacao.usuario_id == usuario_atual.id)
    
    if data_inicio:
        inicio_dt = datetime.strptime(data_inicio, "%Y-%m-%d")
        query = query.filter(models.Transacao.data_criacao >= inicio_dt)
        
    # Filtro de Data Final (Menor ou igual) - Adicionamos 23:59:59 para incluir o dia todo
    if data_fim:
        fim_dt = datetime.strptime(data_fim, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        query = query.filter(models.Transacao.data_criacao <= fim_dt)
        
    return query.all()

# Rota para apagar uma transação
@app.delete("/transacoes/{transacao_id}")
def apagar_transacao(transacao_id: int, 
    db: Session = Depends(database.get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual)):

    # Procura a transação na base de dados pelo ID
    transacao = db.query(models.Transacao).filter(
        models.Transacao.id == transacao_id, 
        models.Transacao.usuario_id == usuario_atual.id
    ).first()
    if not transacao:
        return {"erro": "Transação não encontrada."}
    
    if transacao.usuario_id != usuario_atual.id:
        raise HTTPException(status_code=403, detail="Você não tem permissão para apagar este registro.")
    # Se encontrar, apaga e guarda a alteração

    db.delete(transacao)
    db.commit()
    return {"mensagem": "Registro eliminado com sucesso!"}

# Rota de relatório PDF
@app.get("/relatorio/")
def gerar_relatorio_pdf(
    data_inicio: str = None,
    data_fim: str = None,
    db: Session = Depends(database.get_db),
    usuario_atual: models.Usuario = Depends(get_usuario_atual)
):
    query = db.query(models.Transacao).filter(models.Transacao.usuario_id == usuario_atual.id)
    if data_inicio:
        inicio_dt = datetime.strptime(data_inicio, "%Y-%m-%d")
        query = query.filter(models.Transacao.data_criacao >= inicio_dt)
    if data_fim:
        fim_dt = datetime.strptime(data_fim, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
        query = query.filter(models.Transacao.data_criacao <= fim_dt)
        
    transacoes = query.all()
    
    # Cria um ficheiro PDF na memória (buffer)
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    largura, altura = A4
    
    # Cabeçalho do PDF
    caminho_logo = "logo.jpg" 
    if os.path.exists(caminho_logo):
        # Desenha a logo no canto superior esquerdo
        c.drawImage(caminho_logo, largura - 170, altura - 100, width=130, height=100, preserveAspectRatio=True, mask='auto')

    c.setFont("Helvetica-Bold", 16)
    titulo = "Relatório Financeiro - Sinuca Magalhães"
    if data_inicio and data_fim:
        data_i_fmt = datetime.strptime(data_inicio, "%Y-%m-%d").strftime("%d/%m/%Y")
        data_f_fmt = datetime.strptime(data_fim, "%Y-%m-%d").strftime("%d/%m/%Y")
        titulo += f" ({data_i_fmt} a {data_f_fmt})"
    elif data_inicio:
        titulo += f" (A partir de {datetime.strptime(data_inicio, '%Y-%m-%d').strftime('%d/%m/%Y')})"
        
    c.drawString(40, altura - 50, titulo)
    
    c.setFont("Helvetica", 10)
    c.drawString(40, altura - 70, f"Gerado por: {usuario_atual.username} em {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    
    # Cabeçalho da Tabela
    y = altura - 120 
    c.setFont("Helvetica-Bold", 10)
    c.drawString(40, y, "ID")
    c.drawString(75, y, "Data/Hora")
    c.drawString(175, y, "Tipo")
    c.drawString(230, y, "Categoria")
    c.drawString(320, y, "Descrição")
    c.drawString(470, y, "Valor (R$)")
    
    c.line(40, y - 5, largura - 40, y - 5)
    
    # Preenchimento dos dados
    y -= 25
    c.setFont("Helvetica", 9)
    
    total_entradas = 0
    total_saidas = 0
    
    for t in transacoes:
        if t.tipo == 'Entrada':
            total_entradas += t.valor
        else:
            total_saidas += t.valor

        data_formatada = t.data_criacao.strftime("%d/%m/%Y %H:%M") if t.data_criacao else ""
            
        c.drawString(40, y, f"{t.id}")
        c.drawString(70, y, data_formatada)
        c.drawString(175, y, t.tipo)
        c.drawString(230, y, t.categoria)
        c.drawString(320, y, t.descricao[:20]) 
        c.drawString(470, y, f"{t.valor:.2f}")
        
        y -= 20
        
        if y < 100:
            c.showPage()
            c.setFont("Helvetica", 9)
            y = altura - 50
            
    # Rodapé com os Totais
    c.line(40, y, largura - 40, y)
    y -= 25
    
    lucro = total_entradas - total_saidas
    
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, y, f"Total de Entradas: R$ {total_entradas:.2f}")
    y -= 20
    c.drawString(50, y, f"Total de Saídas: R$ {total_saidas:.2f}")
    y -= 20
    c.drawString(50, y, f"Lucro do Período: R$ {lucro:.2f}")
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": "attachment; filename=relatorio_sinuca.pdf"}
    )