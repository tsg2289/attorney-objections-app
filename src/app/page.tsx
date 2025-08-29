'use client';

import { useState } from 'react';

export default function Home() {
  const [discoveryType, setDiscoveryType] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [objections, setObjections] = useState<string>('');
  const [factPattern, setFactPattern] = useState<string>('');
  const [answeredRequests, setAnsweredRequests] = useState<string>('');

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
      
      // If fact pattern is provided, include it for combined generation
      if (factPattern.trim()) {
        formData.append('factPattern', factPattern);
      }

      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process document');
      }

      const data = await response.json();
      setObjections(data.objections);
      
      // If answers were generated, set them too
      if (data.answers) {
        setAnsweredRequests(data.answers);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Failed to process document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };



  const handleDownloadDocx = async (content: string, type: string) => {
    if (!content) {
      alert(`No ${type} to download.`);
      return;
    }

    try {
      const response = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          objections: content, 
          discoveryType,
          filename: `${discoveryType}-${type}.docx`
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
      a.download = `${discoveryType}-${type}.docx`;
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {uploadedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {uploadedFile.name}
                </p>
              )}
            </div>

            {/* Fact Pattern Input */}
            <div>
              <label htmlFor="fact-pattern" className="block text-sm font-medium text-gray-700 mb-2">
                Fact Pattern (Optional - for generating answers)
              </label>
              <textarea
                id="fact-pattern"
                value={factPattern}
                onChange={(e) => setFactPattern(e.target.value)}
                placeholder="Enter the facts of your case here. This will be used to generate substantive answers to the discovery requests. For example: 'The remodel began in January 2024. Work was halted in May due to permit issues. The electrical contractor failed to complete installation of 5 outlets in the kitchen and 3 in the bathroom...'"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical text-black"
              />
              <p className="mt-1 text-xs text-gray-500">
                Provide case facts to generate substantive answers alongside objections
              </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <button
                onClick={handleProcessDocument}
                disabled={!uploadedFile || !discoveryType || isProcessing}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : factPattern.trim() ? 'Generate Objections & Answers' : 'Generate Objections'}
              </button>
            </div>

            {/* Results */}
            {objections && (
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Generated Objections</h2>
                  <button
                    onClick={() => handleDownloadDocx(objections, 'objections')}
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Download Objections DOCX
                  </button>
                </div>
                <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">{objections}</pre>
                </div>
              </div>
            )}

            {answeredRequests && (
              <div className="border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Generated Answers</h2>
                  <button
                    onClick={() => handleDownloadDocx(answeredRequests, 'answers')}
                    className="px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Download Answers DOCX
                  </button>
                </div>
                <div className="bg-gray-50 rounded-md p-4 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">{answeredRequests}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}