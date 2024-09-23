const express = require("express");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");
const cors = require('cors');
const computeFileHash = require('./utils/computeFileHash');
const upload = require('./utils/multerConfig');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const BTFS_API_URL = "http://localhost:5001/api/v1";

const fileVersions = {};
const fileMapping = {};
let usersWalletAddress=""
app.post('/getAddress', (req, res) => {
  const { address } = req.body;  // Extract the address from the body
  usersWalletAddress = address; 
  res.send("received wallet address");
  console.log(`${address}`);
});

app.post("/upload", upload.single("file"), async (req, res) => {
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
    });
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
    });

    res.json({
      message: "File uploaded to BTFS and pinned",
      cid: cid,
      version: fileVersions[cid].currentVersion,
      originalFilename: originalFilename,
    });

  } catch (error) {
    console.error("Error uploading to BTFS:", error);
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
    const response = await axios.post('https://api.shasta.trongrid.io/wallet/getaccount', {
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
app.listen(4040, () => {
  console.log("Server is running on port 3000");
});