import Sidebar from '@/components/Sidebar';
import BackgroundTracker from '@/components/BackgroundTracker';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-[#f8fafc] min-h-screen relative w-full overflow-x-hidden">
      <Sidebar />
      <BackgroundTracker />
      <main className="flex-1 md:ml-64 ml-0 p-0 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
