const { MongoClient } = require('mongodb');
async function run() {
    const client = new MongoClient(process.env.MONGO_URI || "mongodb://localhost:27017");
    await client.connect();
    const db = client.db("karuteens");
    const group = await db.collection("groups").findOne({ _id: new (require('mongodb').ObjectId)("69cfd889ee6774a0bcd6e6dc") });
    console.log("Group is_private:", group.is_private);
    console.log("Group members includes currentUser?:", group.members.length);
    const post = await db.collection("posts").findOne({ group_id: new (require('mongodb').ObjectId)("69cfd889ee6774a0bcd6e6dc") });
    console.log("Has post:", !!post);
    if(post) console.log("Post status:", post.status);
    client.close();
}
run();
