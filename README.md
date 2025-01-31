
# SurveyPro

SurveyPro is a modern web application for creating, managing, and analyzing online surveys.


## 🚀 Features

- Custom survey creation
- Multiple question types (multiple choice, free text, scale, etc.)
- Easy survey sharing via unique links
- Real-time response collection and analysis
- Result visualization with charts
- Intuitive and responsive user interface
## 🛠️ Tech Stack

### Frontend
- React.js
- Next.js
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express.js
- MongoDB

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## 🔧 Installation

1. Clone the repository

```bash
git clone https://github.com/joey603/SurveyPro.git
cd SurveyPro
```
2. Install Frontend dependencies

```bash
cd frontend
npm install
```

3. Install Backend dependencies

```bash
cd frontend
npm install
```




## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

In the backend folder, create a .env local file

```bash
// Database MongoDB
MONGO_URI=your_mongo_uri_here

// Token/Jeton
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

// Send mail to register
SENDGRID_API_KEY=your_sendgrid_api_key_here
EMAIL_FROM=your_email_here

// Database media (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name_here
CLOUDINARY_API_KEY=your_cloudinary_api_key_here
CLOUDINARY_API_SECRET=your_cloudinary_api_secret_here

PORT=your_port_here

``` 
## 🚀 Getting Started

1. Start the Backend server

```bash
cd backend
npm start
```

2. Start the Frontend server

```bash
cd frontend
npm run dev
```

The application will be available at: `http://localhost:3000`


```bash

```
## Support

For support, email yoelibarthel603@gmail.com/rudyhaddad.job@gmail.com
