import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Fix: Explicitly define children in props interface to avoid "Property 'props' does not exist" error
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#020617', color: '#ef4444', height: '100vh', fontFamily: 'monospace' }}>
          <h1>CRITICAL SYSTEM FAILURE</h1>
          <p>The application encountered a fatal error.</p>
          <pre style={{ marginTop: '20px', padding: '10px', backgroundColor: '#1e293b', overflow: 'auto' }}>
            {this.state.error?.toString()}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            REBOOT SYSTEM
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);