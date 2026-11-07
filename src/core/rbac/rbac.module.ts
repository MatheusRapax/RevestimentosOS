import { Module, Global } from '@nestjs/common';
import { SalesScopeService } from './sales-scope';

@Global()
@Module({
  providers: [SalesScopeService],
  exports: [SalesScopeService],
})
export class RbacModule {}
