// MongoDB Indexes for KaruTeens - Enhanced Version
// Run with: node create_indexes.js

const { MongoClient } = require('mongodb');

async function createIndexes() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db();

        console.log('Creating optimized indexes...\n');

        // USERS
        await db
            .collection('users')
            .createIndexes([
                { key: { email: 1 }, unique: true },
                { key: { created_at: -1 } },
                { key: { is_verified: 1 } },
                { key: { is_premium: 1 } },
            ]);
        console.log('✓ Users indexes');

        // PROFILES
        await db
            .collection('profiles')
            .createIndexes([
                { key: { user_id: 1 }, unique: true },
                { key: { username: 1 }, unique: true },
                { key: { last_seen_at: -1 } },
                { key: { school: 1 } },
            ]);
        console.log('✓ Profiles indexes');

        // POSTS - Optimized for feed, trending, for-you
        await db
            .collection('posts')
            .createIndexes([
                { key: { author_id: 1, created_at: -1 } },
                { key: { status: 1, created_at: -1 } },
                { key: { status: 1, author_id: 1, created_at: -1 } },
                { key: { category: 1, created_at: -1 } },
                { key: { tags: 1 } },
                { key: { created_at: -1 } },
                { key: { is_pinned: -1, created_at: -1 } },
                { key: { is_featured: 1, created_at: -1 } },
                { key: { view_count: -1 } },
                { key: { like_count: -1 } },
            ]);
        console.log('✓ Posts indexes (feed, trending optimized)');

        // LIKES
        await db
            .collection('likes')
            .createIndexes([
                { key: { post_id: 1, user_id: 1 }, unique: true },
                { key: { user_id: 1, created_at: -1 } },
            ]);
        console.log('✓ Likes indexes');

        // COMMENTS
        await db
            .collection('comments')
            .createIndexes([
                { key: { content_id: 1, created_at: -1 } },
                { key: { user_id: 1, created_at: -1 } },
                { key: { parent_id: 1 } },
            ]);
        console.log('✓ Comments indexes');

        // FOLLOWS
        await db
            .collection('follows')
            .createIndexes([
                { key: { follower_id: 1, created_at: -1 } },
                { key: { followed_id: 1, created_at: -1 } },
                { key: { follower_id: 1, followed_id: 1 }, unique: true },
            ]);
        console.log('✓ Follows indexes');

        // MESSAGES
        await db
            .collection('messages')
            .createIndexes([
                { key: { conversation_id: 1, created_at: -1 } },
                { key: { sender_id: 1, created_at: -1 } },
            ]);
        console.log('✓ Messages indexes');

        // CONVERSATIONS
        await db
            .collection('conversations')
            .createIndexes([{ key: { participants: 1 } }, { key: { last_message_at: -1 } }]);
        console.log('✓ Conversations indexes');

        // GROUPS
        await db
            .collection('groups')
            .createIndexes([
                { key: { creator_id: 1 } },
                { key: { members: 1 } },
                { key: { category: 1, created_at: -1 } },
            ]);
        console.log('✓ Groups indexes');

        // EVENTS
        await db
            .collection('events')
            .createIndexes([
                { key: { organizer_id: 1 } },
                { key: { start_time: 1 } },
                { key: { status: 1, start_time: 1 } },
            ]);
        console.log('✓ Events indexes');

        // NOTIFICATIONS
        await db
            .collection('notifications')
            .createIndexes([
                { key: { user_id: 1, created_at: -1 } },
                { key: { user_id: 1, is_read: 1 } },
            ]);
        console.log('✓ Notifications indexes');

        // STORIES (TTL for auto-expiry)
        await db
            .collection('stories')
            .createIndexes([
                { key: { user_id: 1, created_at: -1 } },
                { key: { expires_at: 1 }, expireAfterSeconds: 0 },
            ]);
        console.log('✓ Stories indexes (auto-cleanup)');

        // REELS (Trending optimized)
        await db
            .collection('reels')
            .createIndexes([
                { key: { user_id: 1, created_at: -1 } },
                { key: { trending_score: -1, created_at: -1 } },
                { key: { hashtags: 1 } },
            ]);
        console.log('✓ Reels indexes (trending optimized)');

        // MARKETPLACE
        await db
            .collection('marketplace_items')
            .createIndexes([
                { key: { seller_id: 1, created_at: -1 } },
                { key: { status: 1, created_at: -1 } },
                { key: { category: 1, price: 1 } },
            ]);
        console.log('✓ Marketplace indexes');

        // POST SAVES
        await db
            .collection('post_saves')
            .createIndexes([{ key: { user_id: 1, post_id: 1 }, unique: true }]);
        console.log('✓ Post saves indexes');

        // PUSH SUBSCRIPTIONS
        await db
            .collection('push_subscriptions')
            .createIndexes([{ key: { user_id: 1 } }, { key: { endpoint: 1 }, unique: true }]);
        console.log('✓ Push subscriptions indexes');

        // SESSIONS (TTL)
        await db
            .collection('sessions')
            .createIndexes([
                { key: { user_id: 1, last_active_at: -1 } },
                { key: { created_at: -1 }, expireAfterSeconds: 86400 * 30 },
            ]);
        console.log('✓ Sessions indexes (auto-cleanup)');

        // SNOOZES (TTL)
        await db.collection('snoozes').createIndexes([
            { key: { user_id: 1, snoozed_user_id: 1 }, unique: true },
            { key: { expires_at: 1 }, expireAfterSeconds: 0 },
        ]);
        console.log('✓ Snoozes indexes (auto-cleanup)');

        console.log('\n✅ All indexes created successfully!');
        console.log('📊 Total: 17 collections indexed');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await client.close();
    }
}

createIndexes();
