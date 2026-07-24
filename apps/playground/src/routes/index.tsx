import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem' }}>
      <h1>FilamentJS</h1>
      <p>Server-driven admin panel framework.</p>
      <a href="/admin/users">Open admin</a>
    </main>
  );
}
