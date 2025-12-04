import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    formatValue?: (value: number) => string;
    className?: string;
}

const AnimatedCounter = ({
    value,
    duration = 1000,
    formatValue = (v) => v.toFixed(2),
    className = '',
}: AnimatedCounterProps) => {
    const [displayValue, setDisplayValue] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const previousValue = useRef(0);
    const animationFrameId = useRef<number | undefined>(undefined);

    useEffect(() => {
        // Skip animation on initial mount if value is 0
        if (previousValue.current === 0 && value === 0) {
            return;
        }

        setIsAnimating(true);
        const startValue = previousValue.current;
        const endValue = value;
        const startTime = Date.now();

        const animate = () => {
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out cubic)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (endValue - startValue) * easeOut;

            setDisplayValue(currentValue);

            if (progress < 1) {
                animationFrameId.current = requestAnimationFrame(animate);
            } else {
                setDisplayValue(endValue);
                setIsAnimating(false);
                previousValue.current = endValue;
            }
        };

        animationFrameId.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [value, duration]);

    return (
        <span className={`${className} ${isAnimating ? 'transition-all' : ''}`}>
            {formatValue(displayValue)}
        </span>
    );
};

export default AnimatedCounter;
