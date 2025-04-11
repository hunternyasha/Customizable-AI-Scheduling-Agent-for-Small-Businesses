# Deployment Instructions

This document provides instructions for deploying the Scheduling Agent application to Vercel.

## Prerequisites

1. A GitHub account
2. A Vercel account (https://vercel.com)
3. MongoDB Atlas account for database hosting
4. Google Cloud Platform account (for Google Calendar API)
5. Meta Developer account (for WhatsApp, Facebook, and Instagram integrations)

## Setup Steps

### 1. GitHub Repository Setup

1. Create a new GitHub repository
2. Push the project code to the repository
3. Create three branches: `development`, `staging`, and `main` (production)

### 2. Environment Variables

Set up the following environment variables in Vercel:

#### Backend Environment Variables:
- `NODE_ENV`: Environment name (development, staging, production)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT authentication
- `API_BASE_URL`: Base URL for the API
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GOOGLE_REDIRECT_URI`: Google OAuth redirect URI

#### Frontend Environment Variables:
- `NEXT_PUBLIC_API_URL`: URL of the backend API

### 3. Vercel Project Setup

1. Log in to Vercel
2. Create two new projects:
   - One for the backend (`/backend` directory)
   - One for the frontend (`/frontend/scheduling_agent_frontend` directory)
3. Link each project to the GitHub repository
4. Configure the environment variables for each project
5. Set up the deployment settings:
   - Backend: Use Node.js framework
   - Frontend: Use Next.js framework

### 4. GitHub Actions Setup

1. Create a `.github/workflows` directory in your repository
2. Add the `ci-cd.yml` file to this directory
3. Configure GitHub repository secrets:
   - `VERCEL_TOKEN`: Your Vercel API token

### 5. Initial Deployment

1. Push code to the `development` branch to trigger the first deployment
2. Verify the deployment is successful
3. Test the application functionality

### 6. Production Deployment

1. Merge changes from `staging` to `main` when ready for production
2. The GitHub Actions workflow will deploy to production after approval

## Monitoring and Maintenance

1. Set up monitoring using Vercel Analytics
2. Configure alerts for any deployment failures
3. Regularly check logs for any errors or issues

## Scaling Considerations

1. MongoDB Atlas can be scaled up as needed
2. Vercel automatically scales based on demand
3. For high-volume messaging, consider implementing a message queue system
