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
  
  const checkBalance = async () => {
    if (!address) {
      setMessage('Please connect your wallet first.');
      return;
    }

    const requiredBalance = 20;

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


  const triggerTransaction = async () => {
    if (!connected) {
      setMessage('Please connect your wallet first.');
      return;
    }
  
    try {
      const contractAddress = 'TGXJVSgz4KyAKKQeZ1Gy2EmMYSueKWLGYp';
      const contract = await window.tronWeb.contract().at(contractAddress);
  
      // Sending 20 TRX to the contract for the operation
      const trxAmount = 20; // Amount the user is paying
      const callValue = window.tronWeb.toSun(20); // Convert to Sun (smallest unit of TRX)
  
      const transaction = await contract.uploadfile(samplieCID).send({
        feeLimit: 100000000,
        callValue: callValue // Using the entire 20 TRX for the contract
      });

      console.log('Transaction:', transaction);
      // Calculate excess TRX to be sent (assuming 20 TRX was sent and `callValue` was used)
      const excessAmount = window.tronWeb.toSun(trxAmount) - callValue;
  
      // Send excess to the backend to forward to the recipient wallet
      if (excessAmount > 0) {
        await axios.post('http://localhost:4040/sendExcessTrx', {
          fromAddress: address, // User's wallet address
          amount: excessAmount // Excess amount in Sun
        });
      }
  
      setMessage('Transaction successful');
    } catch (error) {
      console.error('Error triggering transaction:', error);
      setMessage('Transaction failed');
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

