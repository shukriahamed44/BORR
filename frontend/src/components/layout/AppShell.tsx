import React, { useEffect, useState } from 'react';
import type { UserProfile, NavigationItemId } from '../../types/auth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardOverview } from '../dashboard/DashboardOverview';
import { EquipmentPage } from '../pages/EquipmentPage';
import { ReservationsPage } from '../pages/ReservationsPage';
import { InventoryPage } from '../pages/InventoryPage';
import { PaymentsPage } from '../pages/PaymentsPage';
import { CustomersPage } from '../pages/CustomersPage';
import { SettingsPage } from '../pages/SettingsPage';

interface AppShellProps {
  currentUser: UserProfile;
  onSignOut: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({ currentUser, onSignOut }) => {
  // Locally mutable copy so a profile edit in Settings updates the header immediately
  // without forcing a re-login. Role still originates from the verified JWT.
  const [sessionUser, setSessionUser] = useState<UserProfile>(currentUser);

  useEffect(() => {
    setSessionUser(currentUser);
  }, [currentUser]);

  const currentRole = sessionUser.role;

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
        return <CustomersPage currentRole={currentRole} />;
      case 'settings':
        return (
          <SettingsPage
            currentUser={sessionUser}
            theme={theme}
            onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            onProfileUpdated={(user) => setSessionUser({ ...sessionUser, ...user })}
          />
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
          currentUser={sessionUser}
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
