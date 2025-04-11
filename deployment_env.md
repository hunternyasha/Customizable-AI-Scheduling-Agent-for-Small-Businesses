# Scheduling Agent - Deployment Configuration

This file contains the necessary environment variables for deploying the Scheduling Agent application to Vercel.

## Frontend Environment Variables (.env.local)

```
NEXT_PUBLIC_API_URL=https://scheduling-agent-backend.vercel.app/api
NEXT_PUBLIC_APP_URL=https://scheduling-agent.vercel.app
```

## Backend Environment Variables

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/scheduling_agent?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key
API_BASE_URL=https://scheduling-agent-backend.vercel.app
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://scheduling-agent-backend.vercel.app/api/google-calendar/callback
```

Replace the placeholder values with your actual credentials before deployment.
