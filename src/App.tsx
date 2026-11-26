import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import CreateSite from './pages/CreateSite';
import SiteList from './pages/SiteList';
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/sites" replace />} />
        <Route path="create" element={<CreateSite />} />
        <Route path="sites" element={<SiteList />} />
            <Route path="*" element={<Navigate to="/sites" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
