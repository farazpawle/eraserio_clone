export default function AdminPage() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>This is the admin page. If you can see this, the route is working.</p>
      <a href="/admin/settings" className="text-blue-600 underline">
        Go to Settings
      </a>
    </div>
  );
}
