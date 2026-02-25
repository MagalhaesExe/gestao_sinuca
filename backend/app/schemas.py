from pydantic import BaseModel
from datetime import datetime

# Classe base contendo os atributos comuns a todas as transações
class TransacaoBase(BaseModel):
    tipo: str
    categoria: str
    descricao: str
    valor: float

# Schema utilizado para a validação de dados na criação de novas transações (Payload do POST)
class TransacaoCreate(TransacaoBase):
    pass

# Schema utilizado para serializar a resposta da API (O que é devolvido no GET/POST)
# Inclui os campos 'id' e 'data', que são gerados automaticamente pelo banco de dados
class Transacao(TransacaoBase):
    id: int
    data: datetime

    class Config:
        from_attributes = True  # Permite que o Pydantic leia dados do SQLAlchemy