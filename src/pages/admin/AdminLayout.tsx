import { Outlet } from 'react-router-dom';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useLanguage } from '@/contexts/LanguageContext';

const AdminLayout = () => {
  const { dir } = useLanguage();
  return (
    <div className="h-screen bg-background flex overflow-hidden" dir={dir}>
      <AdminSidebar />
      <div className="hidden md:block w-64 flex-shrink-0" />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-6 md:pt-8 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
