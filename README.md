# Easedrobe - Digital Wardrobe App

Easedrobe is an intelligent digital wardrobe application that uses AI to analyze, rate, and suggest outfit combinations from your clothing photos.

## Features

- **Digital Wardrobe Management**: Upload and organize your clothing items by category
- **AI-Powered Analysis**: Get ratings and feedback on your outfits and individual items
- **Outfit Suggestions**: Receive AI-generated outfit combinations based on your wardrobe
- **Shopping Assistant**: Analyze potential purchases for compatibility with your existing clothes

## Tech Stack

- **Frontend**: React, TailwindCSS, ShadcnUI
- **Backend**: Express.js
- **AI Integration**: OpenAI API (GPT-4o)
- **Data Storage**: In-memory storage (can be extended to use databases)

## Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key

### Installation

1. Clone this repository
```
git clone https://github.com/yourusername/easedrobe.git
cd easedrobe
```

2. Install dependencies
```
npm install
```

3. Create a `.env` file in the root directory and add your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

4. Start the development server
```
npm run dev
```

5. Open your browser and navigate to `http://localhost:5000`

## Project Structure

- `/client`: React frontend application
  - `/src/components`: UI components
  - `/src/pages`: Application pages
  - `/src/hooks`: Custom React hooks
  - `/src/lib`: Utility functions

- `/server`: Express backend
  - `/routes.ts`: API endpoints
  - `/storage.ts`: Data storage logic
  - `/utils`: Utility functions including OpenAI integration

- `/shared`: Code shared between frontend and backend
  - `/schema.ts`: Data models and schemas

## Acknowledgments

- Built with [ShadcnUI](https://ui.shadcn.com/) components
- Uses OpenAI's GPT-4o for AI analysis