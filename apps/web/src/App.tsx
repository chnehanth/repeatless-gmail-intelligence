import { useQuery } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api, ApiClientError } from './lib/api';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Inbox } from './pages/Inbox';
import { ThreadView } from './pages/ThreadView';
import { Chat } from './pages/Chat';
import { News } from './pages/News';

export default function App() {
  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: ['me'],
    queryFn: api.me,
    retry: (count, err) => !(err instanceof ApiClientError && err.status === 401) && count < 1,
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-muted)',
        }}
      >
        Loading…
      </div>
    );
  }

  const unauthenticated = isError && error instanceof ApiClientError && error.status === 401;
  if (unauthenticated || !user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout user={user} />}>
        <Route path="/" element={<Navigate to="/inbox" replace />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/inbox/:threadId" element={<ThreadView />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/news" element={<News />} />
        <Route path="*" element={<Navigate to="/inbox" replace />} />
      </Route>
    </Routes>
  );
}
