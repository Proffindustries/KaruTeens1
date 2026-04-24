import React from 'react';
import {
    Edit,
    Trash2,
    Calendar,
    Target,
    Eye,
    Users,
    TrendingUp,
    DollarSign,
    AlertCircle,
} from 'lucide-react';

const AdCampaignsTable = ({
    campaigns,
    selectedCampaigns,
    onToggleSelection,
    onSelectAll,
    onEdit,
    onDelete,
    getStatusBadge,
    getCampaignTypeBadge,
    getObjectiveBadge,
    formatCurrency,
    formatPercentage,
}) => {
    if (!campaigns || campaigns.length === 0) {
        return (
            <div className="no-data-summary">
                <AlertCircle size={48} />
                <p>No campaigns found matching your criteria.</p>
            </div>
        );
    }

    return (
        <div className="table-wrapper card shadow-sm mt-4">
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>
                            <input
                                type="checkbox"
                                onChange={onSelectAll}
                                checked={
                                    selectedCampaigns.length === campaigns.length &&
                                    campaigns.length > 0
                                }
                                aria-label="Select all campaigns"
                            />
                        </th>
                        <th>Campaign Info</th>
                        <th>Budget & Spend</th>
                        <th>Performance</th>
                        <th>Targeting</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {campaigns.map((campaign) => {
                        const status = getStatusBadge(campaign.status);
                        const type = getCampaignTypeBadge(campaign.campaign_type);
                        const obj = getObjectiveBadge(campaign.objective);

                        return (
                            <tr
                                key={campaign.id}
                                className={campaign.status === 'paused' ? 'paused-row' : ''}
                            >
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedCampaigns.includes(campaign.id)}
                                        onChange={() => onToggleSelection(campaign.id)}
                                        aria-label={`Select campaign ${campaign.name}`}
                                    />
                                </td>
                                <td>
                                    <div className="campaign-cell">
                                        <div className="campaign-primary-info">
                                            <strong>{campaign.name}</strong>
                                            <span className="id-badge">{campaign.id}</span>
                                        </div>
                                        <div className="badge-row">
                                            <span className={`pill ${status.color}`}>
                                                {status.icon} {status.text}
                                            </span>
                                            <span className={`pill ${type.color}`}>
                                                {type.icon} {type.text}
                                            </span>
                                            <span className={`pill ${obj.color}`}>
                                                {obj.icon} {obj.text}
                                            </span>
                                        </div>
                                        <div className="date-info">
                                            <Calendar size={12} />
                                            <span>
                                                {new Date(campaign.start_date).toLocaleDateString()}{' '}
                                                -
                                                {campaign.end_date
                                                    ? new Date(
                                                          campaign.end_date,
                                                      ).toLocaleDateString()
                                                    : ' Ongoing'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="budget-cell">
                                        <div className="budget-main">
                                            <strong>
                                                {formatCurrency(
                                                    campaign.daily_budget,
                                                    campaign.budget.currency,
                                                )}
                                            </strong>
                                            <small>/day</small>
                                        </div>
                                        <div className="spend-progress">
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${(campaign.budget.budget_utilization * 100).toFixed(0)}%`,
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="spend-text">
                                                {formatCurrency(
                                                    campaign.total_spend,
                                                    campaign.budget.currency,
                                                )}{' '}
                                                spent (
                                                {(campaign.budget.budget_utilization * 100).toFixed(
                                                    1,
                                                )}
                                                %)
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="performance-cell">
                                        <div className="perf-grid">
                                            <div className="perf-item">
                                                <Eye size={12} />{' '}
                                                {campaign.total_impressions.toLocaleString()}
                                            </div>
                                            <div className="perf-item">
                                                <Users size={12} />{' '}
                                                {campaign.total_clicks.toLocaleString()}
                                            </div>
                                            <div
                                                className="perf-item title"
                                                title="Click-Through Rate"
                                            >
                                                CTR: {formatPercentage(campaign.ctr)}
                                            </div>
                                            <div
                                                className="perf-item title"
                                                title="Return on Ad Spend"
                                            >
                                                ROAS: {campaign.roas.toFixed(1)}x
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="targeting-cell">
                                        <div className="target-pill">
                                            <Target size={12} /> {campaign.optimization_goal}
                                        </div>
                                        <div className="score-row">
                                            <small>
                                                Quality: {campaign.quality_score.toFixed(1)}/10
                                            </small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="actions-cell">
                                        <button
                                            className="btn-icon edit"
                                            onClick={() => onEdit(campaign)}
                                            aria-label="Edit campaign"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className="btn-icon delete"
                                            onClick={() => onDelete(campaign.id)}
                                            aria-label="Delete campaign"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default AdCampaignsTable;
