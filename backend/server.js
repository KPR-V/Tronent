const express = require("express");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");
const cors = require("cors");
const computeFileHash = require("./utils/computeFileHash");
const upload = require("./utils/multerConfig");
const bodyParser = require("body-parser");
const TronWebModule = require("tronweb");
const TronWeb = TronWebModule.default.TronWeb;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BTFS_API_URL = "http://10.81.12.199:5001/api/v1";

const fileVersions = {};
const fileMapping = {};
let usersWalletAddress = "";
app.post("/getAddress", (req, res) => {
  const { address } = req.body;
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

    const fileHash = await computeFileHash(filePath);

    const response = await axios.post(`${BTFS_API_URL}/add`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 5000,
    });

    if (!response || !response.data || !response.data.Hash) {
      console.error("Invalid response from BTFS:", response.data);
      return res
        .status(500)
        .json({ error: "Failed to upload to BTFS: Invalid response" });
    }

    const cid = response.data.Hash;
    const originalFilename = req.file.originalname;

    if (!fileVersions[cid]) {
      fileVersions[cid] = {
        currentVersion: 1,
        versions: [{ version: 1, cid: cid, hash: fileHash }],
      };
    }

    fileMapping[cid] = originalFilename;

    await axios.post(`${BTFS_API_URL}/pin/add`, null, {
      params: { arg: cid },
      timeout: 5000,
    });

    res.json({
      message: "File uploaded to BTFS and pinned",
      cid: cid,
      version: fileVersions[cid].currentVersion,
      originalFilename: originalFilename,
    });
  } catch (error) {
    if (error.response) {
      console.error("BTFS API Error Response:", error.response.data);
    } else if (error.request) {
      console.error("BTFS API No Response:", error.request);
    } else {
      console.error("BTFS API Request Error:", error.message);
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
      return res
        .status(404)
        .json({ error: `No previous version found for CID ${cid}` });
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
    return res
      .status(404)
      .json({ error: `No version history found for CID ${cid}` });
  }

  res.json(fileData);
});

app.get("/wallet", (req, res) => {
  getTronWeb();
  res.send("function called");
});

app.get("/getData", (req, res) => {
  res.send("hiiee");
});

async function checkBalanceUsingAPI(requiredBalance) {
  try {
    const response = await axios.post(
      "https://nile.trongrid.io/wallet/getaccount",
      {
        address: usersWalletAddress,
        visible: true,
      }
    );

    const balanceInSun = response.data.balance || 0;

    const balanceInTrx = balanceInSun / 1e6;

    console.log(
      `Balance: ${balanceInTrx} TRX , Address is ${usersWalletAddress}, required balance is ${requiredBalance}`
    );

    if (balanceInTrx >= requiredBalance) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error fetching balance from API:", error);
    throw error;
  }
}

const fullNode = "https://nile.trongrid.io";
const solidityNode = "https://nile.trongrid.io";
const eventServer = "https://nile.trongrid.io";

const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

app.post("/sendExcessTrx", async (req, res) => {
  const { fromAddress, amount } = req.body;
  const recipientAddress = "TAPsixpGU5gwhYd4kftVPGRYGmN16zt7ac";

  try {
    const transaction = await tronWeb.trx.sendTransaction(
      recipientAddress,
      amount,
      fromAddress
    );
    res.json({ status: "success", transaction });
  } catch (error) {
    console.error("Error sending excess TRX:", error);
    res.status(500).json({ error: "Error sending TRX" });
  }
});

app.post("/checkBalance", async (req, res) => {
  const { address, requiredBalance } = req.body;

  try {
    const hasEnoughBalance = await checkBalanceUsingAPI(requiredBalance);
    if (hasEnoughBalance) {
      res.send({ status: "success", message: "Sufficient balance" });
    } else {
      res.send({ status: "error", message: "Insufficient balance" });
    }
  } catch (error) {
    res
      .status(500)
      .send({ status: "error", message: "Error checking balance via API" });
  }
});
const USDTtokenAddress = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
const factoryContractAddress = "TUTGcsGDRScK1gsDPMELV2QZxeESWb1Gac";
const swapRouterContractAddress = "TFkswj6rUfK3cQtFGzungCkNXxD2UCpEVD";
const NonFungibleManagerAddress = "TPQzqHbCzQfoVdAV6bLwGDos8Lk2UjXz2R";

async function convertToTrx(usersWalletAddress, amount) {
  let factoryContract = await tronWeb.contract().at(factoryContractAddress);
  let liquidityPoolAddress = await factoryContract.methods
    .getPool(
      "0x0000000000000000000000000000000000000000",
      USDTtokenAddress,
      100
    )
    .call();

  console.log("Liquidity Pool Address:", liquidityPoolAddress);

  const trxAmount = 20;
  let contract = await tronWeb.getContract(liquidityPoolAddress);
  const usdtAmount = trxAmount / exchangeRate;

  const swapRouterContract = await tronWeb
    .contract()
    .at(swapRouterContractAddress);

  const params = [
    {
      type: "address",
      value: tronWeb.address.toHex(USDTtokenAddress),
    },
    {
      type: "address",
      value: "0x0000000000000000000000000000000000000000",
    },
    {
      type: "uint24",
      value: 100, // fee
    },
    {
      type: "address",
      value: tronWeb.address.toHex(usersWalletAddress),
    },
    { type: "uint256", value: usdtAmount.toString() },
    { type: "uint256", value: trxAmount.toString() },
    {
      type: "uint256",
      value: (Math.floor(Date.now() / 1000) + 60 * 10).toString(),
    },
    {
      type: "uint160",
      value: "0",
    },
  ];

  const tradeResponse = await tronWeb.transactionBuilder.triggerSmartContract(
    swapRouterContractAddress,
    "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))",
    {
      feeLimit: 1000000000,
      callValue: 0,
      owner_address: tronWeb.address.toHex(usersWalletAddress),
    },
    params,
    tronWeb.address.toHex(usersWalletAddress)
  );

  const signedTxn = await tronWeb.trx.sign(tradeResponse.transaction);
  const broadcastResult = await tronWeb.trx.sendRawTransaction(signedTxn);

  return { success: true, transactionHash: broadcastResult.txid };
}
async function trial() {
  const myaddress = "TAPsixpGU5gwhYd4kftVPGRYGmN16zt7ac";
  const path = [
    "0xe518c608a37e2a262050e10be0c9d03c7a0877f3000bb843c42f702b0a11565c46e34022aab677d7bd8ae3",
    "",
  ];
  const deadline = Math.floor(Date.now() / 1000) + 600;
  console.log(deadline);
  const contract = await tronWeb
    .contract()
    .at("TFkswj6rUfK3cQtFGzungCkNXxD2UCpEVD");
  await contract.methods.exactInput([path, userAddress, deadline]).send();
}
app.post("/sunswap", async (req, res) => {
  try {
    const { address, amount } = req.body;
    console.log("Received request:", address, amount);

    const conversionResult = await trial();
    res.json({ status: "success", conversionResult });
  } catch (error) {
    console.error("Error converting to TRX:", error);
    res
      .status(500)
      .json({ status: "error", message: "Error converting to TRX" });
  }
});

app.listen(4040, () => {
  console.log("Server is running on port 4040");
});
