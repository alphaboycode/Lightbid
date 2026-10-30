import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { RefundBanner } from './components/RefundBanner';
import { ExplorePage } from './pages/ExplorePage';
import { AuctionDetailPage } from './pages/AuctionDetailPage';
import { CreateAuctionPage } from './pages/CreateAuctionPage';
import { MintNFTPage } from './pages/MintNFTPage';
import { FaucetPage } from './pages/FaucetPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-dark-950 text-slate-100">
        <Navbar />
        <RefundBanner />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Routes>
            <Route path="/" element={<ExplorePage />} />
            <Route path="/auction/:id" element={<AuctionDetailPage />} />
            <Route path="/create" element={<CreateAuctionPage />} />
            <Route path="/mint" element={<MintNFTPage />} />
            <Route path="/faucet" element={<FaucetPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
