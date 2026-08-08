import React, { useEffect, useState } from 'react';
import type { UserProfile, NavigationItemId } from '../../types/auth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardOverview } from '../dashboard/DashboardOverview';
import { EquipmentPage } from '../pages/EquipmentPage';
import { ReservationsPage } from '../pages/ReservationsPage';
import { InventoryPage } from '../pages/InventoryPage';
import { PaymentsPage } from '../pages/PaymentsPage';

interface AppShellProps {
  currentUser: UserProfile;
  onSignOut: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ currentUser, onSignOut }) => {
  // Role comes from the authenticated JWT user — the backend RBAC guards enforce the same value.
  const currentRole = currentUser.role;

  const [activeNavId, setActiveNavId] = useState<NavigationItemId>(
    currentRole === 'CUSTOMER' ? 'storefront' : 'dashboard',
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('ammunation_theme') as 'light' | 'dark') || 'light',
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ammunation_theme', theme);
  }, [theme]);

  const renderActiveView = () => {
    switch (activeNavId) {
      case 'dashboard':
      case 'storefront':
        return (
          <DashboardOverview
            currentRole={currentRole}
            onNavigate={(page) => setActiveNavId(page)}
          />
        );
      case 'equipment':
        return <EquipmentPage currentRole={currentRole} />;
      case 'reservations':
        return <ReservationsPage currentRole={currentRole} />;
      case 'inventory':
        return <InventoryPage currentRole={currentRole} />;
      case 'payments':
        return <PaymentsPage currentRole={currentRole} />;
      case 'customers':
        return (
          <div className="placeholder-view glass-panel">
            <h2>👥 Customers & Document Verification</h2>
            <p>
              Verified customer accounts: John Customer (customer@ammunation.com), Sarah Connor (sarah.connor@gmail.com), Bruce Wayne (bruce.wayne@enterprise.com).
            </p>
          </div>
        );
      case 'settings':
        return (
          <div className="placeholder-view glass-panel">
            <h2>⚙️ System & Account Preferences</h2>
            <p>
              Signed in as <strong>{currentUser.name}</strong> ({currentUser.email}) with role <strong>{currentRole}</strong>.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`app-shell-root ${
        isSidebarCollapsed ? 'sidebar-collapsed' : ''
      }`}
    >
      {/* Sidebar Navigation */}
      <Sidebar
        currentRole={currentRole}
        activeItem={activeNavId}
        onSelectNav={(item) => setActiveNavId(item)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSignOut={onSignOut}
      />

      {/* Main Content Area */}
      <div className="app-main-wrapper">
        {/* Header Bar */}
        <Header
          currentUser={currentUser}
          currentRole={currentRole}
          onToggleMobileSidebar={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
          activeNavId={activeNavId}
          onSelectNav={(item) => setActiveNavId(item)}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          onSignOut={onSignOut}
        />

        {/* Dynamic Page Content View */}
        <main className="app-main-content">{renderActiveView()}</main>
      </div>
    </div>
  );
};
