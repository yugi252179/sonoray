import Sidebar from '@/components/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex bg-[#f8fafc] min-h-screen relative">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-0 w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
