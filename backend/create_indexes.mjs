import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'karuteens_db';

async function createIndexes() {
    const client = new MongoClient(MONGO_URI);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db(DB_NAME);

        // Users Collection
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        await db.collection('users').createIndex({ created_at: -1 });
        await db.collection('users').createIndex({ is_verified: 1 });
        await db.collection('users').createIndex({ is_premium: 1 });

        // Profiles Collection
        await db.collection('profiles').createIndex({ user_id: 1 }, { unique: true });
        await db.collection('profiles').createIndex({ username: 1 }, { unique: true });
        await db.collection('profiles').createIndex({ last_seen_at: -1 });

        // Posts Collection
        await db.collection('posts').createIndex({ author_id: 1, created_at: -1 });
        await db.collection('posts').createIndex({ status: 1, created_at: -1 });
        await db.collection('posts').createIndex({ category: 1, created_at: -1 });
        await db.collection('posts').createIndex({ tags: 1 });
        await db.collection('posts').createIndex({ created_at: -1 });

        // Comments Collection
        await db.collection('comments').createIndex({ post_id: 1, created_at: -1 });
        await db.collection('comments').createIndex({ user_id: 1, created_at: -1 });
        await db.collection('comments').createIndex({ parent_id: 1 });

        // Messages Collection
        await db.collection('messages').createIndex({ chat_id: 1, created_at: -1 });
        await db.collection('messages').createIndex({ sender_id: 1, created_at: -1 });
        await db.collection('messages').createIndex({ read_at: 1 });

        // Chats Collection
        await db.collection('chats').createIndex({ participants: 1 });
        await db.collection('chats').createIndex({ last_message_time: -1 });
        await db.collection('chats').createIndex({ type: 1 });

        // Groups Collection
        await db.collection('groups').createIndex({ creator_id: 1 });
        await db.collection('groups').createIndex({ members: 1 });
        await db.collection('groups').createIndex({ category: 1 });
        await db.collection('groups').createIndex({ created_at: -1 });

        // Events Collection
        await db.collection('events').createIndex({ organizer_id: 1 });
        await db.collection('events').createIndex({ start_datetime: 1 });
        await db.collection('events').createIndex({ status: 1, start_datetime: 1 });
        await db.collection('events').createIndex({ category: 1 });

        // Notifications Collection
        await db.collection('notifications').createIndex({ user_id: 1, created_at: -1 });
        await db.collection('notifications').createIndex({ read: 1, created_at: -1 });

        // Stories Collection
        await db.collection('stories').createIndex({ user_id: 1, created_at: -1 });
        await db.collection('stories').createIndex({ expires_at: 1 });

        // Marketplace Items Collection
        await db.collection('marketplace_items').createIndex({ seller_id: 1, created_at: -1 });
        await db.collection('marketplace_items').createIndex({ status: 1, created_at: -1 });
        await db.collection('marketplace_items').createIndex({ category: 1 });

        // Transactions Collection
        await db.collection('transactions').createIndex({ checkout_request_id: 1 }, { unique: true });
        await db.collection('transactions').createIndex({ user_id: 1, created_at: -1 });
        await db.collection('transactions').createIndex({ status: 1 });

        console.log('✅ All indexes created successfully!');
    } catch (error) {
        console.error('Error creating indexes:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

createIndexes();
