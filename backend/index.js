const express =require("express")
const cors = require('cors');
const app =express()
app.use(cors());
app.use(express.json());  
function btfsUpload(){
    console.log("upload")
    
    // map of map , menu har user di har file de har version di cid pta lag jegi
}
app.post('/getAddress',(req,res)=>{
    const walletAddress=req.body
    res.send("recieved wallet address")
    console.log(walletAddress)
})
app.get('/upload',(req,res)=>{
    
    res.send( btfsUpload())
    res.redirect('/getData')
    // console.log(req)
})
app.get('/wallet',(req,res)=>{
   getTronWeb();
   res.send("function called")
})
app.get('/getData',(req,res)=>{
    res.send("hiiee")
})

app.listen(5001)


