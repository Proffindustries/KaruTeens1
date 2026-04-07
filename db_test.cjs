const { MongoClient } = require('mongodb');
async function run() {
    const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db("karuteens");
        const groups = await db.collection("groups").find({}).toArray();
        console.log("--- Groups ---");
        groups.forEach(g => console.log(`ID: ${g._id}, Name: ${g.name}, Members: ${g.members.length}, Private: ${g.is_private}`));
        
        const posts = await db.collection("posts").find({ group_id: { $ne: null } }).toArray();
        console.log("\n--- Group Posts ---");
        posts.forEach(p => console.log(`ID: ${p._id}, GroupID: ${p.group_id}, Content: ${p.content.substring(0, 20)}...`));
    } finally {
        await client.close();
    }
}
run().catch(console.dir);
