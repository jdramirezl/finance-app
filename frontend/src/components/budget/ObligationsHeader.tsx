interface ObligationsHeaderProps {
  enabledCount: number;
  totalCount: number;
  totalMonthly: number;
  currency: string;
}

const fmt = (value: number, currency: string) =>
  value.toLocaleString(undefined, { style: 'currency', currency });

const ObligationsHeader = ({
  enabledCount,
  totalCount,
  totalMonthly,
  currency,
}: ObligationsHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <h2 className="text-gray-100 font-semibold">Fixed Obligations</h2>
        <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">
          {enabledCount}/{totalCount}
        </span>
      </div>
      <span className="text-gray-400 text-sm">{fmt(totalMonthly, currency)}</span>
    </div>
  );
};

export default ObligationsHeader;
