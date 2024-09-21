import React from 'react';
import { WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletModalProvider } from '@tronweb3/tronwallet-adapter-react-ui';
import MainPage from './components/mainPage'; // Import your MainPage
import '@tronweb3/tronwallet-adapter-react-ui/style.css'; // Import necessary wallet styles

function App() {
  return (
    <WalletProvider>
      <WalletModalProvider>
        <MainPage />
      </WalletModalProvider>
    </WalletProvider>
  );
}

export default App;
