
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { CrashDetection } from './utils/crashDetection'

// Initialize crash detection first
CrashDetection.initialize();

// Temporarily disable warning suppression to see actual errors during debugging
console.log('🚀 Starting app initialization...');

// Add global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('🚨 GLOBAL ERROR during app load:', event.error);
  console.error('Error details:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

// Add promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 UNHANDLED PROMISE REJECTION during app load:', event.reason);
});

try {
  console.log('📱 Creating React root...');
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found - HTML may be corrupted');
  }
  
  const root = createRoot(rootElement);
  console.log('🎯 Rendering App component...');
  root.render(<App />);
  console.log('✅ App render initiated successfully');
} catch (error) {
  console.error('💥 FATAL ERROR during app initialization:', error);
  
  // Show a basic error message to user if React fails to load
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1 style="color: #dc2626;">App Failed to Load</h1>
        <p>There was an error initializing the application.</p>
        <details style="margin-top: 20px; text-align: left;">
          <summary style="cursor: pointer;">Error Details</summary>
          <pre style="background: #f3f4f6; padding: 10px; border-radius: 4px; margin-top: 10px; white-space: pre-wrap;">
            ${error.message}
            ${error.stack || ''}
          </pre>
        </details>
        <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}
