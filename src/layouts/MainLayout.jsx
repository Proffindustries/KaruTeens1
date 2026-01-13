import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const MainLayout = ({ children }) => {
    return (
        <div className="app-container">
            <Navbar />
            <main className="main-content">{children || <Outlet />}</main>
        </div>
    );
};

export default MainLayout;
