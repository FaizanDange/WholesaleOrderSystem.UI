import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-toastify';

export const downloadOrderPDF = (order, userName = 'Valued Customer') => {
    if (!order || !order.items) {
        console.error("No items found to download");
        toast.error("Cannot download: Order details are missing items.");
        return;
    }

    try {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(30, 64, 175); // Primary blue
        doc.text('WholesaleBox Items List', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Order ID: #${order.orderId}`, 20, 35);
        doc.text(`Date: ${new Date(order.orderDate).toLocaleString()}`, 20, 42);
        doc.text(`Status: ${order.status}`, 20, 49);

        doc.text('Customer Name:', 140, 35);
        doc.setTextColor(0);
        doc.setFont(undefined, 'bold');
        doc.text(userName || 'Customer', 140, 42);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100);

        // Items Table
        const tableColumn = ["Product Name", "Quantity", "Unit Price", "Subtotal"];
        const tableRows = [];

        order.items.forEach(item => {
            const itemData = [
                item.productName,
                `${item.quantity} ${item.unit || 'pcs'}`,
                `INR ${item.price.toFixed(2)}`,
                `INR ${(item.quantity * item.price).toFixed(2)}`
            ];
            tableRows.push(itemData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 60,
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [30, 64, 175], textColor: 255 },
            alternateRowStyles: { fillColor: [241, 245, 249] },
            margin: { top: 60 }
        });

        // Total
        const finalY = doc.lastAutoTable.finalY || 60;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0);
        doc.text(`Grand Total: INR ${order.totalAmount.toFixed(2)}`, 140, finalY + 15);

        // Footer message
        doc.setFontSize(10);
        doc.setFont(undefined, 'italic');
        doc.setTextColor(150);
        doc.text('Thank you for choosing WholesaleBox!', 105, 280, { align: 'center' });

        const safeName = (userName || 'Customer').replace(/[^a-z0-9]/gi, '_');
        doc.save(`Items_List_${safeName}.pdf`);
    } catch (err) {
        console.error("PDF Generation Error:", err);
        toast.error("Error generating PDF. Please check console for details.");
    }
};
