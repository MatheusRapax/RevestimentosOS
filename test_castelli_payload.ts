import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ImportProductsDto } from './src/modules/stock/dto/import-products.dto';

const payload = {
  supplierId: "123",
  strategy: "CASTELLI",
  items: [
    {
      sku: "73720",
      supplierCode: "73720",
      name: "San Giusto Plus",
      format: "30x120",
      line: "Granilha",
      piecesPerBox: 4,
      boxCoverage: 2.2,
      palletBoxes: 32,
      boxWeight: 32.5,
      usage: "Piso Interno",
      costCents: 5049
    }
  ]
};

async function main() {
  const dto = plainToInstance(ImportProductsDto, payload, {
    enableImplicitConversion: true,
  });
  
  console.log("DTO BEFORE VALIDATION:", JSON.stringify(dto, null, 2));
  
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  
  if (errors.length > 0) {
    console.log("ERRORS:", JSON.stringify(errors, null, 2));
  } else {
    console.log("DTO AFTER VALIDATION:", JSON.stringify(dto, null, 2));
  }
}

main().catch(console.error);
