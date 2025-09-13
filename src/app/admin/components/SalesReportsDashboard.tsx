'use client';

import { Calendar, DollarSign, Download, Filter, RefreshCw,ShoppingCart, TrendingUp, Users } from 'lucide-react';
import React, { useEffect,useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,Tooltip, XAxis, YAxis } from 'recharts';

interface SalesReportsDashboardProps {
  slug: string;
}

const SalesReportsDashboard: React.FC<SalesReportsDashboardProps> = ({ slug }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [dateRange, setDateRange] = useState({
    start: '2024-01-01',
    end: '2024-12-31'
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar dados da API
  const fetchReportsData = async () => {
    if (!slug) {
      setError('Slug do restaurante não fornecido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        slug,
        period: selectedPeriod,
        startDate: dateRange.start,
        endDate: dateRange.end
      });

      const response = await fetch(`/api/admin/reports/sales?${params}`);
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setReportData(data);
      
    } catch (error: any) {
      console.error('Erro ao buscar relatórios:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais e quando filtros mudarem
  useEffect(() => {
    fetchReportsData();
  }, [selectedPeriod, dateRange.start, dateRange.end, slug]);

  // Dados padrão enquanto carrega ou em caso de erro
  const defaultData = {
    salesData: [],
    kpiData: {
      totalVendas: 0,
      totalPedidos: 0,
      ticketMedio: 0,
      crescimento: 0,
      clientesAtivos: 0,
      taxaConversao: 0
    },
    topProducts: [],
    categoryData: []
  };

  const getCurrentData = () => {
    if (!reportData?.salesData) return [];
    return reportData.salesData;
  };

  const getKpiData = () => {
    if (!reportData?.kpiData) return defaultData.kpiData;
    return reportData.kpiData;
  };

  const getTopProducts = () => {
    if (!reportData?.topProducts) return [];
    return reportData.topProducts;
  };

  const getCategoryData = () => {
    if (!reportData?.categoryData) return [];
    return reportData.categoryData;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleExport = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams({
      slug,
      period: selectedPeriod,
      startDate: dateRange.start,
      endDate: dateRange.end,
    });

    const response = await fetch(`/api/admin/reports/sales/excel?${params}`);
    if (!response.ok) throw new Error("Erro ao gerar Excel");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-vendas-${selectedPeriod}-${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error("Erro ao exportar:", error);
    alert("Erro ao exportar relatório em Excel");
  } finally {
    setLoading(false);
  }
};


  // Loading state
  if (loading && !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-500 mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar relatórios</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchReportsData}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentKpiData = getKpiData();
  const currentSalesData = getCurrentData();
  const currentTopProducts = getTopProducts();
  const currentCategoryData = getCategoryData();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Relatórios de Vendas</h1>
              <p className="text-gray-600 mt-1">Análise completa do desempenho de vendas</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Exportar
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Período:</span>
                </div>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">De:</span>
                </div>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-500">até</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Vendas</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentKpiData.totalVendas)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600 font-medium">+{currentKpiData.crescimento}%</span>
              <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{currentKpiData.totalPedidos.toLocaleString()}</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600 font-medium">+8.2%</span>
              <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentKpiData.ticketMedio)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600 font-medium">+3.8%</span>
              <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Clientes Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{currentKpiData.clientesAtivos.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600 font-medium">+15.3%</span>
              <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taxa de Conversão</p>
                <p className="text-2xl font-bold text-gray-900">{currentKpiData.taxaConversao}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600 font-medium">+0.5%</span>
              <span className="text-sm text-gray-500 ml-1">vs período anterior</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Crescimento</p>
                <p className="text-2xl font-bold text-gray-900">+{currentKpiData.crescimento}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-500" />
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600 font-medium">Tendência positiva</span>
            </div>
          </div>
        </div>

        {/* Gráficos Principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de Vendas */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Evolução das Vendas</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Vendas</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={currentSalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={selectedPeriod === 'daily' ? 'date' : selectedPeriod === 'weekly' ? 'periodo' : 'mes'} />
                <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Vendas']} />
                <Line 
                  type="monotone" 
                  dataKey="vendas" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Pedidos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Número de Pedidos</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Pedidos</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={currentSalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={selectedPeriod === 'daily' ? 'date' : selectedPeriod === 'weekly' ? 'periodo' : 'mes'} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="pedidos" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Seção Inferior */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categorias de Produtos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Vendas por Categoria</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={currentCategoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {currentCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {currentCategoryData.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                    <span className="text-sm text-gray-600">{category.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{category.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Produtos */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Top 5 Produtos Mais Vendidos</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">#</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Produto</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Vendas</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Unidades</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTopProducts.map((product, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">{index + 1}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{product.produto}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                        {formatCurrency(product.vendas)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {product.unidades} un.
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatCurrency(product.vendas / product.unidades)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesReportsDashboard;