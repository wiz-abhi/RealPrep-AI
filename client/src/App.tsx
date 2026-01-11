import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { StartupPage } from './pages/StartupPage';

import { ResumeUploadPage } from './pages/ResumeUploadPage';
import { ResumeAnalysisPage } from './pages/ResumeAnalysisPage';
import { ResumesPage } from './pages/ResumesPage';
import { InterviewSetupPage } from './pages/InterviewSetupPage';
import { InterviewPage } from './pages/InterviewPage';
import { ReportPage } from './pages/ReportPage';
import { HistoryPage } from './pages/HistoryPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { PricingPage } from './pages/PricingPage';
import { PreJoinPage } from './pages/PreJoinPage';

import { AuthProvider, useAuth } from './context/AuthContext';

// Inner app that checks backend status
const AppContent = () => {
  const { backendReady, setBackendReady } = useAuth();

  if (!backendReady) {
    return <StartupPage onReady={() => setBackendReady(true)} />;
  }

  return (
    <Router>
      <AppLayout>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/resumes" element={<ProtectedRoute><ResumesPage /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><ResumeUploadPage /></ProtectedRoute>} />
          <Route path="/analyze" element={<ProtectedRoute><ResumeAnalysisPage /></ProtectedRoute>} />
          <Route path="/interview-setup" element={<ProtectedRoute><InterviewSetupPage /></ProtectedRoute>} />
          <Route path="/pre-join" element={<ProtectedRoute><PreJoinPage /></ProtectedRoute>} />
          <Route path="/interview/:sessionId" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
          <Route path="/report/:sessionId" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        </Routes>
      </AppLayout>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
