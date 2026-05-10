import React from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    resetError = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.lightweight) {
                return (
                    <div
                        className="post-card card post-hidden-overlay"
                        style={{ minHeight: '120px' }}
                    >
                        <AlertTriangle size={24} className="opacity-30" />
                        <p style={{ fontSize: '0.85rem', margin: '0.5rem 0' }}>
                            This post couldn't be loaded
                        </p>
                        <button className="undo-hide-btn" onClick={this.resetError}>
                            Retry
                        </button>
                    </div>
                );
            }
            return (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '400px',
                        padding: '2rem',
                        textAlign: 'center',
                    }}
                >
                    <AlertTriangle size={48} color="#ff4757" />
                    <h2 style={{ marginTop: '1rem' }}>Something went wrong</h2>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={this.resetError}
                        style={{
                            marginTop: '1.5rem',
                            padding: '0.75rem 1.5rem',
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
