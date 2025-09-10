// src/components/ReceiptPrinter.tsx
"use client";

import { Printer } from "lucide-react";
import React from "react";

interface OrderProduct {
  id: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    price: number;
  };
}

interface Order {
  id: number;
  customerName: string;
  customerCpf: string;
  customerPhone?: string;
  total: number;
  status: string;
  consumptionMethod: "TAKEAWAY" | "DINE_IN";
  deliveryAddress?: string;
  deliveryReference?: string;
  createdAt: string;
  updatedAt: string;
  orderProducts: OrderProduct[];
  restaurant?: {
    name: string;
  };
}

interface ReceiptPrinterProps {
  order: Order;
}

const ReceiptPrinter: React.FC<ReceiptPrinterProps> = ({ order }) => {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatCpf = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return "";
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      PENDING: "Aguardando Pagamento",
      PAYMENT_CONFIRMED: "Pagamento Confirmado",
      IN_PREPARATION: "Em Preparo",
      FINISHED: "Finalizado",
      PAYMENT_FAILED: "Pagamento Falhou",
    };
    return labels[status] || status;
  };

  const getConsumptionMethodLabel = (method: string) => {
    return method === "TAKEAWAY" ? "ENTREGA" : "RETIRADA NO LOCAL";
  };

  const generateReceiptHTML = () => {
    const receiptDate = new Date().toLocaleString("pt-BR");
    const orderDate = new Date(order.createdAt).toLocaleString("pt-BR");

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Comprovante - Pedido #${order.id}</title>
    <style>
        @page {
            size: 80mm 200mm;
            margin: 5mm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.3;
            width: 70mm;
            margin: 0 auto;
            color: #000;
        }
        
        .receipt {
            width: 100%;
        }
        
        .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
        }
        
        .restaurant-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        
        .receipt-title {
            font-size: 14px;
            font-weight: bold;
            margin: 4px 0;
        }
        
        .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
        }
        
        .section {
            margin-bottom: 8px;
        }
        
        .section-title {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 4px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }
        
        .info-label {
            font-weight: bold;
        }
        
        .products {
            margin: 8px 0;
        }
        
        .product-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            align-items: flex-start;
        }
        
        .product-name {
            flex: 1;
            margin-right: 8px;
            word-wrap: break-word;
        }
        
        .product-qty-price {
            text-align: right;
            white-space: nowrap;
        }
        
        .total-section {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 4px 0;
            margin: 8px 0;
            font-weight: bold;
        }
        
        .total-row {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
        }
        
        .delivery-info {
            background: #f5f5f5;
            padding: 6px;
            border: 1px solid #ddd;
            margin: 8px 0;
        }
        
        .status-badge {
            text-align: center;
            padding: 4px;
            border: 2px solid #000;
            margin: 8px 0;
            font-weight: bold;
        }
        
        .footer {
            text-align: center;
            font-size: 10px;
            margin-top: 12px;
            border-top: 1px dashed #000;
            padding-top: 8px;
        }
        
        @media print {
            body {
                width: 80mm;
                margin: 0;
            }
            
            .no-print {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="receipt">
        <div class="header">
            <div class="restaurant-name">${order.restaurant?.name || "RESTAURANTE"}</div>
            <div class="receipt-title">COMPROVANTE DE PEDIDO</div>
        </div>
        
        <div class="section">
            <div class="info-row">
                <span class="info-label">Pedido:</span>
                <span>#${order.id}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Data:</span>
                <span>${orderDate}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Impresso em:</span>
                <span>${receiptDate}</span>
            </div>
        </div>
        
        <div class="divider"></div>
        
        <div class="section">
            <div class="section-title">DADOS DO CLIENTE</div>
            <div class="info-row">
                <span class="info-label">Nome:</span>
                <span>${order.customerName}</span>
            </div>
            <div class="info-row">
                <span class="info-label">CPF:</span>
                <span>${formatCpf(order.customerCpf)}</span>
            </div>
            ${order.customerPhone ? `
            <div class="info-row">
                <span class="info-label">Telefone:</span>
                <span>${formatPhone(order.customerPhone)}</span>
            </div>
            ` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="status-badge">
            TIPO: ${getConsumptionMethodLabel(order.consumptionMethod)}
        </div>
        
        ${order.consumptionMethod === "TAKEAWAY" && order.deliveryAddress ? `
        <div class="delivery-info">
            <div class="section-title">ENDEREÇO DE ENTREGA</div>
            <div style="margin-top: 4px;">${order.deliveryAddress}</div>
            ${order.deliveryReference ? `
            <div style="margin-top: 4px;">
                <strong>Referência:</strong> ${order.deliveryReference}
            </div>
            ` : ''}
        </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="section">
            <div class="section-title">PRODUTOS</div>
            <div class="products">
                ${order.orderProducts.map(item => `
                <div class="product-row">
                    <div class="product-name">${item.product.name}</div>
                    <div class="product-qty-price">
                        ${item.quantity}x ${formatCurrency(item.price)}<br>
                        <strong>${formatCurrency(item.price * item.quantity)}</strong>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
        
        <div class="total-section">
            <div class="total-row">
                <span>TOTAL:</span>
                <span>${formatCurrency(order.total)}</span>
            </div>
        </div>
        
        <div class="status-badge">
            STATUS: ${getStatusLabel(order.status)}
        </div>
        
        <div class="footer">
            <div>Comprovante não fiscal</div>
            <div style="margin-top: 4px;">
                ${order.consumptionMethod === "TAKEAWAY" ? 
                  "Aguarde a entrega no endereço informado" : 
                  "Retire seu pedido no balcão do restaurante"
                }
            </div>
        </div>
    </div>
</body>
</html>`;
  };

  const printReceipt = () => {
    const receiptHTML = generateReceiptHTML();
    
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    
    if (printWindow) {
      printWindow.document.write(receiptHTML);
      printWindow.document.close();
      
      // Aguardar o carregamento e então imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      };
    } else {
      // Fallback: download como HTML
      downloadReceipt();
    }
  };

  const downloadReceipt = () => {
    const receiptHTML = generateReceiptHTML();
    const blob = new Blob([receiptHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovante-pedido-${order.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={printReceipt}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-600 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-700"
      title="Imprimir Comprovante"
    >
      <Printer size={16} />
      Imprimir Comprovante
    </button>
  );
};

export default ReceiptPrinter;