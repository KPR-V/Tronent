import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // For redirection
import Axios from 'axios';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletActionButton } from '@tronweb3/tronwallet-adapter-react-ui';
import '@tronweb3/tronwallet-adapter-react-ui/style.css'; // Ensure wallet styles are applied
import toast, { Toaster } from 'react-hot-toast'; // For notifications
import './MainPage.css'; // External CSS

// Function to send wallet address to the backend
const sendingAddress = async (address, navigate) => {
  try {
    const response = await Axios.post("http://localhost:4040/getAddress", { address });
    if (response.status === 200) {
      toast.success('Wallet address sent successfully!');
      // Redirect to profile page after successful submission
      setTimeout(() => navigate('/profile'), 1000); // Wait 1 second before redirecting
    } else {
      toast.error('Failed to send wallet address.');
    }
  } catch (error) {
    console.error('Error sending wallet address:', error);
    toast.error('Error sending wallet address to backend.');
  }
};

const MainPage = () => {
  const { address, connected, connect } = useWallet();
  const [isModalOpen, setModalOpen] = useState(false); // State for custom modal
  const [connectionStatus, setConnectionStatus] = useState(''); // Connection status
  const [loadingConnection, setLoadingConnection] = useState(false); // Show loading while connecting
  const navigate = useNavigate(); // Initialize the useNavigate hook for navigation

  // Function to open the modal
  const handleWalletClick = () => {
    setModalOpen(true);
  };

  // Function to close the modal
  const closeModal = () => {
    setModalOpen(false);
  };

  // Handle Wallet Connection Logic
  const handleWalletConnect = async () => {
    try {
      setLoadingConnection(true);
      await connect();

      if (connected) {
        setConnectionStatus('Wallet is connected!');
        toast.success('Wallet successfully connected!');
      } else {
        setConnectionStatus('Failed to connect. Please try again.');
        toast.error('Failed to connect wallet.');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setConnectionStatus('Error connecting wallet. Please try again.');
      toast.error('Error connecting wallet.');
    } finally {
      setLoadingConnection(false);
    }
  };

  // Monitor the wallet connection status and update in real time
  useEffect(() => {
    if (connected) {
      setConnectionStatus('Wallet connected: ' + address);
    }
  }, [connected, address]);

  // Ensure TronLink is installed and available
  const isTronLinkAvailable = () => {
    return window.tronWeb && window.tronWeb.defaultAddress.base58;
  };

  return (
    <div className="main-page">
      <Toaster /> {/* For showing notifications */}

      <div className="content">
        <button className="btn-connect-wallet" onClick={handleWalletClick}>
          Connect Wallet
        </button>
      </div>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-btn" onClick={closeModal}>&times;</span>
            <h2>Connect your TronLink Wallet</h2>

            {loadingConnection ? (
              <div className="loading-spinner">Connecting...</div>
            ) : (
              <>
                {!isTronLinkAvailable() && (
                  <div className="error-message">
                    TronLink Wallet not found. Please install it first.
                  </div>
                )}

                <div className="button-group">
                  <WalletActionButton className="wallet-action-button" onClick={handleWalletConnect} />
                  <button
                    className="btn-upload"
                    onClick={() => sendingAddress(address, navigate)} // Pass navigate function
                  >
                    Get Started!
                  </button>
                </div>

                {connectionStatus && (
                  <div className="modal-message">
                    {connectionStatus}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
