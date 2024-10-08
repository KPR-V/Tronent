const express = require("express");
const fs = require("fs");
const path = require("path");
// const TronWeb = require('tronweb'); // Correct import
// console.log(TronWeb)
const FormData = require("form-data");
const axios = require("axios");
const cors = require('cors');
const computeFileHash = require('./utils/computeFileHash');
const upload = require('./utils/multerConfig');
const bodyParser = require('body-parser');
const TronWebModule = require('tronweb'); // Import the module
const TronWeb = TronWebModule.default.TronWeb; // Access the TronWeb class from the default property
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BTFS_API_URL = "http://10.61.116.115:5001/api/v1";

const fileVersions = {};
const fileMapping = {};
let usersWalletAddress=""
app.post('/getAddress', (req, res) => {
  const { address } = req.body;  // Extract the address from the body
  usersWalletAddress = address; 
  res.send("received wallet address");
  console.log(`${address}`);

});

app.post("/upload", upload.single("files"), async (req, res) => {
  console.log("Uploading file:", req.file);
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.join(__dirname, "./uploads", req.file.filename);
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    // Log FormData content to verify it's properly built
    console.log("FormData being sent:", form);

    const fileHash = await computeFileHash(filePath);
    
    // Perform the BTFS API request with error handling
    const response = await axios.post(`${BTFS_API_URL}/add`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 5000 // Set a timeout to prevent indefinite hanging
    });
    
    // Check the response from BTFS
    if (!response || !response.data || !response.data.Hash) {
      console.error('Invalid response from BTFS:', response.data);
      return res.status(500).json({ error: "Failed to upload to BTFS: Invalid response" });
    }

    const cid = response.data.Hash;
    const originalFilename = req.file.originalname;

    // Check if this is the first version of the file
    if (!fileVersions[cid]) {
      fileVersions[cid] = {
        currentVersion: 1,
        versions: [{ version: 1, cid: cid, hash: fileHash }],
      };
    }

    // Add the original filename to the fileMapping
    fileMapping[cid] = originalFilename;

    // Pin the file in BTFS
    await axios.post(`${BTFS_API_URL}/pin/add`, null, {
      params: { arg: cid },
      timeout: 5000 // Adding timeout for the pinning request
    });

    // Respond with success and file details
    res.json({
      message: "File uploaded to BTFS and pinned",
      cid: cid,
      version: fileVersions[cid].currentVersion,
      originalFilename: originalFilename,
    });

  } catch (error) {
    // Improved error logging to capture more details
    if (error.response) {
      console.error('BTFS API Error Response:', error.response.data);
    } else if (error.request) {
      console.error('BTFS API No Response:', error.request);
    } else {
      console.error('BTFS API Request Error:', error.message);
    }
    
    res.status(500).json({ error: "Failed to upload to BTFS" });
  }
});


app.get("/getfile", async (req, res) => {
  const { cid, version } = req.query;

  if (!cid) {
    return res.status(400).json({ error: "CID is required" });
  }

  const fileData = fileVersions[cid];
  const originalFilename = fileMapping[cid];

  if (!fileData || !originalFilename) {
    return res.status(404).json({ error: "File not found for the given CID" });
  }

  let requestedCid = cid;
  if (version) {
    const versionData = fileData.versions.find(
      (v) => v.version === parseInt(version)
    );
    if (!versionData) {
      return res.status(404).json({ error: `Version ${version} not found` });
    }
    requestedCid = versionData.cid;
  }

  return getFileByCID(requestedCid, originalFilename, res);
});

async function getFileByCID(cid, originalFilename, res) {
  const outputFilePath = path.join(__dirname, "./uploads", originalFilename);

  try {
    const response = await axios({
      method: "post",
      url: `${BTFS_API_URL}/cat`,
      params: { arg: cid },
      responseType: "stream",
    });

    const writer = fs.createWriteStream(outputFilePath, { encoding: "binary" });
    response.data.pipe(writer);

    writer.on("finish", async () => {
      console.log(`File downloaded and saved to ${outputFilePath}`);

      const { default: mime } = await import("mime");
      const mimeType = mime.getType(outputFilePath);

      res.setHeader("Content-Type", mimeType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${originalFilename}"`
      );

      res.sendFile(outputFilePath);
    });

    writer.on("error", (error) => {
      console.error("Error writing the file:", error);
      res.status(500).send("Error writing the file");
    });
  } catch (error) {
    console.error("Error downloading the file from BTFS:", error);
    res.status(500).send("Error downloading the file from BTFS");
  }
}

app.put("/updatefile", upload.single("file"), async (req, res) => {
  const { cid } = req.query;

  if (!cid || !req.file) {
    return res.status(400).json({ error: "CID and new file are required" });
  }

  try {
    const filePath = path.join(__dirname, "./uploads", req.file.filename);
    const newFileHash = await computeFileHash(filePath);
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const fileData = fileVersions[cid];
    if (!fileData) {
      return res.status(404).json({ error: `No previous version found for CID ${cid}` });
    }

    const lastVersion = fileData.versions[fileData.versions.length - 1];
    if (lastVersion.hash === newFileHash) {
      return res.json({
        message: "No changes detected; version not updated",
        currentVersion: fileData.currentVersion,
        cid: lastVersion.cid,
        originalFilename: fileMapping[cid],
      });
    }

    const response = await axios.post(`${BTFS_API_URL}/add`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    const newCid = response.data.Hash;
    const originalFilename = fileMapping[cid];

    const newVersion = fileData.currentVersion + 1;
    fileData.currentVersion = newVersion;
    fileData.versions.push({
      version: newVersion,
      cid: newCid,
      hash: newFileHash,
    });

    await axios.post(`${BTFS_API_URL}/pin/add`, null, {
      params: { arg: newCid },
    });

    fileMapping[newCid] = originalFilename;

    res.json({
      message: "New version uploaded and pinned",
      newCid: newCid,
      version: newVersion,
      originalFilename: originalFilename,
    });
  } catch (error) {
    console.error("Error updating the file in BTFS:", error);
    res.status(500).json({ error: "Failed to update the file in BTFS" });
  }
});

app.get("/versions", (req, res) => {
  const { cid } = req.query;

  if (!cid) {
    return res.status(400).json({ error: "CID is required" });
  }

  const fileData = fileVersions[cid];
  if (!fileData) {
    return res.status(404).json({ error: `No version history found for CID ${cid}` });
  }

  res.json(fileData);
});

app.get('/wallet', (req, res) => {
  getTronWeb();
  res.send("function called");
});

app.get('/getData', (req, res) => {
  res.send("hiiee");
});

async function checkBalanceUsingAPI(requiredBalance) {
  try {
    const response = await axios.post('https://nile.trongrid.io/wallet/getaccount', {
      address: usersWalletAddress,
      visible: true
    });

    const balanceInSun = response.data.balance || 0;  // Balance in SUN (smallest unit of TRX)
    
    // Convert SUN to TRX (1 TRX = 1,000,000 SUN)
    const balanceInTrx = balanceInSun / 1e6;

    console.log(`Balance: ${balanceInTrx} TRX , Address is ${usersWalletAddress}, required balance is ${requiredBalance}`);

    // Check if the balance is sufficient
    if (balanceInTrx >= requiredBalance) {
      return true;  // Sufficient balance
    } else {
      return false;  // Insufficient balance
    }
  } catch (error) {
    console.error('Error fetching balance from API:', error);
    throw error;
  }
}


const fullNode = 'https://nile.trongrid.io';
const solidityNode = 'https://nile.trongrid.io';
const eventServer = 'https://nile.trongrid.io';

const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

app.post('/sendExcessTrx', async (req, res) => {
  const { fromAddress, amount } = req.body;
  const recipientAddress = 'TAPsixpGU5gwhYd4kftVPGRYGmN16zt7ac'; // Address to send excess TRX

  try {
    // Sending excess TRX to the designated wallet address
    const transaction = await tronWeb.trx.sendTransaction(recipientAddress, amount, fromAddress);
    res.json({ status: 'success', transaction });
  } catch (error) {
    console.error('Error sending excess TRX:', error);
    res.status(500).json({ error: 'Error sending TRX' });
  }
});

// Example Express route to handle the balance check using API
app.post('/checkBalance', async (req, res) => {
  const { address, requiredBalance } = req.body;
  // res.send(usersWalletAddress)
  try {
    const hasEnoughBalance = await checkBalanceUsingAPI(requiredBalance);
    if (hasEnoughBalance) {
      res.send({ status: 'success', message: 'Sufficient balance' });
    } else {
      res.send({ status: 'error', message: 'Insufficient balance' });
    }
  } catch (error) {
    res.status(500).send({ status: 'error', message: 'Error checking balance via API' });
  }
});
const USDTtokenAddress = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf';
const factoryContractAddress = 'TUTGcsGDRScK1gsDPMELV2QZxeESWb1Gac';
const swapRouterContractAddress = 'TFkswj6rUfK3cQtFGzungCkNXxD2UCpEVD';
const NonFungibleManagerAddress = 'TPQzqHbCzQfoVdAV6bLwGDos8Lk2UjXz2R';


async function convertToTrx(usersWalletAddress, amount) {

    
    let factoryContract = await tronWeb.contract().at(factoryContractAddress);
    let liquidityPoolAddress = await factoryContract.methods.getPool(
      '0x0000000000000000000000000000000000000000', // Address for TRX
      USDTtokenAddress, 
      100 
    ).call();

    console.log('Liquidity Pool Address:', liquidityPoolAddress);

    const trxAmount = 20; // Target amount of TRX
    let contract = await tronWeb.getContract(liquidityPoolAddress);
    const usdtAmount = trxAmount / exchangeRate; // Calculate how much USDT is needed

    // Prepare the transaction to perform the swap using the SwapRouter contract
    const swapRouterContract = await tronWeb.contract().at(swapRouterContractAddress);

    const params = [
      {
        type: 'address',
        value: tronWeb.address.toHex(USDTtokenAddress) // tokenIn (USDT)
      },
      {
        type: 'address',
        value: '0x0000000000000000000000000000000000000000' // tokenOut (TRX)
      },
      {
        type: 'uint24',
        value: 100 // fee
      },
      {
        type: 'address',
        value: tronWeb.address.toHex(usersWalletAddress) // recipient
      },
      {type: 'uint256',
        value: usdtAmount.toString() // amountIn (USDT)
        },
      { type: 'uint256',
        value: trxAmount.toString() // amountOutMinimum (TRX)
      },
      {
        type: 'uint256',
        value: (Math.floor(Date.now() / 1000) + 60 * 10).toString() // deadline (10 mins from now)
      },
      {
        type: 'uint160',
        value: '0' // sqrtPriceLimitX96 (no limit)
      }
    ];

    const tradeResponse = await tronWeb.transactionBuilder.triggerSmartContract(
      swapRouterContractAddress, // SwapRouter contract address
      'exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))', // Method to call
      {
        feeLimit: 1000000000, // Set a reasonable fee limit (1,000 TRX in sun units)
        callValue: 0, // No TRX is sent with the call
        owner_address: tronWeb.address.toHex(usersWalletAddress) // Owner address (sender's address)
      },
      params,
      tronWeb.address.toHex(usersWalletAddress) // Owner address (sender's address)
    );

    const signedTxn = await tronWeb.trx.sign(tradeResponse.transaction);
    const broadcastResult = await tronWeb.trx.sendRawTransaction(signedTxn);

    return { success: true, transactionHash: broadcastResult.txid };
  
}
async function trial() {
  const myaddress = "TAPsixpGU5gwhYd4kftVPGRYGmN16zt7ac";
  const path = [
    '0xe518c608a37e2a262050e10be0c9d03c7a0877f3000bb843c42f702b0a11565c46e34022aab677d7bd8ae3', // USDT contract address
    '' // Leave empty for native TRX
];
  const deadline = Math.floor(Date.now() / 1000) + 600 ;
  console.log(deadline);
  const contract = await tronWeb
  .contract()
  .at('TFkswj6rUfK3cQtFGzungCkNXxD2UCpEVD');
  await contract.methods.exactInput([path, userAddress, deadline]).send();
}
app.post('/sunswap', async (req, res) => {
  try {
    const { address, amount } = req.body;
    console.log('Received request:', address, amount); // Log to ensure data is received correctly

    const conversionResult = await trial();
    res.json({ status: 'success', conversionResult });
  } catch (error) {
    console.error('Error converting to TRX:', error);
    res.status(500).json({ status: 'error', message: 'Error converting to TRX' });
  }
});

app.listen(4040, () => {
  console.log("Server is running on port 4040");
});