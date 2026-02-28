# Usa uma imagem oficial do Python mais leve
FROM python:3.10-slim

# Define o diretório de trabalho dentro do contentor
WORKDIR /app

# Copia o ficheiro de dependências e instala-as
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o código do back-end para o contentor
COPY . .

# Expõe a porta que o FastAPI vai usar
EXPOSE 8000

# Comando para iniciar o servidor
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]