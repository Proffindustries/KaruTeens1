import React from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

// Helper for bold text **like this**
const formatBold = (text) => {
    if (!text) return '';
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

// Simple Markdown-like formatter for academic points
const FormattedText = ({ text }) => {
    if (!text) return null;

    // Handle math blocks \[ ... \]
    const segments = text.split(/(\\\[[\s\S]*?\\\])/g);

    return (
        <div className="formatted-content">
            {segments.map((segment, i) => {
                if (segment.startsWith('\\[') && segment.endsWith('\\]')) {
                    const math = segment.slice(2, -2).trim();
                    return (
                        <div
                            key={i}
                            className="math-block-container"
                            style={{ margin: '1rem 0', overflowX: 'auto' }}
                        >
                            <BlockMath math={math} />
                        </div>
                    );
                }

                // Handle inline math \( ... \)
                const inlineSegments = segment.split(/(\\\(.*?\\\))/g);
                return inlineSegments.map((inline, j) => {
                    if (inline.startsWith('\\(') && inline.endsWith('\\)')) {
                        const math = inline.slice(2, -2).trim();
                        return <InlineMath key={`${i}-${j}`} math={math} />;
                    }

                    // Handle standard formatting for the rest
                    const lines = inline.split('\n');
                    return lines.map((line, k) => {
                        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                            const content = line.trim().substring(2);
                            return (
                                <li
                                    key={`${i}-${j}-${k}`}
                                    style={{ marginLeft: '1.5rem', marginBottom: '0.25rem' }}
                                >
                                    {formatBold(content)}
                                </li>
                            );
                        }

                        if (line.startsWith('#')) {
                            const level = (line.match(/^#+/)?.[0] || '#').length;
                            const content = line.replace(/^#+\s*/, '');
                            return React.createElement(
                                `h${Math.min(level + 1, 4)}`,
                                { key: `${i}-${j}-${k}`, style: { margin: '1rem 0 0.5rem 0' } },
                                formatBold(content),
                            );
                        }

                        return line.trim() === '' ? (
                            <div key={`${i}-${j}-${k}`} style={{ height: '0.5rem' }} />
                        ) : (
                            <p key={`${i}-${j}-${k}`} style={{ marginBottom: '0.5rem' }}>
                                {formatBold(line)}
                            </p>
                        );
                    });
                });
            })}
        </div>
    );
};

export default FormattedText;
