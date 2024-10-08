import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "./MainPage.css";

const sendingAddress = async (address, navigate, setIsAddressSent) => {
  try {
    const response = await Axios.post("http://localhost:4040/getAddress", {
      address,
    });
    if (response.status === 200) {
      toast.success("Wallet address sent successfully!");
      setIsAddressSent(true);
      setTimeout(() => navigate("/profile"), 1000);
    } else {
      toast.error("Failed to send wallet address.");
      setIsAddressSent(false);
    }
  } catch (error) {
    console.error("Error sending wallet address:", error);
    toast.error("Error sending wallet address to backend.");
    setIsAddressSent(false);
  }
};

const MainPage = () => {
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [loadingConnection, setLoadingConnection] = useState(false);
  const [isAddressSent, setIsAddressSent] = useState(false);
  const [isGetStartedDisabled, setGetStartedDisabled] = useState(true);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (
      window.tronWeb &&
      window.tronWeb.defaultAddress &&
      window.tronWeb.defaultAddress.base58
    ) {
      const walletAddress = window.tronWeb.defaultAddress.base58;
      setAddress(walletAddress);
      setIsConnected(true);
      setGetStartedDisabled(false);
      toast.success("Wallet already connected!");

      setTimeout(() => navigate("/profile"), 1000);
    }
  }, [navigate]);

  const handleWalletClick = () => {
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleWalletConnect = async () => {
    try {
      setLoadingConnection(true);

      if (window.tronLink) {
        await window.tronLink.request({
          method: "tron_requestAccounts",
        });

        let retries = 5;
        while (retries > 0) {
          if (
            window.tronWeb &&
            window.tronWeb.defaultAddress &&
            window.tronWeb.defaultAddress.base58
          ) {
            const walletAddress = window.tronWeb.defaultAddress.base58;
            setAddress(walletAddress);
            setIsConnected(true);
            setConnectionStatus("Wallet connected: " + walletAddress);
            toast.success("Wallet successfully connected!");
            setGetStartedDisabled(false);

            return;
          }

          retries--;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        throw new Error("Failed to retrieve wallet address. Please try again.");
      } else {
        toast.error("TronLink wallet not found. Please install it.");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setConnectionStatus("Error connecting wallet. Please try again.");

      setConnectionAttempts((prevAttempts) => prevAttempts + 1);

      if (connectionAttempts >= 1) {
        toast.error(
          "You have rejected the connection multiple times. Reloading the page..."
        );
        window.location.reload();
      } else {
        toast.error(error.message || "Error connecting wallet.");
        setIsConnected(false);
      }
    } finally {
      setLoadingConnection(false);
    }
  };

  const isTronLinkAvailable = () => {
    return window.tronWeb && window.tronWeb.defaultAddress.base58;
  };

  const handleGetStarted = () => {
    if (isConnected && address) {
      sendingAddress(address, navigate, setIsAddressSent);
    } else {
      toast.error("Please connect your wallet first.");
    }
  };

  return (
    <div className="main-page">
      <Toaster />
      <div className="content">
        <button className="btn-connect-wallet" onClick={handleWalletClick}>
          {isConnected ? "Wallet Connected" : "Connect Wallet"}
        </button>
      </div>
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <span className="close-btn" onClick={closeModal}>
              &times;
            </span>
            <h2>Connect your TronLink Wallet</h2>

            {loadingConnection ? (
              <div className="loading-spinner"></div>
            ) : (
              <>
                {!isTronLinkAvailable() && (
                  <div className="error-message">
                    TronLink Wallet not found. Please install it first.
                  </div>
                )}

                <div className="button-group">
                  <button
                    className="wallet-action-button"
                    onClick={handleWalletConnect}
                  >
                    Select Wallet
                  </button>

                  <button
                    className="btn-upload"
                    disabled={isGetStartedDisabled}
                    onClick={handleGetStarted}
                  >
                    Get Started!
                  </button>
                </div>

                {connectionStatus && (
                  <div className="modal-message">{connectionStatus}</div>
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
