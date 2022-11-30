import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { InternalLinks } from './util';
import HomePage from './views/HomePage';
import Home from './views/Home';

const Router: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="*" element={<Navigate to={InternalLinks.Home} replace={true} />} />
    </Routes>
  );
};

export default Router;
