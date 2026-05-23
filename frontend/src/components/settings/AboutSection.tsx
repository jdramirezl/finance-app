import Card from '../ui/Card';

const AboutSection = () => {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold text-gray-100 mb-1">About</h3>
        <p className="text-gray-400 text-sm">
          Application information and version details.
        </p>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Application</span>
            <span className="text-gray-100 font-medium">FinanceCommand</span>
          </div>
          <hr className="border-gray-700" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Version</span>
            <span className="text-gray-100 text-sm">1.0.0</span>
          </div>
          <hr className="border-gray-700" />
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Stack</span>
            <span className="text-gray-100 text-sm">React + TypeScript + Supabase</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AboutSection;
