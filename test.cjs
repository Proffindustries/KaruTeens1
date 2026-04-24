const { MongoClient, ObjectId } = require('mongodb');
async function run() {
    const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');
    await client.connect();
    const db = client.db('karuteens');
    const group = await db
        .collection('groups')
        .findOne({ _id: new ObjectId('69cfd889ee6774a0bcd6e6dc') });
    if (group) {
        console.log('Group is_private:', group.is_private);
    } else {
        console.log('Group not found');
    }
    const post = await db
        .collection('posts')
        .findOne({ group_id: new ObjectId('69cfd889ee6774a0bcd6e6dc') });
    console.log('Has post:', !!post);
    if (post) console.log('Post status:', post.status);
    client.close();
}
run();
