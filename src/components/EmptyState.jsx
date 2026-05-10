import { Inbox } from 'lucide-react';
import '../styles/EmptyState.css';

export default function EmptyState({
    icon: Icon = Inbox,
    title = 'Nothing here yet',
    message = '',
    actionLabel,
    onAction,
}) {
    return (
        <div className="empty-state" role="status">
            <div className="empty-state-icon">
                <Icon size={48} />
            </div>
            <h3 className="empty-state-title">{title}</h3>
            {message && <p className="empty-state-message">{message}</p>}
            {actionLabel && onAction && (
                <button className="btn btn-primary" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
