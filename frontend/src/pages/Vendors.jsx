import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';

const Vendors = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active',
  });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const response = await axios.get('/vendors');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data) => axios.post('/vendors', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendors']);
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => axios.put(`/vendors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendors']);
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axios.delete(`/vendors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['vendors']);
    },
  });

  const openModal = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData(vendor);
    } else {
      setEditingVendor(null);
      setFormData({ name: '', email: '', phone: '', address: '', status: 'active' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVendor(null);
    setFormData({ name: '', email: '', phone: '', address: '', status: 'active' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text">Vendors</h1>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          Add Vendor
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vendors?.map((vendor) => (
              <tr key={vendor.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-text">{vendor.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{vendor.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{vendor.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    vendor.status === 'active' ? 'bg-green-100 text-green-800' :
                    vendor.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {vendor.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => openModal(vendor)}
                    className="text-primary hover:underline mr-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(vendor.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-text mb-4">
              {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-primary text-white py-2 rounded-lg hover:bg-green-600 transition-colors"
                >
                  {editingVendor ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 text-text py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
