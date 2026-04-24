import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const LoadingFallback = () => (
    <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}
    >
        <div className="spinner"></div>
        <span style={{ marginLeft: '10px', color: '#687b8f' }}>Loading...</span>
    </div>
);

const MainLayout = ({ children }) => {
    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content">
                <Suspense fallback={<LoadingFallback />}>{children || <Outlet />}</Suspense>
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;
