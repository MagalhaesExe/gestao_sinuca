from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Define o local e o nome do arquivo de banco de dados SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./sinuca.db"

# Inicializa o motor (engine) do banco de dados. 
# O parâmetro 'check_same_thread=False' permite que o SQLite seja utilizado em ambiente assíncrono pelo FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Configura a fábrica de sessões (SessionLocal). 
# Cada instância desta classe será uma sessão de banco de dados única para operações de leitura e escrita
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Classe base para a criação dos modelos declarativos (mapeamento Objeto-Relacional)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()