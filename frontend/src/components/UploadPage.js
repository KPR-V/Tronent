import React, { useState } from 'react';;
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
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFileChange = (event) => {
    setSelectedFiles(event.target.files);
  };

  const handleFileUpload = () => {
    if (selectedFiles.length > 0) {
      // Here you can upload the selected files to the server using Axios or any other method
      console.log("Uploading files:", selectedFiles);
      // Perform upload logic here
    } else {
      console.log("No files selected");
    }
  };

  return (
    <div> 
       <button onClick={checkBalance}>What is the balance?</button>
       {message && <p>{message}</p>}
    <div className="upload-page">
      <h2>Upload Files</h2>
      <input 
        type="file" 
        multiple 
        onChange={handleFileChange} 
        className="file-input"
      />
      <button onClick={handleFileUpload} className="upload-btn">Upload</button>

      {selectedFiles.length > 0 && (
        <div className="file-list">
          <h3>Selected Files:</h3>
          <ul>
            {Array.from(selectedFiles).map((file, index) => (
              <li key={index}>{file.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </div> 
  );
};

export default UploadPage;
