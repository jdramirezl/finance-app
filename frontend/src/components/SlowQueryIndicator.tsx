interface Props {
  message?: string;
}

const SlowQueryIndicator = ({ message = 'This is taking longer than usual...' }: Props) => (
  <p className="text-sm text-amber-600 dark:text-amber-400 animate-pulse mt-2">{message}</p>
);

export default SlowQueryIndicator;
