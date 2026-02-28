# Sinuca Magalhães - Sistema de Gestão de Finanças

Este é o sistema para a gestão de finanças da **Sinuca Magalhães**, desenvolvido para gerar talões de consumo em PDF de forma automatizada e profissional.

## Tecnologias Utilizadas

**Back-end:**
- **Python 3**
- **FastAPI** 
- **SQLAlchemy**

**Front-end:**
- **React / Vite** 
- **Nginx** 

**Infraestrutura:**
- **Docker & Docker Compose** 

## Como executar o projeto

Para rodar este projeto na sua máquina, precisará apenas de ter o [Docker](https://www.docker.com/) e o [Git](https://git-scm.com/) instalados.

### 1. Clonar o repositório
```bash
git clone https://github.com/MagalhaesExe/gestao_sinuca.git
cd gestao_sinuca
```

### 2. Configurar Variáveis de Ambiente
O Back-end precisa de uma chave de segurança para gerar os tokens de login. Dentro da pasta backend/, crie um ficheiro chamado .env e adicione a sua chave secreta:
```bash
SECRET_KEY=sua_chave_secreta_super_segura_aqui
```

### 3. Iniciar os Contentores com Docker
Na raiz do projeto (onde está o ficheiro `docker-compose.yml`), execute o comando abaixo para construir as imagens e iniciar o sistema:
```bash
docker compose up -d --build
```

### 4. Aceder à Aplicação
Assim que o Docker terminar, o sistema estará disponível nos seguintes endereços:

- Aplicação Web (Front-end): http://localhost:8081
- Documentação da API (Swagger): http://localhost:8000/docs

### Como parar a aplicação
Para desligar os contentores de forma segura, execute na raiz do projeto:
```bash
docker compose down
```