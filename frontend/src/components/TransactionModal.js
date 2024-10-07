import React from 'react';
import './TransactionModal.css'; // You'll need to create this for custom styles

const TransactionModal = ({ isVisible, isSuccess, onClose }) => {
  if (!isVisible) return null; // If not visible, don't render anything

  return (
    <div className="modal-overlay">
      <div className="modal-content2 transaction-modal">
        {isSuccess ? (
          <div className="transaction-success">
            <div className="animated-tick">✔️</div> {/* You can style this for the animated tick */}
            <h2>Transaction Successful!</h2>
            <p>Your file was uploaded successfully.</p>
          </div>
        ) : (
          <div className="transaction-failure">
            <h2>Insufficient TRX</h2>
            <p>You don't have enough TRX to upload the file.</p>
            <button 
              onClick={() => window.open('https://sunswap.com/#/home', '_blank')}
              className="swap-crypto-btn"
            >
              Swap Crypto for TRX
            </button>
          </div>
        )}
        <button onClick={onClose} className="close-btn1">
          Close
        </button>
      </div>
    </div>
  );
};

export default TransactionModal;
