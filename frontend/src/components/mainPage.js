import React, { useState, useEffect } from 'react';
import Axios from 'axios';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletActionButton } from '@tronweb3/tronwallet-adapter-react-ui';
import '@tronweb3/tronwallet-adapter-react-ui/style.css'; // Ensure wallet styles are applied
import toast, { Toaster } from 'react-hot-toast'; // For notifications
import './MainPage.css'; // External CSS

// Backend upload function
async function upload() {
  try {
    const response = await Axios.get('http://localhost:4040/upload');
    if (response) {
      console.log(response.data);
      toast.success('File uploaded successfully.');
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    toast.error('Failed to upload to the backend.');
  }
}

// sends wallet address from frontend to backend (getStarted button)

const MainPage = () => {
  const { address, connected, connect, disconnect } = useWallet();
  const [isModalOpen, setModalOpen] = useState(false); // State for custom modal
  const [connectionStatus, setConnectionStatus] = useState(''); // Connection status
  const [loadingConnection, setLoadingConnection] = useState(false); // Show loading while connecting
  async function sendingAddress(address) {
    console.log(address)
    const sendAddress =await Axios.post("http://localhost:4040/getAddress",{address})
    console.log(sendAddress.data)
  }

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
      // Set loading while connecting
      setLoadingConnection(true);

      // Trigger the wallet connection popup
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
      // Stop loading regardless of success or failure
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
        {/* Button to trigger the wallet modal */}
        <button className="btn-connect-wallet" onClick={handleWalletClick}>
          Connect Wallet
        </button>
      </div>

      {/* Custom Modal Window */}
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
  <span className="close-btn" onClick={closeModal}>&times;</span>
  <h2>Connect your TronLink Wallet</h2>

  {/* Show spinner if connection is in progress */}
  {loadingConnection ? (
    <div className="loading-spinner">Connecting...</div>
  ) : (
    <>
      {/* Check if TronLink is available */}
      {!isTronLinkAvailable() && (
        <div className="error-message">
          TronLink Wallet not found. Please install it first.
        </div>
      )}

      {/* Button group with WalletActionButton and Backend button */}
      <div className="button-group">
        <WalletActionButton className="wallet-action-button" onClick={handleWalletConnect} />
        <button className="btn-upload" onClick={()=>{sendingAddress(`${address}`)}}>Get Started!</button>
      </div>

      {/* Display connection status */}
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