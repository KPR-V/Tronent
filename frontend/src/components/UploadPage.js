import React from 'react';
import { useState } from 'react';
import axios from 'axios';
import { useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletActionButton } from '@tronweb3/tronwallet-adapter-react-ui';
import '@tronweb3/tronwallet-adapter-react-ui/style.css'; 

const samplieCID="QmYkHHbyJLZR13j7T16VmroSHvkLAf5uXbztFgJTkDKyEP";
const UploadPage = () => {
  const { address, connected, connect, signTransaction } = useWallet();
  const [message, setMessage] = useState('');
  const triggerSwapping = async () => {
    if (!connected) {
      setMessage('Please connect your wallet first.');
      return;
    }
    const trxAmount = 20; // Swap for 20 TRX
  
    try {
      const response = await fetch('http://localhost:4040/sunswap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address, // User's TronLink wallet address
          amount: trxAmount
        })
      });
  
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
  
      const data = await response.json(); // Attempt to parse the response as JSON
  
      if (data.status === 'success') {
        setMessage('Swap successful. Transaction hash: ' + data.conversionResult.transactionHash);
      } else {
        setMessage('Swap failed. Please try again.');
      }
    } catch (error) {
      console.error('Error during swap:', error);
      setMessage('Error occurred during swap.');
    }
  };
  


  
  return (
    <div>
      <div>UploadPage</div>

      <button onClick={checkBalance}>What is the balance?</button>
      <br></br>
      <button onClick={triggerTransaction}>Upload</button>
      <br></br>
      <button onClick={triggerSwapping}>swap other currency for trx</button>
      {message && <p>{message}</p>}
    </div>
  );
};

export default UploadPage;

