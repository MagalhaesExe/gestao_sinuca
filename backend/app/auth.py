import os
from datetime import datetime, timedelta
from jose import jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("A variável de ambiente SECRET_KEY não foi encontrada no arquivo .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # O Token vai durar 7 dias

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verificar_senha(senha_pura, senha_criptografada):
    return pwd_context.verify(senha_pura, senha_criptografada)

def obter_hash_senha(senha):
    return pwd_context.hash(senha)

def criar_token_acesso(dados: dict):
    dados_a_codificar = dados.copy()
    expiracao = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    dados_a_codificar.update({"exp": expiracao})
    
    token_jwt = jwt.encode(dados_a_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return token_jwt