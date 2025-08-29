# Legal Discovery Objections Generator

A Next.js application that helps attorneys draft objections to discovery requests using AI assistance.

## Features

- **Discovery Type Selection**: Support for Interrogatories, Request for Documents, and Request for Admissions
- **Document Upload**: Upload discovery documents in .doc, .docx, or .txt format
- **AI-Powered Objections**: Uses OpenAI GPT-4 to generate appropriate legal objections
- **Professional Formatting**: Generates DOCX files with proper legal formatting (Times New Roman, 12pt, double-spaced, 1-inch margins)
- **Secure API Management**: Safely handles OpenAI API keys using environment variables

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd objections
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. **Select Discovery Type**: Choose from Interrogatories, Request for Documents, or Request for Admissions
2. **Upload Document**: Upload the discovery document you need to respond to
3. **Generate Objections**: Click "Generate Objections" to create AI-powered objections
4. **Download DOCX**: Download the properly formatted objections document

## Deployment

### Vercel Deployment

This app is configured for easy deployment on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your `OPENAI_API_KEY` as an environment variable in Vercel
4. Deploy!

The app includes a `vercel.json` configuration file for optimal deployment settings.

### Environment Variables

Make sure to set the following environment variable in your deployment:

- `OPENAI_API_KEY`: Your OpenAI API key

## Technical Details

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **AI Integration**: OpenAI GPT-4
- **Document Processing**: Mammoth.js for Word documents
- **DOCX Generation**: docx library with legal formatting standards
- **File Upload**: Built-in FormData handling

## Legal Formatting Standards

The generated DOCX files follow standard legal document formatting:
- Font: Times New Roman, 12pt
- Line Spacing: Double-spaced
- Margins: 1 inch on all sides
- Proper spacing after paragraphs

## License

This project is licensed under the MIT License.