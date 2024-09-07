import express from "express";
import path from "path";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
dotenv.config();
mongoose.connect("mongodb://localhost:27017/todo").then(()=>{
    console.log("Connected to database");
}).catch((err)=>{
    console.log(err,"error occured");
});
const contactSchema=new mongoose.Schema({
    name:String,
    email:String,
    message:String,
});
const userSchema=new mongoose.Schema({
    name:String,
    email:String,
    password:String,
});
const contactInfo=mongoose.model("contactInfo",contactSchema);
const userInfo=mongoose.model("userInfo",userSchema);
const app=express();
const port=4000;
app.use(express.json());
app.use(express.static(path.join(path.resolve(), "public")));
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.set('view engine','ejs');
app.set('views',path.join(path.resolve(), 'templates'));

const authenticate=(req,res,next)=>{
    const token = req.cookies['login'];
    if (!token) {
        // console.log("not present")
        return res.redirect('/login');
    }
    else{
        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            // console.log(process.env.JWT_SECRET);
            if (err) {  
                return res.redirect('/login');
            }
            const user = await userInfo.findById(decoded._id);
            if(!user){
                return res.redirect("/login");
            }
            req.user=user;
            next();
        });
    }
};
app.get("/",authenticate,(req,res)=>{
    // console.log(req.user.name);
    res.render("index",{username:req.user.name, email:req.user.email});
});
app.get("/contact",authenticate,(req,res)=>{
    res.render("contact",{username:req.user.name, email:req.user.email});
});
app.get("/login",(req,res)=>{
    res.render("login");
});
app.get("/signup",(req,res)=>{
    res.render("signup");
});
app.get("/logout", (req, res) => {
    res.clearCookie("login");  
    res.redirect("/login");  
});

app.post("/signup",async (req,res)=>{
    const { signupName, signupEmail, signupPassword } = req.body;
    try {
        const existingUser = await userInfo.findOne({ email: signupEmail });
        if (existingUser) {
            return res.render("login", { message: "User already exists login here" });
        }
        const hashed=await bcrypt.hash(signupPassword,10);
        await userInfo.create({
            name: signupName,
            email: signupEmail,
            password: hashed
        });
        res.redirect("/login");
    } catch (err) {
        console.error("Error during signup:", err);
        res.status(500).send("An error occurred during signup");
    }

});
app.post("/login",async (req,res)=>{
    const {loginEmail,loginPassword}=req.body;
    try{
       const user=await userInfo.findOne({email:loginEmail});
        if(!user){
           return res.render("login",{message:"Invalid Email"});
        }
        const isCorrect=await bcrypt.compare(loginPassword,user.password);
        if(!isCorrect){
            return res.render("login",{message:"Invalid Password"});
        }
        // console.log("present");
        const token = jwt.sign({ _id: user._id }, "ssaabb",{ expiresIn: '1h' });
        res.cookie("login", token, { httpOnly: true,maxAge:3600000});
        res.render("index",{username:user.name, email:user.email});
   }
   catch(err){
    console.error("Error during login:", err);
    res.status(500).send("An error occurred during login");
   }
});
app.post("/add_contact",async (req,res)=>{
    // console.log(req.body);
    try {
        const {formName,formEmail,formMessage}=req.body;
        console.log("Received data:", req.body);
        if (!formName || !formEmail || !formMessage) {
          console.log("Missing required fields");
          return res.status(400).send("All fields are required");
        }
        await contactInfo.create({
            name:formName, 
            email:formEmail, 
            message:formMessage });
        console.log("Contact info added");
        res.redirect("/");
      } catch (error) {
        console.error("Error adding contact info:", error);
        res.status(500).send("An error occurred while adding contact info");
      }
});
app.listen(port,()=>{
    console.log(`Server is running on port ${port}`);
});
