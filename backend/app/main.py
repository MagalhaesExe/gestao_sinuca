from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, SessionLocal
from . import models, schemas

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Gestão de Sinuca")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção, trocaremos para o endereço exato do React
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Rota para salvar uma nova transação
@app.post("/transacoes/", response_model=schemas.Transacao)
def criar_transacao(transacao: schemas.TransacaoCreate, db: Session = Depends(get_db)):
    # Converte os dados validados para o formato do banco
    nova_transacao = models.Transacao(**transacao.model_dump())
    
    # Salva no banco de dados
    db.add(nova_transacao)
    db.commit()
    db.refresh(nova_transacao) # Atualiza para pegar o ID gerado
    return nova_transacao

# Rota para ler todas as transações 
@app.get("/transacoes/", response_model=list[schemas.Transacao])
def listar_transacoes(db: Session = Depends(get_db)):
    # Busca tudo o que está salvo na tabela "transacoes"
    transacoes = db.query(models.Transacao).all()
    return transacoes

# Rota para apagar uma transação
@app.delete("/transacoes/{transacao_id}")
def apagar_transacao(transacao_id: int, db: Session = Depends(get_db)):
    # Procura a transação na base de dados pelo ID
    transacao = db.query(models.Transacao).filter(models.Transacao.id == transacao_id).first()
    
    # Se encontrar, apaga e guarda a alteração
    if transacao:
        db.delete(transacao)
        db.commit()
        return {"mensagem": "Registo eliminado com sucesso!"}
    
    return {"erro": "Transação não encontrada."}