import { Navigate, Route, Routes } from 'react-router';
import Layout from './components/Layout';
import StoryListPage from './pages/StoryListPage';
import StoryReaderPage from './pages/StoryReaderPage';
import WordsPage from './pages/WordsPage';

// Route table: URL -> screen.
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<StoryListPage />} />
        <Route path="/story/:storyId" element={<StoryReaderPage />} />
        <Route path="/words" element={<WordsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}