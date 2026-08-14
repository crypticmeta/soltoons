import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { InternalLinks } from './util';
import Home from './views/Home';
import Admin from './views/Admin'
const Router: React.FC = () => {
  const adminEnabled =
    process.env.REACT_APP_ENABLE_ONCHAIN === 'true' && process.env.REACT_APP_ENABLE_ADMIN === 'true';

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {adminEnabled ? <Route path="/admin" element={<Admin />} /> : null}

      <Route path="*" element={<Navigate to={InternalLinks.Home} replace={true} />} />
    </Routes>
  );
};

export default Router;
