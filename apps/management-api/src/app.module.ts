import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenant/tenant.module';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { FeatureFlagModule } from './feature-flag/feature-flag.module';
import { CustomerModule } from './cdp/customer/customer.module';
import { SegmentModule } from './cdp/segment/segment.module';
import { TagModule } from './cdp/tag/tag.module';
import { LeadModule } from './crm/lead/lead.module';
import { DealModule } from './crm/deal/deal.module';
import { DealStageModule } from './crm/deal-stage/deal-stage.module';
import { ActivityTaskModule } from './crm/activity-task/activity-task.module';
import { AccountModule } from './crm/account/account.module';
import { ContactModule } from './crm/contact/contact.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { QuotationModule } from './quotation/quotation.module';
import { BillingModule } from './billing/billing.module';
import { LineEventModule } from './line-event/line-event.module';
import { LineFollowerModule } from './line-follower/line-follower.module';
import { FacebookSyncModule } from './facebook-sync/facebook-sync.module';
import { LineContentModule } from './line-content/line-content.module';
import { MessengerContentModule } from './messenger-content/messenger-content.module';
import { EmailContentModule } from './email-content/email-content.module';
import { SmsContentModule } from './sms-content/sms-content.module';
import { MessageCenterModule } from './message-center/message-center.module';
import { ChatAutoMessagerModule } from './chat-auto-messager/chat-auto-messager.module';
import { ChatCenterModule } from './chat-center/chat-center.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    TenantModule,
    UserModule,
    RoleModule,
    FeatureFlagModule,
    CustomerModule,
    SegmentModule,
    TagModule,
    LeadModule,
    DealModule,
    DealStageModule,
    ActivityTaskModule,
    AccountModule,
    ContactModule,
    AuditLogModule,
    AnalyticsModule,
    AdminModule,
    QuotationModule,
    BillingModule,
    LineEventModule,
    LineFollowerModule,
    FacebookSyncModule,
    LineContentModule,
    MessengerContentModule,
    EmailContentModule,
    SmsContentModule,
    MessageCenterModule,
    ChatAutoMessagerModule,
    ChatCenterModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    Reflector,
  ],
})
export class AppModule {}
