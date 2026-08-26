import { Response } from 'express';
import prisma from '../models/prisma';
import { AuthRequest } from '../middleware/auth';
import { sendError, sendSuccess } from '../utils/response';
import { messages } from '../utils/messages';
import { allowSend } from '../socket';
import { conversationRoom } from '../utils/chatRooms';
import { toPublicMediaUrl } from '../utils/mediaUrl';

const MAX_CONTENT = 2000;

function mapMessage(m: {
  id: string;
  sender_id: string;
  receiver_id: string;
  listing_id: string;
  content: string;
  type: string;
  offer_amount: { toString(): string } | number | null;
  read_at: Date | null;
  created_at: Date;
}) {
  return {
    id: m.id,
    sender_id: m.sender_id,
    receiver_id: m.receiver_id,
    listing_id: m.listing_id,
    content: m.content,
    type: m.type,
    offer_amount: m.offer_amount === null ? null : Number(m.offer_amount),
    read_at: m.read_at ? m.read_at.toISOString() : null,
    created_at: m.created_at.toISOString(),
  };
}

async function assertCanMessage(
  senderId: string,
  receiverId: string,
  listingId: string
): Promise<string | null> {
  if (senderId === receiverId) return 'You cannot message yourself';
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status === 'removed') return 'Listing not found';

  if (senderId !== listing.seller_id && receiverId !== listing.seller_id) {
    return 'You can only message the seller about this listing';
  }
  return null;
}

export async function sendMessage(req: AuthRequest, res: Response) {
  if (!req.user) return sendError(res, messages.unauthorized, 401);
  if (!allowSend(req.user.userId)) {
    return sendError(res, 'Too many messages. Please wait a moment.', 429);
  }

  const listing_id = String(req.body.listing_id || '');
  const receiver_id = String(req.body.receiver_id || '');
  const content = String(req.body.content || '').trim();
  if (!listing_id || !receiver_id || !content) {
    return sendError(res, 'listing_id, receiver_id, and content are required', 400);
  }
  if (content.length > MAX_CONTENT) {
    return sendError(res, `Message must be ${MAX_CONTENT} characters or less`, 400);
  }

  const denied = await assertCanMessage(req.user.userId, receiver_id, listing_id);
  if (denied) return sendError(res, denied, 403);

  const message = await prisma.message.create({
    data: {
      listing_id,
      sender_id: req.user.userId,
      receiver_id,
      content,
      type: 'text',
    },
  });

  await prisma.notification.create({
    data: {
      user_id: receiver_id,
      type: 'new_message',
      message: 'You have a new message about a listing.',
    },
  });

  const io = req.app.get('io');
  if (io) {
    const payload = mapMessage(message);
    io.to(`user:${receiver_id}`).emit('receive_message', payload);
    io.to(conversationRoom(listing_id, req.user.userId, receiver_id)).emit(
      'receive_message',
      payload
    );
    io.to(`user:${receiver_id}`).emit('notification', {
      type: 'new_message',
      listing_id,
    });
  }

  return sendSuccess(res, mapMessage(message), 'Message sent', 201);
}

export async function getConversation(req: AuthRequest, res: Response) {
  if (!req.user) return sendError(res, messages.unauthorized, 401);
  const listing_id = req.params.listing_id;
  const withUserId = String(req.query.with || '');
  if (!withUserId) return sendError(res, 'with=userId is required', 400);

  const denied = await assertCanMessage(req.user.userId, withUserId, listing_id);
  if (denied) return sendError(res, denied, 403);

  const messagesList = await prisma.message.findMany({
    where: {
      listing_id,
      OR: [
        { sender_id: req.user.userId, receiver_id: withUserId },
        { sender_id: withUserId, receiver_id: req.user.userId },
      ],
    },
    orderBy: { created_at: 'asc' },
  });

  await prisma.message.updateMany({
    where: {
      listing_id,
      sender_id: withUserId,
      receiver_id: req.user.userId,
      read_at: null,
    },
    data: { read_at: new Date() },
  });

  return sendSuccess(res, messagesList.map(mapMessage));
}

export async function getConversations(req: AuthRequest, res: Response) {
  if (!req.user) return sendError(res, messages.unauthorized, 401);
  const userId = req.user.userId;

  const rows = await prisma.message.findMany({
    where: { OR: [{ sender_id: userId }, { receiver_id: userId }] },
    orderBy: { created_at: 'desc' },
    take: 200,
    include: {
      listing: { select: { id: true, title: true } },
      sender: { select: { id: true, name: true } },
      receiver: { select: { id: true, name: true } },
    },
  });

  const seen = new Set<string>();
  const items = [];
  for (const row of rows) {
    const otherId = row.sender_id === userId ? row.receiver_id : row.sender_id;
    const key = `${row.listing_id}:${otherId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const other = row.sender_id === userId ? row.receiver : row.sender;
    items.push({
      listing_id: row.listing_id,
      listing_title: row.listing.title,
      other_user: other,
      last_message: mapMessage(row),
    });
  }

  return sendSuccess(res, items);
}

export async function getNotifications(req: AuthRequest, res: Response) {
  if (!req.user) return sendError(res, messages.unauthorized, 401);
  const items = await prisma.notification.findMany({
    where: { user_id: req.user.userId },
    orderBy: [{ is_read: 'asc' }, { created_at: 'desc' }],
    take: 50,
  });
  return sendSuccess(res, items);
}

export async function markNotificationRead(req: AuthRequest, res: Response) {
  if (!req.user) return sendError(res, messages.unauthorized, 401);
  const note = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!note || note.user_id !== req.user.userId) {
    return sendError(res, 'Notification not found', 404);
  }
  const updated = await prisma.notification.update({
    where: { id: note.id },
    data: { is_read: true },
  });
  return sendSuccess(res, updated, 'Marked as read');
}

export async function sellerDashboard(req: AuthRequest, res: Response) {
  if (!req.user) return sendError(res, messages.unauthorized, 401);
  const sellerId = req.user.userId;

  const [active, sold, unreadMessages, pendingVerification, listings, recentMessages, heldSales] =
    await Promise.all([
      prisma.listing.count({ where: { seller_id: sellerId, status: 'active' } }),
      prisma.listing.count({ where: { seller_id: sellerId, status: 'sold' } }),
      prisma.message.count({
        where: { receiver_id: sellerId, read_at: null },
      }),
      prisma.verification.count({
        where: { user_id: sellerId, status: 'pending' },
      }),
      prisma.listing.findMany({
        where: { seller_id: sellerId, NOT: { status: 'removed' } },
        include: { images: true },
        orderBy: { created_at: 'desc' },
        take: 20,
      }),
      prisma.message.findMany({
        where: { receiver_id: sellerId },
        include: {
          sender: { select: { id: true, name: true } },
          listing: { select: { id: true, title: true } },
        },
        orderBy: { created_at: 'desc' },
        take: 5,
      }),
      prisma.transaction.findMany({
        where: { seller_id: sellerId, status: 'held' },
        include: { listing: { select: { id: true, title: true } } },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

  const user = await prisma.user.findUnique({ where: { id: sellerId } });

  return sendSuccess(res, {
    stats: {
      active_listings: active,
      total_sold: sold,
      unread_messages: unreadMessages,
      pending_verifications: pendingVerification,
    },
    is_verified: user?.is_verified ?? false,
    listings: listings.map((l) => ({
      id: l.id,
      title: l.title,
      status: l.status,
      price: Number(l.price),
      view_count: l.view_count,
      image: toPublicMediaUrl(
        l.images.find((i) => i.is_primary)?.url || l.images[0]?.url || null
      ) || null,
    })),
    recent_messages: recentMessages,
    held_sales: heldSales.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      status: t.status,
      listing: t.listing,
      created_at: t.created_at.toISOString(),
    })),
  });
}
