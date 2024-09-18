const express = require("express")
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");
const crypto = require("crypto")
const cors = require('cors');




const app =express()
app.use(cors());
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));




const BTFS_API_URL = "http://localhost:5001/api/v1";

// multer part handleing the file uploading part
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const fn =
      crypto.randomBytes(12).toString("hex") + path.extname(file.originalname);
    cb(null, fn);
  },
});

const upload = multer({ storage: storage });


// function btfsUpload(){
//     console.log("upload")
    
//     // map of map , menu har user di har file de har version di cid pta lag jegi
// }

// app.get('/upload',(req,res)=>{
    
//     res.send( btfsUpload())
//     res.redirect('/getData')
//     // console.log(req)
// })

const fileMapping = {};


app.post('/getAddress',(req,res)=>{
    const walletAddress=req.body
    res.send("recieved wallet address")
    console.log(walletAddress)
})



app.post("/upload", upload.single("file"), async (req, res) => {
  console.log("Uploading file:", req.file);
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.join(__dirname, "./uploads", req.file.filename);

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath));

    const response = await axios.post(`${BTFS_API_URL}/add`, form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    const cid = response.data.Hash;
    const originalFilename = req.file.originalname;

    fileMapping[cid] = originalFilename;

    res.json({
      message: "File uploaded to BTFS",
      cid: cid,
      originalFilename: originalFilename,
    });
      // res.redirect("/getData");
      // ek cheez bheji ja sakdi hai redirect ya fir json
  } catch (error) {
    console.error("Error uploading to BTFS:", error);
    res.status(500).json({ error: "Failed to upload to BTFS" });
  }
});





app.get("/getfile", async (req, res) => {
  const { cid } = req.query;

  if (!cid) {
    return res.status(400).json({ error: "CID is required" });
  }

  const filename = fileMapping[cid];
  if (!filename) {
    return res.status(404).json({ error: "File not found for the given CID" });
  }

  const outputFilePath = path.join(__dirname, "./uploads", filename);

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
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

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
});





app.get('/wallet',(req,res)=>{
   getTronWeb();
   res.send("function called")
})
app.get('/getData',(req,res)=>{
    res.send("hiiee")
})

app.listen(3000)


