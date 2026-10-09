# BrandShield AI

BrandShield AI is a demo brand-protection dashboard that detects impersonating social accounts and suspicious mobile apps using heuristic brand-matching and scam-language checks.

## Features

- Overview dashboard with risk metrics and charts
- Brand profile management
- Social and app monitoring views
- Threat intelligence and reporting views
- Demo scan engine with risk scoring
- Backend API for scan and profile data

## Local development

```bash
npm install
npm run dev
```

The frontend runs on http://localhost:5173 and the API runs on http://localhost:3001.

## Demo deployment setup

### Option 1: Vercel (frontend)

1. Push this repo to GitHub.
2. Import the project in Vercel.
3. Use the default Vite settings.
4. Set the project root to the repository root.
5. Deploy.

### Option 2: Render (backend API)

1. Create a new Web Service in Render.
2. Connect the same GitHub repo.
3. Use the following settings:
   - Build Command: `npm install`
   - Start Command: `npm run start`
4. Set environment variable: `PORT=10000`
5. Deploy.

### Recommended for demo hosting

- Host the frontend on Vercel.
- Host the backend API on Render.
- Set `VITE_API_BASE_URL` in the Vercel environment to the Render API URL.

Example:

```env
VITE_API_BASE_URL=https://your-render-app.onrender.com
```

## Notes

This is a demo-ready MVP, not a production-grade monitoring platform. It is intended for hackathon demos, internal showcases, and proof-of-concept validation.
