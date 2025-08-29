'use client';

import { useState } from 'react';

export default function Home() {
  const [discoveryType, setDiscoveryType] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [objections, setObjections] = useState<string>('');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleProcessDocument = async () => {
    if (!uploadedFile || !discoveryType) {
      alert('Please select a discovery type and upload a document.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('discoveryType', discoveryType);

      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process document');
      }

      const data = await response.json();
      setObjections(data.objections);
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Failed to process document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadDocx = async () => {
    if (!objections) {
      alert('No objections to download.');
      return;
    }

    try {
      const response = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          objections, 
          discoveryType,
          filename: `${discoveryType}-objections.docx`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${discoveryType}-objections.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Legal Discovery Objections Generator
          </h1>
          
          <div className="space-y-6">
            {/* Discovery Type Selection */}
            <div>
              <label htmlFor="discovery-type" className="block text-sm font-medium text-gray-700 mb-2">
                Discovery Type
              </label>
              <select
                id="discovery-type"
                value={discoveryType}
                onChange={(e) => setDiscoveryType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select discovery type...</option>
                <option value="interrogatories">Interrogatories</option>
                <option value="request-for-documents">Request for Documents</option>
                <option value="request-for-admissions">Request for Admissions</option>
              </select>
            </div>

            {/* File Upload */}
            <div>
              <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                Upload Discovery Document
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileUpload}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {uploadedFile.name}
                </p>
              )}
            </div>

            {/* Process Button */}
            <div className="flex justify-center">
              <button
                onClick={handleProcessDocument}
                disabled={!uploadedFile || !discoveryType || isProcessing}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : 'Generate Objections'}
              </button>
            </div>

            {/* Results */}
            {objections && (
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Generated Objections</h2>
                  <button
                    onClick={handleDownloadDocx}
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Download DOCX
                  </button>
                </div>
                <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">{objections}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}