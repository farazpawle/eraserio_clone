// import { AdminRouteGuard } from "@/components/AdminRouteGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // <AdminRouteGuard>
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-xl font-semibold">Admin Dashboard (DEBUG MODE)</h1>
          </div>
        </div>
        <main className="flex-1 space-y-4 p-8 pt-6">
          {children}
        </main>
      </div>
    // </AdminRouteGuard>
  );
}
