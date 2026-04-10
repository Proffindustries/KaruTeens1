import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import FeedPage from './pages/FeedPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
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
import { WebsocketProvider } from './context/WebsocketContext.jsx';
import { AblyProvider } from './context/AblyContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Dynamically imported components for code splitting
const ExplorePage = lazy(() => import('./pages/ExplorePage.jsx'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage.jsx'));
const MarketplaceItemPage = lazy(() => import('./pages/MarketplaceItemPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const StatusPage = lazy(() => import('./pages/StatusPage.jsx'));
const MessagesPage = lazy(() => import('./pages/MessagesPage.jsx'));
const StudyPlaylistsPage = lazy(() => import('./pages/StudyPlaylistsPage.jsx'));
const GroupsPage = lazy(() => import('./pages/GroupsPage.jsx'));
const GroupDetailPage = lazy(() => import('./pages/GroupDetailPage.jsx'));
const EventsPage = lazy(() => import('./pages/EventsPage.jsx'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage.jsx'));
const HookupPage = lazy(() => import('./pages/HookupPage.jsx'));
const StudyRoomsPage = lazy(() => import('./pages/StudyRoomsPage.jsx'));
const RecallPage = lazy(() => import('./pages/RecallPage.jsx'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage.jsx'));
const AiPage = lazy(() => import('./pages/AiPage.jsx'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const DonatePage = lazy(() => import('./pages/DonatePage.jsx'));
const PremiumPage = lazy(() => import('./pages/PremiumPage.jsx'));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage.jsx'));
const RevisionMaterialsPage = lazy(() => import('./pages/RevisionMaterialsPage.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));

// Previously missing pages — now connected
const ActivityFeedPage = lazy(() => import('./pages/ActivityFeedPage.jsx'));
const LiveStreamPage = lazy(() => import('./pages/LiveStreamPage.jsx'));
const LeaderboardsPage = lazy(() => import('./pages/LeaderboardsPage.jsx'));
const TimetablePage = lazy(() => import('./pages/TimetablePage.jsx'));
const ConfessionsPage = lazy(() => import('./pages/ConfessionsPage.jsx'));
const ReelsPage = lazy(() => import('./pages/ReelsPage.jsx'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage.jsx'));
const PagesPage = lazy(() => import('./pages/PagesPage.jsx'));
const PageDetailPage = lazy(() => import('./pages/PageDetailPage.jsx'));

function App() {
    console.log('App component rendering');
    return (
        <AblyProvider>
            <WebsocketProvider>
                <ErrorBoundary>
                <Suspense
                    fallback={
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '100vh',
                                fontSize: '1.2rem',
                            }}
                        >
                            Loading...
                        </div>
                    }
                >
                    <Routes>
                        <Route element={<AuthLayout />}>
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                            <Route path="/verification" element={<VerificationPage />} />
                            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                            <Route path="/get-account" element={<GetAccountPage />} />
                        </Route>

                        <Route path="/" element={<MainLayout />}>
                            <Route index element={<HomePage />} />
                            <Route path="about" element={<AboutPage />} />
                            <Route path="contact" element={<ContactPage />} />
                            <Route path="legal" element={<LegalPage />} />
                            <Route path="explore" element={<ExplorePage />} />

                            <Route path="feed" element={<FeedPage />} />
                            <Route path="post/:postId" element={<PostDetailPage />} />

                            <Route element={<ProtectedRoute />}>
                                <Route path="marketplace" element={<MarketplacePage />} />
                                <Route
                                    path="marketplace/item/:itemId"
                                    element={<MarketplaceItemPage />}
                                />
                                <Route path="profile/:username?" element={<ProfilePage />} />
                                <Route path="status" element={<StatusPage />} />
                                <Route path="messages" element={<MessagesPage />} />
                                <Route path="groups" element={<GroupsPage />} />
                                <Route path="groups/:groupId" element={<GroupDetailPage />} />
                                <Route path="events" element={<EventsPage />} />
                                <Route path="events/:eventId" element={<EventDetailPage />} />
                                <Route path="date" element={<HookupPage />} />
                                <Route path="study-rooms" element={<StudyRoomsPage />} />
                                <Route path="study-rooms/:roomId" element={<StudyRoomsPage />} />
                                <Route path="study-playlists" element={<StudyPlaylistsPage />} />
                                <Route path="recall" element={<RecallPage />} />
                                <Route path="notifications" element={<NotificationsPage />} />
                                <Route path="settings" element={<SettingsPage />} />
                                <Route path="donate" element={<DonatePage />} />
                                <Route path="premium" element={<PremiumPage />} />
                                <Route path="search" element={<SearchResultsPage />} />
                                <Route
                                    path="revision-materials"
                                    element={<RevisionMaterialsPage />}
                                />
                                <Route path="templates" element={<TemplatesPage />} />

                                {/* Previously unrouted pages — now connected */}
                                <Route path="activity" element={<ActivityFeedPage />} />
                                <Route path="live" element={<LiveStreamPage />} />
                                <Route path="leaderboards" element={<LeaderboardsPage />} />
                                <Route path="timetable" element={<TimetablePage />} />
                                <Route path="confessions" element={<ConfessionsPage />} />
                                <Route path="reels" element={<ReelsPage />} />
                                <Route path="onboarding" element={<OnboardingPage />} />
                                <Route path="pages" element={<PagesPage />} />
                                <Route path="p/:slug" element={<PageDetailPage />} />
                            </Route>

                            <Route element={<ProtectedRoute />}>
                                <Route path="ai-assistant" element={<AiPage />} />
                                <Route path="admin" element={<AdminDashboard />} />
                            </Route>

                            {/* Redirect alias routes so footer/nav links don't 404 */}
                            <Route path="privacy" element={<Navigate to="/legal" replace />} />
                            <Route path="terms" element={<Navigate to="/legal" replace />} />
                            <Route path="cookies" element={<Navigate to="/legal" replace />} />
                            <Route path="help" element={<Navigate to="/contact" replace />} />
                        </Route>

                        <Route
                            path="*"
                            element={
                                <MainLayout>
                                    <NotFoundPage />
                                </MainLayout>
                            }
                        />
                    </Routes>
                </Suspense>
                </ErrorBoundary>
                <UploadProgress />
            </WebsocketProvider>
        </AblyProvider>
    );
}

export default App;
