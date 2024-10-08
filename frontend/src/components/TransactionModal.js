import React from "react";
import "./TransactionModal.css";

const TransactionModal = ({ isVisible, isSuccess, onClose }) => {
  if (!isVisible) return null;

  return (
    <div className="modal-overlay5">
      <div className="modal-content2 transaction-modal">
        {isSuccess ? (
          <div className="transaction-success">
            <svg
              className="animated-tick"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 52 52"
            >
              <path
                className="tick-circle"
                fill="none"
                d="M26 1C12.3 1 1 12.3 1 26s11.3 25 25 25 25-11.3 25-25S39.7 1 26 1z"
              />
              <path className="tick-path" fill="none" d="M14 27l8 8 16-16" />
            </svg>
            <h2>Transaction Successful!</h2>
            <p>Your file was uploaded successfully.</p>
          </div>
        ) : (
          <div className="transaction-failure">
            <h2>Insufficient TRX</h2>
            <p>You don't have enough TRX to upload the file.</p>
            <button
              onClick={() =>
                window.open("https://sunswap.com/#/home", "_blank")
              }
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
