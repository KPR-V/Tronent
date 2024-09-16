import { useWallet, WalletProvider } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletModalProvider, WalletActionButton } from '@tronweb3/tronwallet-adapter-react-ui';
import React from 'react';
import MainPage from './components/mainPage';
import Axios from 'axios'

export default function App() {
  return (
    <WalletProvider>
      <WalletModalProvider>
        <ConnectComponent />
      </WalletModalProvider>
      <MainPage>

      </MainPage>
    </WalletProvider>
  );
}
async function sendingAddress(address) {
  console.log(address)
  const sendAddress =await Axios.post("http://localhost:5001/getAddress",{address})

  console.log(sendAddress.data)
}
function ConnectComponent() {
  const { address, connected, wallet } = useWallet();
  if(address){
    // ReactRouter
    // learn to redirect
    sendingAddress(address);
  }
  return <WalletActionButton></WalletActionButton>;
}