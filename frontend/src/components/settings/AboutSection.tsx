import Card from '../ui/Card';

const AboutSection = () => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold text-on-surface mb-1">About</h3>
        <p className="text-on-surface-variant text-sm">
          Application information and version details.
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant text-sm">Application</span>
            <span className="text-on-surface font-medium">FinanceCommand</span>
          </div>
          <hr className="border-white/[0.06]" />
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant text-sm">Version</span>
            <span className="text-on-surface font-mono text-sm">1.0.0</span>
          </div>
          <hr className="border-white/[0.06]" />
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant text-sm">Stack</span>
            <span className="text-on-surface text-sm">React + TypeScript + Supabase</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AboutSection;
