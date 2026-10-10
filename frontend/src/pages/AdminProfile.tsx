import React from 'react';
import AdminDashboard from './AdminDashboard';

interface AdminProfileProps {
  companyFilter?: 'All' | 'SofaShine' | 'CleanCruisers';
}

const AdminProfile: React.FC<AdminProfileProps> = ({ companyFilter = 'All' }) => {
  return <AdminDashboard companyFilter={companyFilter} initialTab="profile" />;
};

export default AdminProfile;
