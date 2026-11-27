import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import CreateSite from './pages/CreateSite';
import SiteList from './pages/SiteList';
import Dashboard from './pages/Dashboard';
import LeadGenerator from './pages/LeadGenerator';
import SearchHistory from './pages/SearchHistory';
import TemplatesPage from './pages/TemplatesPage';
import SettingsPage from './pages/SettingsPage';
import ApiDocs from './pages/ApiDocs';
import UsersPage from './pages/UsersPage';
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="create" element={<CreateSite />} />
            <Route path="leads" element={<LeadGenerator />} />
            <Route path="leads/history" element={<SearchHistory />} />
            <Route path="sites" element={<SiteList />} />
            <Route path="templates" element={<TemplatesPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="api-docs" element={<ApiDocs />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="*" element={<Navigate to="/sites" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
