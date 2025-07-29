/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-html-link-for-pages */
"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';

function RegisterPage() {
    const [formData, setFormData] = useState({
        restaurantName: '',
        restaurantSlug: '',
        description: '',
        ownerName: '',
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                // Sucesso - redirecionar para o painel
                router.push(`/admin/${formData.restaurantSlug}`);
            } else {
                setError(data.error || 'Erro ao cadastrar');
            }
        } catch (error) {
            setError('Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
            <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Cadastrar Empresa
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Crie sua conta e comece a receber pedidos online
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Dados do Restaurante */}
                    <div className="border-b pb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Dados da Empresaa
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome da Empresa *
                                </label>
                                <input
                                    type="text"
                                    value={formData.restaurantName}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        setFormData({
                                            ...formData,
                                            restaurantName: name,
                                            restaurantSlug: generateSlug(name)
                                        });
                                    } }
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Pizza Express"
                                    required />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Slug (URL) *
                                </label>
                                <input
                                    type="text"
                                    value={formData.restaurantSlug}
                                    onChange={(e) => setFormData({ ...formData, restaurantSlug: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="pizza-express"
                                    required />
                                <p className="text-xs text-gray-500 mt-1">
                                    Será sua URL: seudominio.com/{formData.restaurantSlug}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Descrição da Empresa *
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="As melhores pizzas da cidade..."
                                required />
                        </div>
                    </div>

                    {/* Dados do Proprietário */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Dados do Proprietário
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    value={formData.ownerName}
                                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="João Silva"
                                    required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="joao@pizzaexpress.com"
                                        required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Senha *
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="••••••••"
                                        minLength={6}
                                        required />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Criando conta...' : 'Criar Conta'}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <p className="text-gray-600">
                        Já tem uma conta?{' '}
                        <a href="/admin/login" className="text-blue-600 hover:underline">
                            Fazer login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;