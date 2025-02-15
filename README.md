# Quiz App

A real-time quiz application built with Next.js, Socket.IO, and MongoDB.

## Deployment to Vercel

### Prerequisites

1. A MongoDB Atlas database
2. A Vercel account
3. The Vercel CLI (optional)

### Environment Variables

The following environment variables need to be set in your Vercel project:

- `MONGODB_URI`: Your MongoDB connection string (from MongoDB Atlas)
- `NEXT_PUBLIC_SOCKET_URL`: The URL of your deployed app (will be set automatically by Vercel)

### Deployment Steps

1. Fork or clone this repository
2. Create a new project in Vercel
3. Connect your GitHub repository to Vercel
4. Set up environment variables in Vercel project settings:
   - Go to your project settings
   - Navigate to the "Environment Variables" section
   - Add the required environment variables

### MongoDB Setup

1. Create a MongoDB Atlas account if you don't have one
2. Create a new cluster
3. Get your connection string from MongoDB Atlas
4. Add the connection string to your Vercel environment variables as `MONGODB_URI`

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### Automatic Deployment

The app will automatically deploy when you push changes to the main branch.

## Development

### Local Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with the following variables:
```
MONGODB_URI=your_mongodb_uri
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

### Building

```bash
npm run build
```

### Starting Production Server

```bash
npm start
```

## Features

- Real-time quiz hosting and participation
- Multiple choice questions
- Live participant tracking
- Instant answer feedback
- Leaderboard system

## Technical Stack

- Next.js 14
- Socket.IO for real-time communication
- MongoDB with Mongoose
- TypeScript
- Tailwind CSS
