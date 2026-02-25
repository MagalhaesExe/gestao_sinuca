from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from .database import Base

class Transacao(Base):
    __tablename__ = "transacoes"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String, index=True)        
    categoria = Column(String)               
    descricao = Column(String)               
    valor = Column(Float)                    
    data = Column(DateTime, default=datetime.utcnow) 