# Component Plan: Boletos & Financial Management

> **Goal**: Implement the structure for managing Invoices (Boletos) and integrating them with Orders.

## 1. Schema Changes

We need a way to track the "Boleto" or "Payment Slip" generated for an Order.

```prisma
model Invoice {
  id              String   @id @default(uuid())
  clinicId        String
  
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id])
  
  // Boleto Data
  amountCents     Int
  dueDate         DateTime
  status          InvoiceStatus @default(PENDING) // PENDING, PAID, OVERDUE, CANCELLED
  
  // External Provider (Future Integration)
  provider        String?  // 'ASAAS', 'IUGU', etc.
  externalId      String?  // ID in the provider
  pdfUrl          String?  // URL to download PDF
  barCode         String?  // Linha digitável
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  paidAt          DateTime?

  clinic          Clinic   @relation(fields: [clinicId], references: [id])
}

enum InvoiceStatus {
  PENDING
  PAID
  OVERDUE
  CANCELLED
}
```

## 2. Backend Implementation (Module: `src/modules/finance`)

### 2.1 Services
- `FinanceService.generateInvoice(orderId, dueDate)`: 
  - Creates an `Invoice` record.
  - (Mock for now): Generates a dummy barcode and PDF link.
- `FinanceService.markAsPaid(invoiceId)`:
  - Updates status to PAID.
  - Triggers Order status update (optional?).

### 2.2 Controller
- `POST /finance/invoices`: Generate.
- `GET /orders/:id/invoices`: List invoices for an order.

## 3. Frontend Implementation

### 3.1 Order Details Page (`/dashboard/pedidos/[id]`)
- Add "Financeiro" tab.
- Button "Gerar Boleto".
- List generated bolletos with status, due date, and "Download PDF" / "Copy Barcode".

## 4. Verification
- Generate Boleto for an existing Order.
- Verify Schema creation.
- Check UI updates.
