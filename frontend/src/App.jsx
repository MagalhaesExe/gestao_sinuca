import { useState, useEffect } from 'react'

function App() {
  // Estados de Autenticação
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [usernameInput, setUsernameInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [modoCadastro, setModoCadastro] = useState(false)

  // Estados para armazenamento dos dados da API e controle do formulário
  const [transacoes, setTransacoes] = useState([])
  const [tipo, setTipo] = useState('Entrada')
  const [categoria, setCategoria] = useState('Locação')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('tudo')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  // Calcula as datas automaticamente com base na seleção
  useEffect(() => {
    const formatarData = (data) => data.toISOString().split('T')[0];
    const hoje = new Date();

    if (tipoFiltro === 'tudo') {
      setDataInicio('');
      setDataFim('');
    } else if (tipoFiltro === 'hoje') {
      setDataInicio(formatarData(hoje));
      setDataFim(formatarData(hoje));
    } else if (tipoFiltro === '7dias') {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 7);
      setDataInicio(formatarData(seteDiasAtras));
      setDataFim(formatarData(hoje));
    } else if (tipoFiltro === '15dias') {
      const quinzeDiasAtras = new Date();
      quinzeDiasAtras.setDate(hoje.getDate() - 15);
      setDataInicio(formatarData(quinzeDiasAtras));
      setDataFim(formatarData(hoje));
    } else if (tipoFiltro === 'mes_atual') {
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
      setDataInicio(formatarData(primeiroDia));
      setDataFim(formatarData(ultimoDia));
    }
  }, [tipoFiltro]);

  // Efeito: Toda vez que o token mudar, se ele existir, busca as transações
  useEffect(() => {
    if (token) {
      buscarTransacoes()
    }
  }, [token, dataInicio, dataFim])

  const fazerLogin = (evento) => {
    evento.preventDefault()
    
    // O FastAPI com OAuth2 espera receber os dados como formulário padrão (URL Encoded)
    const formData = new URLSearchParams()
    formData.append('username', usernameInput)
    formData.append('password', passwordInput)

    fetch('http://127.0.0.1:8000/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    })
    .then(resposta => {
      if (!resposta.ok) throw new Error("Usuário ou senha inválidos")
      return resposta.json()
    })
    .then(dados => {
      // Guarda o token no estado e na memória do navegador para não deslogar ao atualizar a página
      setToken(dados.access_token)
      localStorage.setItem('token', dados.access_token)
      setUsernameInput('')
      setPasswordInput('')
    })
    .catch(erro => alert(erro.message))
  }

  const fazerCadastro = (evento) => {
    evento.preventDefault()

    const novoUsuario = {
      username: usernameInput,
      password: passwordInput
    }

    fetch('http://127.0.0.1:8000/usuarios/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoUsuario)
    })
    .then(resposta => {
      if (!resposta.ok) throw new Error("Erro ao cadastrar. Este usuário já existe.")
      return resposta.json()
    })
    .then(() => {
      alert("Cadastro realizado com sucesso! Agora você pode fazer o login.")
      // Limpa a senha e volta para a tela de login
      setPasswordInput('')
      setModoCadastro(false) 
    })
    .catch(erro => alert(erro.message))
  }

  const fazerLogout = () => {
    setToken('')
    localStorage.removeItem('token')
    setTransacoes([])
  }

  // Função para buscar a lista de transações do backend (GET)
  const buscarTransacoes = () => {
    let url = 'http://127.0.0.1:8000/transacoes/'
    
    // Se o utilizador escolheu um mês, adiciona na URL
    if (dataInicio || dataFim) {
      url += `?`
      if (dataInicio) url += `data_inicio=${dataInicio}&`
      if (dataFim) url += `data_fim=${dataFim}`
    }

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` } 
    })
      .then(resposta => {
        if (!resposta.ok) {
          if (resposta.status === 401) fazerLogout() 
          throw new Error("Erro ao buscar dados")
        }
        return resposta.json()
      })
      .then(dados => setTransacoes(dados))
      .catch(erro => console.error(erro))
  }

  // Função para submeter os dados do formulário ao backend (POST)
  const salvarTransacao = (evento) => {
    evento.preventDefault() 

    const novaTransacao = {
      tipo: tipo,
      categoria: categoria,
      descricao: descricao,
      valor: parseFloat(valor)
    }

    fetch('http://127.0.0.1:8000/transacoes/', {
      method: 'POST',
      headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(novaTransacao)
    })
    .then(resposta => resposta.json())
    .then(() => {
      // Reset dos campos e revalidação da lista após sucesso
      setDescricao('')
      setValor('')
      buscarTransacoes()
    })
    .catch(erro => console.error("Erro na requisição POST:", erro))
  }

  // Função para deletar um registro específico por ID (DELETE)
  const eliminarTransacao = (id) => {
    if (window.confirm("Tem a certeza que deseja eliminar este registo?")) {
      fetch(`http://127.0.0.1:8000/transacoes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(resposta => {
        if (!resposta.ok) {
          alert("Erro: Você só pode apagar os registros que você mesmo criou!")
          throw new Error("Sem permissão")
        }
        buscarTransacoes()
      })
      .catch(erro => console.error("Erro na requisição DELETE:", erro))
    }
  }

  const baixarRelatorio = () => {
    let url = 'http://127.0.0.1:8000/relatorio/'
    
    // Aplica o mesmo filtro para o PDF
    if (dataInicio || dataFim) {
      url += `?`
      if (dataInicio) url += `data_inicio=${dataInicio}&`
      if (dataFim) url += `data_fim=${dataFim}`
    }

    fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` } 
    })
    .then(resposta => {
      if (!resposta.ok) throw new Error("Erro ao gerar PDF")
      return resposta.blob() 
    })
    .then(blob => {
      const urlBlob = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = urlBlob
      link.setAttribute('download', 'relatorio_sinuca.pdf')
      document.body.appendChild(link)
      link.click()
      link.remove()
    })
    .catch(erro => alert(erro.message))
  }

  // Cálculos derivados baseados no estado 'transacoes' (Memória do Cliente)
  const totalEntradas = transacoes
    .filter(item => item.tipo === 'Entrada')
    .reduce((acumulador, item) => acumulador + item.valor, 0)

  const totalSaidas = transacoes
    .filter(item => item.tipo.includes('Saída') || item.tipo.includes('Saida'))
    .reduce((acumulador, item) => acumulador + item.valor, 0)

  const lucro = totalEntradas - totalSaidas

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            {modoCadastro ? 'Cadastro de Usuário' : 'Login'}
          </h1>
          
          <form onSubmit={modoCadastro ? fazerCadastro : fazerLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Usuário</label>
              <input type="text" required value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="w-full p-2 border rounded" placeholder="Seu nome de usuário" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Senha</label>
              <input type="password" required value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-2 border rounded" placeholder="*****" />
            </div>
            <button type="submit" className={`w-full font-bold py-2 px-4 rounded transition text-white ${modoCadastro ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {modoCadastro ? 'Cadastrar Novo Usuário' : 'Entrar'}
            </button>
          </form>

          {/* Botão para alternar entre as telas */}
          <div className="mt-6 text-center">
            <button 
              onClick={() => setModoCadastro(!modoCadastro)} 
              className="text-sm text-gray-500 hover:text-blue-600 transition"
            >
              {modoCadastro ? 'Já possui uma conta? Faça Login' : 'Não tem conta? Cadastre-se aqui'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
      <div className="min-h-screen bg-gray-100 p-3 md:p-8">
        <div className="max-w-5xl mx-auto bg-white p-4 md:p-6 rounded-lg shadow-md">
          
          <div className="relative flex justify-between items-center mb-6 border-b pb-4">
            <div className="flex items-center gap-2 md:gap-4">
              <img src="/logo.jpg" alt="Logo Sinuca Magalhães" className="h-12 md:h-24 object-contain" />
              <h1 className="absolute left-1/2 transform -translate-x-1/2 text-2xl md:text-3xl font-bold text-gray-800 w-full text-center pointer-events-none hidden md:block">
                Gerenciamento de Finanças
              </h1>
            </div>
            <button onClick={fazerLogout} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 md:py-2 md:px-4 rounded transition text-sm md:text-base">
              Sair
            </button>
          </div>

          {/* Título alternativo para o celular */}
          <h1 className="text-xl font-bold text-gray-800 text-center mb-6 block md:hidden">
            Sinuca Magalhães
          </h1>

          {/* Seção de indicadores financeiros (Dashboard) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm">
              <p className="text-sm text-green-600 font-semibold mb-1">Total de Entradas</p>
              <p className="text-xl md:text-2xl font-bold text-green-700">R$ {totalEntradas.toFixed(2)}</p>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
              <p className="text-sm text-red-600 font-semibold mb-1">Total de Saídas</p>
              <p className="text-xl md:text-2xl font-bold text-red-700">R$ {totalSaidas.toFixed(2)}</p>
            </div>

            <div className={`${lucro >= 0 ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-orange-50 border-orange-500 text-orange-700'} border-l-4 p-4 rounded shadow-sm`}>
              <p className="text-sm font-semibold mb-1 opacity-80">Lucro Atual</p>
              <p className="text-xl md:text-2xl font-bold">R$ {lucro.toFixed(2)}</p>
            </div>
          </div>

          {/* Formulário de entrada de dados */}
          <div className="bg-gray-50 p-4 rounded-md mb-8 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Novo Registro</h2>
            <form onSubmit={salvarTransacao} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full p-2 border rounded">
                  <option value="Entrada">Entrada (Ganho)</option>
                  <option value="Saída">Saída (Gasto)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Categoria</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full p-2 border rounded">
                  <option value="Locação">Locação</option>
                  <option value="Venda">Venda</option>
                  <option value="Material">Material (Tacos, Giz, etc)</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Alimentação">Alimentação (Comida/Bebida)</option>
                  <option value="Combustível">Combustível / Viagem</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Descrição</label>
                <input type="text" required placeholder="Ex: Troca de pano" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Valor (R$)</label>
                <input type="number" step="0.01" required placeholder="0.00" value={valor} onChange={(e) => setValor(e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div className="md:col-span-5 flex justify-center md:justify-end mt-2">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition">
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>

          {/* BARRA DE HISTÓRICO, FILTRO E PDF */}
          <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 p-3 md:p-4 rounded border border-gray-200">
            <h2 className="text-lg md:text-xl font-semibold text-gray-700 w-full md:w-auto text-center md:text-left">Histórico de Transações</h2>
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                <span className="text-sm font-semibold text-gray-600 hidden md:inline">Filtro:</span>
                <select 
                  value={tipoFiltro} 
                  onChange={(e) => setTipoFiltro(e.target.value)}
                  className="w-full md:w-auto text-sm border-gray-300 rounded p-2 outline-none bg-white"
                >
                  <option value="tudo">Todo o Histórico</option>
                  <option value="hoje">Hoje</option>
                  <option value="7dias">Últimos 7 dias</option>
                  <option value="15dias">Últimos 15 dias</option>
                  <option value="mes_atual">Mês Atual</option>
                  <option value="personalizado">Personalizado...</option>
                </select>

                {tipoFiltro === 'personalizado' && (
                  <div className="flex items-center gap-2 mt-2 md:mt-0 w-full md:w-auto justify-center border-gray-300">
                    <input 
                      type="date" 
                      value={dataInicio} 
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="text-sm p-1.5 rounded border outline-none w-full md:w-auto"
                    />
                    <span className="text-xs text-gray-500">até</span>
                    <input 
                      type="date" 
                      value={dataFim} 
                      onChange={(e) => setDataFim(e.target.value)}
                      className="text-sm p-1.5 rounded border outline-none w-full md:w-auto"
                    />
                  </div>
                )}
              </div>
              <button 
                onClick={baixarRelatorio} 
                className="w-full md:w-auto bg-gray-800 hover:bg-black text-white font-bold py-2 px-4 rounded flex items-center gap-2 transition"
              >
                Baixar Relatório PDF
              </button>
            </div>
          </div>

          {/* Tabela de listagem de dados históricos */}
          <div className="overflow-x-auto border border-gray-200 rounded">
            <table className="min-w-full bg-white text-sm md:text-base">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600 whitespace-nowrap">ID</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600 whitespace-nowrap">Data/Hora</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600 whitespace-nowrap">Tipo</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600 whitespace-nowrap">Categoria</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600 whitespace-nowrap">Descrição</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600 whitespace-nowrap">Valor</th>
                  <th className="py-2 px-4 border-b text-center text-sm font-medium text-gray-600 whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b text-gray-700 whitespace-nowrap">{item.id}</td>
                    <td className="py-3 px-4 border-b text-gray-700 whitespace-nowrap">
                      {new Date(item.data_criacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4 border-b">
                      <span className={`px-2 py-1 rounded text-xs font-bold whitespace-nowrap ${item.tipo === 'Entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b text-sm text-gray-700 whitespace-nowrap">{item.categoria}</td>
                    <td className="py-3 px-4 border-b text-sm text-gray-700 min-w-37.5">{item.descricao}</td>
                    <td className="py-3 px-4 border-b text-sm font-semibold text-gray-800 whitespace-nowrap">
                      R$ {item.valor.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 border-b text-center whitespace-nowrap">
                      <button 
                        onClick={() => eliminarTransacao(item.id)}
                        className="text-red-500 hover:text-red-700 font-bold px-3 py-1.5 rounded hover:bg-red-50 transition border border-transparent hover:border-red-200">
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transacoes.length === 0 && (
              <p className="text-center text-gray-500 mt-4 pb-4">Nenhuma transação encontrada.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  export default App