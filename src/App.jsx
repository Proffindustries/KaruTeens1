import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import FeedPage from './pages/FeedPage.jsx';
import MarketplacePage from './pages/MarketplacePage.jsx';
import MarketplaceItemPage from './pages/MarketplaceItemPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import StatusPage from './pages/StatusPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import GroupsPage from './pages/GroupsPage.jsx';
import GroupDetailPage from './pages/GroupDetailPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import HookupPage from './pages/HookupPage.jsx';
import StudyRoomsPage from './pages/StudyRoomsPage.jsx';
import RecallPage from './pages/RecallPage.jsx';
import AiPage from './pages/AiPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import DonatePage from './pages/DonatePage.jsx';
import PremiumPage from './pages/PremiumPage.jsx';
import SearchResultsPage from './pages/SearchResultsPage.jsx';
import ExplorePage from './pages/ExplorePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AboutPage from './pages/AboutPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import LegalPage from './pages/LegalPage.jsx';
import VerificationPage from './pages/VerificationPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import GetAccountPage from './pages/GetAccountPage.jsx';
import PostDetailPage from './pages/PostDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import UploadProgress from './components/UploadProgress.jsx';
import GlobalBackButton from './components/GlobalBackButton.jsx';
import { WebsocketProvider } from './context/WebsocketContext.jsx';
import { AblyProvider } from './context/AblyContext.jsx';
import RevisionMaterialsPage from './pages/RevisionMaterialsPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <AblyProvider>
      <WebsocketProvider>
        <GlobalBackButton />
        <Routes>
          <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/explore" element={<MainLayout><ExplorePage /></MainLayout>} />
          <Route path="/about" element={<MainLayout><AboutPage /></MainLayout>} />
          <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
          <Route path="/legal" element={<MainLayout><LegalPage /></MainLayout>} />
          <Route path="/feed" element={<ProtectedRoute><MainLayout><FeedPage /></MainLayout></ProtectedRoute>} />
          <Route path="/post/:postId" element={<ProtectedRoute><MainLayout><PostDetailPage /></MainLayout></ProtectedRoute>} />
          <Route path="/marketplace" element={<ProtectedRoute><MainLayout><MarketplacePage /></MainLayout></ProtectedRoute>} />
          <Route path="/marketplace/item/:itemId" element={<ProtectedRoute><MainLayout><MarketplaceItemPage /></MainLayout></ProtectedRoute>} />
          <Route path="/profile/:username?" element={<ProtectedRoute><MainLayout><ProfilePage /></MainLayout></ProtectedRoute>} />
          <Route path="/status" element={<ProtectedRoute><MainLayout><StatusPage /></MainLayout></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MainLayout><MessagesPage /></MainLayout></ProtectedRoute>} />
          <Route path="/groups" element={<ProtectedRoute><MainLayout><GroupsPage /></MainLayout></ProtectedRoute>} />
          <Route path="/groups/:groupId" element={<ProtectedRoute><MainLayout><GroupDetailPage /></MainLayout></ProtectedRoute>} />
          <Route path="/events" element={<ProtectedRoute><MainLayout><EventsPage /></MainLayout></ProtectedRoute>} />
          <Route path="/events/:eventId" element={<ProtectedRoute><MainLayout><EventDetailPage /></MainLayout></ProtectedRoute>} />
          <Route path="/date" element={<ProtectedRoute><MainLayout><HookupPage /></MainLayout></ProtectedRoute>} />
          <Route path="/study-rooms" element={<ProtectedRoute><MainLayout><StudyRoomsPage /></MainLayout></ProtectedRoute>} />
          <Route path="/recall" element={<ProtectedRoute><MainLayout><RecallPage /></MainLayout></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<ProtectedRoute><AiPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><MainLayout><NotificationsPage /></MainLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><MainLayout><SettingsPage /></MainLayout></ProtectedRoute>} />
          <Route path="/donate" element={<ProtectedRoute><MainLayout><DonatePage /></MainLayout></ProtectedRoute>} />
          <Route path="/premium" element={<ProtectedRoute><MainLayout><PremiumPage /></MainLayout></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><MainLayout><SearchResultsPage /></MainLayout></ProtectedRoute>} />
          <Route path="/revision-materials" element={<ProtectedRoute><MainLayout><RevisionMaterialsPage /></MainLayout></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          {/* Auth Pages */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/get-account" element={<GetAccountPage />} />
          <Route path="*" element={<MainLayout><NotFoundPage /></MainLayout>} />
        </Routes>
        <UploadProgress />
      </WebsocketProvider>
    </AblyProvider>
  );
}

export default App;
