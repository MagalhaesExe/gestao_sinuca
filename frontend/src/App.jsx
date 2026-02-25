import { useState, useEffect } from 'react'

function App() {
  // Estados para armazenamento dos dados da API e controle do formulário
  const [transacoes, setTransacoes] = useState([])
  const [tipo, setTipo] = useState('Entrada')
  const [categoria, setCategoria] = useState('Locação')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')

  // Função para buscar a lista de transações do backend (GET)
  const buscarTransacoes = () => {
    fetch('http://127.0.0.1:8000/transacoes/')
      .then(resposta => resposta.json())
      .then(dados => setTransacoes(dados))
      .catch(erro => console.error("Erro na requisição GET:", erro))
  }

  // Hook useEffect para carregar os dados assim que o componente for montado
  useEffect(() => {
    buscarTransacoes()
  }, [])

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
        headers: { 'Content-Type': 'application/json' },
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
        method: 'DELETE' 
      })
      .then(() => {
        // Atualiza o estado local buscando os dados atualizados
        buscarTransacoes()
      })
      .catch(erro => console.error("Erro na requisição DELETE:", erro))
    }
  }

    // Cálculos derivados baseados no estado 'transacoes' (Memória do Cliente)
    const totalEntradas = transacoes
      .filter(item => item.tipo === 'Entrada')
      .reduce((acumulador, item) => acumulador + item.valor, 0)

    const totalSaidas = transacoes
      .filter(item => item.tipo.includes('Saída') || item.tipo.includes('Saida'))
      .reduce((acumulador, item) => acumulador + item.valor, 0)

    const lucro = totalEntradas - totalSaidas

  return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-md">
          
          <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">
            🎱 Gestão de Sinuca
          </h1>

          {/* Seção de indicadores financeiros (Dashboard) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm">
              <p className="text-sm text-green-600 font-semibold mb-1">Total de Entradas</p>
              <p className="text-2xl font-bold text-green-700">R$ {totalEntradas.toFixed(2)}</p>
            </div>

            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
              <p className="text-sm text-red-600 font-semibold mb-1">Total de Saídas</p>
              <p className="text-2xl font-bold text-red-700">R$ {totalSaidas.toFixed(2)}</p>
            </div>

            <div className={`${lucro >= 0 ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-orange-50 border-orange-500 text-orange-700'} border-l-4 p-4 rounded shadow-sm`}>
              <p className="text-sm font-semibold mb-1 opacity-80">Lucro Atual</p>
              <p className="text-2xl font-bold">R$ {lucro.toFixed(2)}</p>
            </div>
          </div>

          {/* Formulário de entrada de dados */}
          <div className="bg-gray-50 p-4 rounded-md mb-8 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Novo Registro</h2>
            <form onSubmit={salvarTransacao} className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full p-2 border rounded">
                  <option value="Entrada">🟢 Entrada (Ganho)</option>
                  <option value="Saída">🔴 Saída (Gasto)</option>
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
              <div className="md:col-span-5 flex justify-end mt-2">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition">
                  Salvar Registro
                </button>
              </div>
            </form>
          </div>

          {/* Tabela de listagem de dados históricos */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Histórico de Transações</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">ID</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Tipo</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Categoria</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Descrição</th>
                  <th className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Valor</th>
                  <th className="py-2 px-4 border-b text-center text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-sm text-gray-700">#{item.id}</td>
                    <td className="py-2 px-4 border-b text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${item.tipo === 'Entrada' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {item.tipo}
                      </span>
                    </td>
                    <td className="py-2 px-4 border-b text-sm text-gray-700">{item.categoria}</td>
                    <td className="py-2 px-4 border-b text-sm text-gray-700">{item.descricao}</td>
                    <td className="py-2 px-4 border-b text-sm font-semibold text-gray-800">
                      R$ {item.valor.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 border-b text-center">
                      <button 
                        onClick={() => eliminarTransacao(item.id)}
                        className="text-red-500 hover:text-red-700 font-bold px-2 py-1 rounded hover:bg-red-50 transition"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transacoes.length === 0 && (
              <p className="text-center text-gray-500 mt-4">Nenhuma transação encontrada.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  export default App