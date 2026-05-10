import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';

const STAR_COUNT = 150;

const COLORS = [
    [255, 255, 255], // white
    [200, 220, 255], // blue-white
    [255, 230, 200], // warm white
    [255, 210, 180], // orange-white
    [180, 200, 255], // cool blue
    [255, 240, 210], // yellow-white
];

const StarBackground = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const stars = useMemo(() => {
        return Array.from({ length: STAR_COUNT }, (_, i) => {
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const size = Math.random();
            return {
                id: i,
                left: Math.random() * 100,
                top: Math.random() * 100,
                size:
                    size < 0.3
                        ? 1 + Math.random() * 0.5
                        : size < 0.7
                          ? 2 + Math.random()
                          : 3 + Math.random() * 1.5,
                color: `${color[0]}, ${color[1]}, ${color[2]}`,
                delay: Math.random() * 6,
                duration: 2 + Math.random() * 5,
            };
        });
    }, []);

    if (!isDark) return null;

    return (
        <div className="star-bg" aria-hidden="true">
            {stars.map((star) => (
                <div
                    key={star.id}
                    className="star"
                    style={{
                        left: `${star.left}%`,
                        top: `${star.top}%`,
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        backgroundColor: `rgb(${star.color})`,
                        boxShadow: `0 0 ${star.size * 1.5}px ${star.size * 0.5}px rgba(${star.color}, 0.4)`,
                        animationDelay: `${star.delay}s`,
                        animationDuration: `${star.duration}s`,
                    }}
                />
            ))}
        </div>
    );
};

export default StarBackground;
