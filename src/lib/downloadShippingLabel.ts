export interface ShippingLabelData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  governorate: string;
  address?: string;
  productName: string;
  size: string;
  color?: string;
  quantity?: number;
}

export function downloadShippingLabel(data: ShippingLabelData) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 800;
  const height = 600;
  canvas.width = width;
  canvas.height = height;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeRect(10, 10, width - 20, height - 20);

  // RTL text helper
  ctx.textAlign = 'right';
  const x = width - 40;

  // Order number header
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(data.orderNumber, width / 2, 60);

  // Divider
  ctx.beginPath();
  ctx.moveTo(30, 80);
  ctx.lineTo(width - 30, 80);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fields
  ctx.textAlign = 'right';
  let y = 130;
  const lineHeight = 70;

  const drawField = (label: string, value: string) => {
    ctx.fillStyle = '#666666';
    ctx.font = '18px Arial';
    ctx.fillText(label, x, y);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(value, x, y + 30);
    y += lineHeight;
  };

  drawField('اسم العميل', data.customerName);
  drawField('الهاتف', data.customerPhone);
  drawField('المحافظة', data.governorate);
  if (data.address) {
    drawField('العنوان', data.address);
  }
  drawField('المنتج', `${data.productName} - ${data.size}${data.color ? ` / ${data.color}` : ''}`);
  if (data.quantity && data.quantity > 1) {
    drawField('الكمية', `${data.quantity} قطع`);
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${data.orderNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
