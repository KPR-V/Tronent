const TronWebModule = require('tronweb'); // Import the module
const TronWeb = TronWebModule.default.TronWeb; // Access the TronWeb class from the default property
const fullNode = "https://nile.trongrid.io";
const solidityNode = "https://nile.trongrid.io";
const eventServer = "https://nile.trongrid.io";

const USDTtokenAddress = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
const WtrxTokenAddress='TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR '
const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);


// async function trial() {
//     const myaddress = "TAPsixpGU5gwhYd4kftVPGRYGmN16zt7ac";
//     const path = [
//       '0xe518c608a37e2a262050e10be0c9d03c7a0877f3000bb843c42f702b0a11565c46e34022aab677d7bd8ae3', // USDT contract address
//       '' // Leave empty for native TRX
//   ];
//     const deadline = Math.floor(Date.now() / 1000) + 600 ;
//     console.log(deadline);
//     const contract = await tronWeb
//     .contract()
//     .at('TFkswj6rUfK3cQtFGzungCkNXxD2UCpEVD');
//     await contract.methods.exactInput([path, userAddress, deadline]).send();
// }

// async function trial2() {
//   let contract = await tronWeb.contract().at('TQAvWQpT9H916GckwWDJNhYZvQMkuRL7PN');
//   const deadline = Math.floor(Date.now() / 1000) + 600 ;
//   console.log(deadline);
//   await router.swapExactInput(
//     ['TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf','TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR'],// first address is usdt and second is wtrx
//     ['v3'],
//     [2],
//     [100, 0],
//     ['100000000000000000', '0', 'TAPsixpGU5gwhYd4kftVPGRYGmN16zt7ac', deadline]
//   ).send({ feeLimit: 10000 * 1e6, shouldPollResponse: true });
// }
// trial2();
function nig(){
  const deadline = Math.floor(Date.now() / 1000) + 600;
  console.log("Deadline:", deadline);
}

nig();
async function trial2() {
  try {
    // Get contract instance of the router
    const router = await tronWeb.contract().at('TQAvWQpT9H916GckwWDJNhYZvQMkuRL7PN');

    // Set deadline 10 minutes (600 seconds) from now
    const deadline = Math.floor(Date.now() / 1000) + 600;
    console.log("Deadline:", deadline);

    // Call swapExactInput with correct parameters
    await router.methods.swapExactInput(
      ['TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf', 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR'], // Path (USDT -> WTRX)
      ['v3'], // Pool version
      [2], // Adjacent pool length
      [100, 10], // Fee rates
      ['100000000000000000', '0', 'TAPsixpGU5gwhYd4kftVPGRYGmN16zt7ac', deadline] // AmountIn, MinOut, Recipient, Deadline
    ).send({
      feeLimit: 10000 * 1e6, // Fee limit in TRX (10000 TRX)
      shouldPollResponse: true // Poll response for confirmation
    });

    console.log("Swap executed successfully");
  } catch (error) {
    console.error("Error executing swap:", error);
  }
}

trial2();
