import React from 'react';
import { TrendingUp, BarChart3, Users, DollarSign } from 'lucide-react';

const AdPerformanceMetrics = ({ performanceData }) => {
    // Standardize metric calculation for 20k-user scale
    const totalImpressions =
        performanceData?.reduce((sum, d) => sum + (d.impressions || 0), 0) || 0;
    const totalClicks = performanceData?.reduce((sum, d) => sum + (d.clicks || 0), 0) || 0;
    const totalSpend = performanceData?.reduce((sum, d) => sum + (d.spend || 0), 0) || 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    const metrics = [
        {
            label: 'Impressions',
            value: totalImpressions.toLocaleString(),
            icon: <Users />,
            color: 'blue',
        },
        {
            label: 'Clicks',
            value: totalClicks.toLocaleString(),
            icon: <TrendingUp />,
            color: 'green',
        },
        {
            label: 'Total Spend',
            value: `$${totalSpend.toLocaleString()}`,
            icon: <DollarSign />,
            color: 'purple',
        },
        { label: 'Avg CTR', value: `${ctr.toFixed(2)}%`, icon: <BarChart3 />, color: 'orange' },
    ];

    return (
        <div className="performance-metrics-grid">
            {metrics.map((metric, idx) => (
                <div key={idx} className="metric-card card shadow-sm">
                    <div className={`metric-icon color-${metric.color}`}>{metric.icon}</div>
                    <div className="metric-content">
                        <div className="metric-value">{metric.value}</div>
                        <div className="metric-label">{metric.label}</div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AdPerformanceMetrics;
