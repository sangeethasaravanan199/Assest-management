# Deploying the Asset Management app (local Docker)

This project contains two services: a Node.js backend and a Vite React frontend.

Quick local deployment using Docker Compose:

1. Build and start services:

```powershell
cd <project-root>
docker-compose build
docker-compose up -d
```

2. Confirm services:

 - Backend: http://localhost:5000 (health: /api/health)
 - Frontend: http://localhost:5173

Notes and cloud options:

- Vercel: Best for frontend — connect the `frontend` folder to a Vercel project.
- Render / Railway / Fly / Heroku: Use for backend (Node.js). You can either deploy the `backend` folder directly or push a Docker image.
- Docker approach: push images to a registry (Docker Hub) and use your cloud provider to run the images.

If you want, I can:

- Build and run the Docker Compose here (if Docker is installed).
- Prepare a GitHub Actions workflow to build and push images to Docker Hub.
- Help deploy to a specific provider (Vercel/Render/Railway). Tell me which one.
 
Vercel (frontend) — recommended quick deploy

1) From the Vercel dashboard

- Create a new project and import the repository. Set the project root to the `frontend` folder.
- Build command: `npm run build`
- Output directory: `dist`
- Add an environment variable `VITE_API_BASE_URL` pointing to your backend base URL (e.g. `https://api.example.com/api`).

2) From your local machine (Vercel CLI)

```bash
npm i -g vercel
cd frontend
vercel login
# for a production deployment and set env var inline:
vercel --prod --confirm --env VITE_API_BASE_URL=https://your-backend-url/api
```

Notes about the backend connectivity

- If your backend stays on your local machine, the frontend deployed on Vercel cannot call `http://localhost:5000`. Expose your local backend with a tunnel (ngrok/localtunnel) and use the tunnel URL as `VITE_API_BASE_URL`.

Example ngrok command (on machine running backend):

```bash
ngrok http 5000
# then set VITE_API_BASE_URL to the generated https://xxxxx.ngrok.io/api
```

If you'd like, I can:

- Create a GitHub repo and push this code, then connect it to Vercel for you (I will need access or you can grant it).
- Help deploy the backend to Render/Railway so both frontend and backend are public without tunnels.
