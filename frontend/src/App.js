import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { WalletProvider } from "@tronweb3/tronwallet-adapter-react-hooks";
import { WalletModalProvider } from "@tronweb3/tronwallet-adapter-react-ui";
import MainPage from "./components/mainPage";
import ProfilePage from "./components/ProfilePage";
import { Dataprovider } from "./datacontext";
import "@tronweb3/tronwallet-adapter-react-ui/style.css";

function App() {
  return (
    <Dataprovider>
      <WalletProvider>
        <WalletModalProvider>
          <Router>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </Router>
        </WalletModalProvider>
      </WalletProvider>
    </Dataprovider>
  );
}

export default App;
