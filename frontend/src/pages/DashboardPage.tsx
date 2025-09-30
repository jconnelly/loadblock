import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AppLayout from '../components/layout/AppLayout';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import CarrierDashboard from '../components/dashboard/CarrierDashboard';
import ShipperDashboard from '../components/dashboard/ShipperDashboard';
import BrokerDashboard from '../components/dashboard/BrokerDashboard';
import ConsigneeDashboard from '../components/dashboard/ConsigneeDashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) {
    return null; // This should not happen due to auth guard, but just in case
  }

  // Determine the primary role for dashboard selection
  // Priority: admin > carrier > broker > shipper > consignee
  const getPrimaryRole = (roles: string[]) => {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('carrier')) return 'carrier';
    if (roles.includes('broker')) return 'broker';
    if (roles.includes('shipper')) return 'shipper';
    if (roles.includes('consignee')) return 'consignee';
    return 'consignee'; // fallback
  };

  const primaryRole = getPrimaryRole(user.roles);

  const renderRoleSpecificDashboard = () => {
    switch (primaryRole) {
      case 'admin':
        return <AdminDashboard user={user} />;
      case 'carrier':
        return <CarrierDashboard user={user} />;
      case 'shipper':
        return <ShipperDashboard user={user} />;
      case 'broker':
        return <BrokerDashboard user={user} />;
      case 'consignee':
        return <ConsigneeDashboard user={user} />;
      default:
        return <ConsigneeDashboard user={user} />;
    }
  };

  return (
    <AppLayout>
      {renderRoleSpecificDashboard()}
    </AppLayout>
  );
}