import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './context/Store';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Brokers } from './pages/Brokers';
import { NewTrade } from './pages/NewTrade';
import { TradeHistory } from './pages/TradeHistory';
import { Analysis } from './pages/Analysis';

export default function App() {
  return (
    <StoreProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/brokers" element={<Brokers />} />
            <Route path="/new-trade" element={<NewTrade />} />
            <Route path="/history" element={<TradeHistory />} />
            <Route path="/analysis" element={<Analysis />} />
          </Routes>
        </Layout>
      </Router>
    </StoreProvider>
  );
}