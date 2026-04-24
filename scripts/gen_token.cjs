// scripts/gen_token.cjs
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'your-secret-key'; // I need to find the real secret or pass it

const payload = {
    sub: '65ed6e7e1234567890abcdef', // Dummy ObjectId
    role: 'admin',
    is_verified: true,
    exp: Math.floor(Date.now() / 1000) + 60 * 60,
};

const token = jwt.sign(payload, secret);
console.log(token);
