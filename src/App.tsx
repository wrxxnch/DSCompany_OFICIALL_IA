import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import CreateSite from './pages/CreateSite';
import SiteList from './pages/SiteList';
import SettingsPage from './pages/SettingsPage';
import ApiDocs from './pages/ApiDocs';
import UsersPage from './pages/UsersPage';
import TemplatesPage from './pages/TemplatesPage';
import ProfilePage from './pages/ProfilePage';
import LeadGenerator from './pages/LeadGenerator';
import SearchHistory from './pages/SearchHistory';

function PublicApplication() {
  const { isLoading } = useAuth();
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">Carregando painel…</div>;
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="create" element={<CreateSite />} />
        <Route path="sites" element={<SiteList />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="api-docs" element={<ApiDocs />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="templates" element={<TemplatesPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="leads" element={<LeadGenerator />} />
        <Route path="leads/history" element={<SearchHistory />} />
        <Route path="login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PublicApplication />
      </BrowserRouter>
    </AuthProvider>
  );
}
