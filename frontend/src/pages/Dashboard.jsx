import { useQuery } from '@tanstack/react-query';
import axios from '../lib/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await axios.get('/vendors');
      return response.data;
    },
  });

  const stats = [
    { title: 'Total Vendors', value: vendors?.length || 0, color: 'bg-blue-500' },
    { title: 'Active', value: vendors?.filter(v => v.status === 'active').length || 0, color: 'bg-green-500' },
    { title: 'Inactive', value: vendors?.filter(v => v.status === 'inactive').length || 0, color: 'bg-gray-500' },
    { title: 'Pending', value: vendors?.filter(v => v.status === 'pending').length || 0, color: 'bg-yellow-500' },
  ];

  const chartData = [
    { name: 'Active', count: vendors?.filter(v => v.status === 'active').length || 0 },
    { name: 'Inactive', count: vendors?.filter(v => v.status === 'inactive').length || 0 },
    { name: 'Pending', count: vendors?.filter(v => v.status === 'pending').length || 0 },
  ];

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-text mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-lg shadow-sm p-6">
            <div className={`w-12 h-12 ${stat.color} rounded-lg mb-4 flex items-center justify-center text-white text-xl font-bold`}>
              {stat.value}
            </div>
            <h3 className="text-gray-600 text-sm">{stat.title}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-text mb-4">Vendor Status Overview</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
