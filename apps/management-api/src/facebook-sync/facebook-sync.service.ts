import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FacebookSyncService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async findAll(tenantId: string, page: number = 1, limit: number = 20, conversationId?: string) {
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (conversationId) {
      where.conversationId = conversationId;
    }

    const [data, total] = await Promise.all([
      this.prisma.facebookSync.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.facebookSync.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async importFromFile(tenantId: string, file: Express.Multer.File): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    let rows: any[] = [];

    try {
      if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
        const content = file.buffer.toString('utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
          throw new BadRequestException('CSV file is empty');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

        rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
      } else {
        throw new BadRequestException('Currently only CSV files are supported. Please convert Excel files to CSV.');
      }
    } catch (error) {
      throw new BadRequestException(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const pageId = row.pageId || row.page_id || row['Page ID'] || '';
        const pageName = row.pageName || row.page_name || row['Page Name'] || '';
        const conversationId = row.conversationId || row.conversation_id || row['Conversation ID'] || '';
        const messageId = row.messageId || row.message_id || row['Message ID'] || '';
        const postId = row.postId || row.post_id || row['Post ID'] || '';
        const senderId = row.senderId || row.sender_id || row['Sender ID'] || '';
        const senderName = row.senderName || row.sender_name || row['Sender Name'] || '';
        const messageText = row.messageText || row.message_text || row['Message Text'] || row.message || '';
        const messageType = row.messageType || row.message_type || row['Message Type'] || 'text';
        const timestamp = row.timestamp || row['Timestamp'] || row.createdAt || row.created_at || new Date().toISOString();

        if (!pageId || !messageId || !conversationId) {
          errors.push(`Row ${i + 2}: Missing pageId, conversationId, or messageId`);
          failed++;
          continue;
        }

        // Check if message already exists
        const existing = await this.prisma.facebookSync.findFirst({
          where: {
            tenantId,
            messageId,
          },
        });

        if (existing) {
          // Update existing message
          await this.prisma.facebookSync.update({
            where: { id: existing.id },
            data: {
              pageName: pageName || existing.pageName,
              conversationId: conversationId || existing.conversationId,
              postId: postId || existing.postId,
              senderId: senderId || existing.senderId,
              senderName: senderName || existing.senderName,
              messageText: messageText || existing.messageText,
              messageType: messageType || existing.messageType,
              timestamp: timestamp ? new Date(timestamp) : existing.timestamp,
            },
          });
        } else {
          // Create new message
          await this.prisma.facebookSync.create({
            data: {
              tenantId,
              pageId,
              pageName: pageName || null,
              conversationId,
              messageId,
              postId: postId || null,
              senderId: senderId || null,
              senderName: senderName || null,
              messageText: messageText || null,
              messageType: messageType || 'text',
              timestamp: timestamp ? new Date(timestamp) : new Date(),
            },
          });
        }
        success++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failed++;
      }
    }

    return { success, failed, errors: errors.slice(0, 10) };
  }

  async syncFromApi(tenantId: string, config: { apiUrl?: string; pageId: string; accessToken: string; syncFrequency?: string }): Promise<{ success: number; failed: number; errors: string[] }> {
    if (!config.pageId || !config.accessToken) {
      throw new BadRequestException('Page ID and Access Token are required');
    }

    try {
      // Use Facebook Messenger Conversations API endpoint
      const apiEndpoint = config.apiUrl || `https://graph.facebook.com/v18.0/${config.pageId}/conversations`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const url = new URL(apiEndpoint);
      url.searchParams.append('access_token', config.accessToken);
      url.searchParams.append('fields', 'id,participants,messages{id,from,message,created_time,attachments}');
      url.searchParams.append('limit', '25'); // Limit to 25 conversations per sync

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const responseData = await response.json();
      const conversations = Array.isArray(responseData.data) ? responseData.data : [];

      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each conversation
      for (let i = 0; i < conversations.length; i++) {
        const conversation = conversations[i];
        try {
          const conversationId = conversation.id;
          
          if (!conversationId || !conversation.messages || !conversation.messages.data) {
            continue;
          }

          const messages = Array.isArray(conversation.messages.data) ? conversation.messages.data : [];

          // Process each message in the conversation
          for (let j = 0; j < messages.length; j++) {
            const msg = messages[j];
            try {
              const messageId = msg.id;
              const senderId = msg.from?.id || '';
              const senderName = msg.from?.name || '';
              const messageText = msg.message?.text || '';
              const messageType = msg.attachments?.length > 0 ? 'attachment' : 'text';
              const timestamp = msg.created_time || new Date().toISOString();

              // Extract postId from message metadata/attachments/referral if available (for Post Ads messages)
              // Facebook Messenger API includes postId in referral when message came from Post Ads click
              const postId = msg.referral?.source === 'ADS' ? msg.referral?.ad_id :
                           msg.attachments?.[0]?.target?.id || 
                           msg.metadata?.postId || 
                           msg.metadata?.post_id || null;

              if (!messageId) {
                continue;
              }

              // Check if message already exists
              const existing = await this.prisma.facebookSync.findFirst({
                where: {
                  tenantId,
                  messageId,
                },
              });

              if (existing) {
                // Update existing message
                await this.prisma.facebookSync.update({
                  where: { id: existing.id },
                  data: {
                    postId: postId || existing.postId,
                    messageText: messageText || existing.messageText,
                    messageType: messageType || existing.messageType,
                    timestamp: timestamp ? new Date(timestamp) : existing.timestamp,
                    syncedAt: new Date(),
                  },
                });
              } else {
                // Create new message
                await this.prisma.facebookSync.create({
                  data: {
                    tenantId,
                    pageId: config.pageId,
                    pageName: null, // Could be fetched from page info endpoint
                    conversationId,
                    messageId,
                    postId: postId || null,
                    senderId: senderId || null,
                    senderName: senderName || null,
                    messageText: messageText || null,
                    messageType: messageType || 'text',
                    timestamp: timestamp ? new Date(timestamp) : new Date(),
                    syncedAt: new Date(),
                  },
                });
              }
              success++;
            } catch (error) {
              errors.push(`Message ${i + 1}-${j + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
              failed++;
            }
          }
        } catch (error) {
          errors.push(`Conversation ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          failed++;
        }
      }

      return { success, failed, errors: errors.slice(0, 10) };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadRequestException('API request timeout. Please try again.');
      }
      throw new BadRequestException(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
