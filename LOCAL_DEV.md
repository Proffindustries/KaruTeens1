# Local Development Guide for Karu Teens

To test the application locally before pushing to GitHub, follow these steps:

## Prerequisites
1. **Rust & Cargo**: Installed for the backend.
2. **Node.js & npm**: Installed for the frontend.
3. **MongoDB**: You can use your Atlas URI or a local instance.
4. **Redis**: Running locally (via Docker or native).

---

## 🚀 Quick Start (Local Testing)

### 1. Setup Environment Variables
If you are currently pointing to production, you'll see errors in the console. To switch to local mode:

#### Frontend (`/home/kali/Desktop/newest plan app/.env.local`)
Create this file to override production settings:
```env
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3000/ws
```

#### Backend (`/home/kali/Desktop/newest plan app/backend/.env`)
Ensure your backend `.env` has:
```env
PORT=3000
MONGO_URI=your_mongodb_uri
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=your_dev_secret
# Important: Allow both production and local origins
FRONTEND_URL=https://www.karuteens.site,https://karuteens.site,http://localhost:5173,http://127.0.0.1:5173
```

### 2. Run the Services

#### Run Backend
In one terminal:
```bash
cd backend
cargo run
```

#### Run Frontend
In another terminal:
```bash
npm run dev
```

---

## 🛠️ Debugging Connection Issues

### "WS Connection Interrupted"
If you see this error, it means:
- The backend is not running.
- The backend is running on a different port than the frontend expects.
- `VITE_API_URL` is still pointing to `backend.karuteens.site`.

**Fix:** Check your `.env.local` and ensure `cargo run` is active.

### "Ably Auth Request Failed"
Ably requires the backend to be running to generate auth tokens.
**Fix:** Ensure the backend is reachable at the `VITE_API_URL`.

---

## 📦 Using Docker for Dependencies
If you don't have Redis/Mongo installed:
```bash
cd backend
docker-compose up -d
```
*(This starts Redis. If you need local Mongo, you'll need to update the docker-compose.yml)*
