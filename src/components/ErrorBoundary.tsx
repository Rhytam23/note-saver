import React from 'react';

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900">
          <h1 className="text-3xl font-bold mb-4">Something went wrong.</h1>
          <div className="bg-white p-6 rounded shadow max-w-2xl overflow-auto">
            <p className="font-mono text-red-600 mb-4">{this.state.error?.toString()}</p>
            <p className="text-sm text-gray-500">Please share this error with support.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;