import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { InternalLinks } from './util';
import Home from './views/Home';
import Admin from './views/Admin'
const Router: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/admin" element={<Admin />} />

      <Route path="*" element={<Navigate to={InternalLinks.Home} replace={true} />} />
    </Routes>
  );
};

export default Router;
