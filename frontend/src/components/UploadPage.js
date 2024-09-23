import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletActionButton } from '@tronweb3/tronwallet-adapter-react-ui';
import '@tronweb3/tronwallet-adapter-react-ui/style.css'; // Ensure wallet styles are applied
import { useNavigate } from 'react-router-dom'; // For navigation between routes
const UploadPage = () => {
  const { address, connected, connect } = useWallet();
  const [message, setMessage] = useState('');
  const checkBalance = async () => {
    if (!address) {
      setMessage('Please connect your wallet first.');
      return;
    }

    const requiredBalance = 20; // Example required balance in TRX

    try {
      const response = await axios.post('http://localhost:4040/checkBalance', {
        requiredBalance
      });

      if (response.data.status === 'success') {
        setMessage('Sufficient balance');
      } else {
        setMessage('Insufficient balance');
      }
    } catch (error) {
      console.error('Error checking balance:', error);
      setMessage('Error checking balance');
    }
  };
  return (
    <div>
    <div>UploadPage</div>
    <button onClick={checkBalance}>What is the balance?</button>
      {message && <p>{message}</p>}
    </div>
  )
}

export default UploadPage