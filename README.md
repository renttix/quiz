# XQuizLive - Real-time Pub Quiz App for Twitter Spaces

A real-time pub quiz application built with Next.js, Socket.IO, and MongoDB, designed for Twitter Spaces. The app features live question synchronization, instant scoring, and a host dashboard for quiz management.

## Features

- Real-time quiz participation with WebSocket synchronization
- Host dashboard with quiz controls and participant monitoring
- Question bank management with CSV/JSON import/export
- Mobile-friendly, dark mode interface
- Support for multiple quiz categories
- 15-second answer timer for each question
- Final leaderboard display
- Mid-game join support

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, ShadCN UI
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Deployment**: Ready for Vercel (frontend) and DigitalOcean/AWS (backend)

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd quiz-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up MongoDB:
   You have two options for the database:

   a. Local MongoDB:
   - Install MongoDB Community Edition on your machine
   - Start the MongoDB service
   - Use this connection string in `.env.local`:
     ```
     MONGODB_URI=mongodb://localhost:27017/quiz-app
     ```

   b. MongoDB Atlas:
   - Create a free account at MongoDB Atlas (https://www.mongodb.com/cloud/atlas)
   - Create a new cluster
   - Get your connection string from the cluster
   - Replace username, password, and cluster details in `.env.local`:
     ```
     MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/quiz-app?retryWrites=true&w=majority
     ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Hosting a Quiz

1. Click "Host Quiz" on the home page
2. Enter the host code: @08009992820
3. Import questions using the Question Bank tab (CSV or JSON format)
4. Share the quiz URL with participants
5. Use the dashboard to control the quiz flow

### Joining a Quiz

1. Click "Join Quiz" on the home page
2. Enter your name
3. Wait for the host to start the quiz
4. Answer questions within the 15-second time limit

### Question Import Format

Questions can be imported in either CSV or JSON format. Sample files are provided in the `src/data` directory.

#### JSON Format:
```json
{
  "category": "Category Name",
  "question": "Question text",
  "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
  "correctAnswer": "Correct option"
}
```

#### CSV Format:
```
Category,Question,Option 1,Option 2,Option 3,Option 4,Correct Answer
```

## Quiz Categories

- 80's Music
- 90's Music
- Geography
- Sport
- TV & Film

## Development

### Project Structure

```
quiz-app/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── lib/             # Utilities and helpers
│   │   ├── models/      # MongoDB models
│   │   ├── utils/       # Helper functions
│   │   ├── db.ts        # Database connection
│   │   └── socket.ts    # WebSocket setup
│   └── data/            # Sample data files
```

### Key Components

- `QuestionManager`: Handles question import/export and management
- `HostDashboard`: Quiz control interface for hosts
- `JoinQuiz`: Participant quiz interface
- `Socket Server`: Manages real-time quiz state synchronization

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Deployment

### Frontend Deployment (Vercel)

1. Create a Vercel account at https://vercel.com
2. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
3. Login to Vercel:
   ```bash
   vercel login
   ```
4. Deploy the application:
   ```bash
   vercel
   ```
5. For production deployment:
   ```bash
   vercel --prod
   ```

### Backend Deployment

#### Option 1: DigitalOcean

1. Create a DigitalOcean account
2. Create a new Droplet (Ubuntu)
3. SSH into your Droplet:
   ```bash
   ssh root@your-droplet-ip
   ```
4. Install Node.js and MongoDB:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install MongoDB
   wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   ```
5. Clone and set up the application:
   ```bash
   git clone <repository-url>
   cd quiz-app
   npm install
   npm run build
   ```
6. Set up PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start npm --name "quiz-app" -- start
   ```

#### Option 2: AWS EC2

1. Create an AWS account
2. Launch an EC2 instance (Ubuntu)
3. Configure Security Groups to allow ports 80, 443, and 3000
4. SSH into your instance:
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```
5. Follow the same installation steps as DigitalOcean (steps 4-6)
6. Set up Nginx as a reverse proxy:
   ```bash
   sudo apt-get install nginx
   ```
7. Configure Nginx (/etc/nginx/sites-available/default):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
8. Restart Nginx:
   ```bash
   sudo service nginx restart
   ```

### Environment Variables

Make sure to set up the following environment variables in your deployment environment:

```env
MONGODB_URI=your_production_mongodb_uri
```

For Vercel, you can set environment variables in the project settings dashboard.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
