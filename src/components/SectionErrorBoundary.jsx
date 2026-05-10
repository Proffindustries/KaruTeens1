import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function SectionErrorBoundary({ children, name = 'this section' }) {
    const [hasError, setHasError] = React.useState(false);
    const [error, setError] = React.useState(null);

    React.useEffect(() => {
        const handler = (event) => {
            if (event.error) {
                setHasError(true);
                setError(event.error);
            }
        };
        window.addEventListener('error', handler);
        return () => window.removeEventListener('error', handler);
    }, []);

    if (hasError) {
        return (
            <div
                className="section-error"
                role="alert"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    background: 'rgba(var(--surface), 0.5)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid rgba(var(--border), 0.5)',
                    margin: '1rem',
                }}
            >
                <AlertTriangle size={32} color="var(--admin-warning, #f59e0b)" />
                <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                    {name} encountered an error
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>
                    {error?.message || 'Something went wrong. Please try refreshing.'}
                </p>
                <button
                    className="btn btn-outline"
                    onClick={() => {
                        setHasError(false);
                        setError(null);
                        window.location.reload();
                    }}
                    style={{ marginTop: '1.5rem' }}
                >
                    <RefreshCw size={16} />
                    Retry
                </button>
            </div>
        );
    }

    return children;
}
