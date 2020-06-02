const express = require ('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = mongoose.model("User")
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {JWT_SECRET} = require('../config/keys')
const {EMAIL} = require('../config/keys')
const {SENDMAIL} = require('../config/keys')
const requireLogin = require('../middleware/requireLogin')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')

const transporter = nodemailer.createTransport(sendgridTransport({
    auth:{
        api_key:SENDMAIL
    }
}))

router.post('/signup',(req,res)=> {
    const {name,email,password,pic} = req.body
    if(!email || !password || !name) {
        return res.status(422).json({error:"Please complete all fields"})
    }
    User.findOne({email:email})
    .then((savedUser)=> {
        if(savedUser){
            return res.status(422).json({error:"User already exists with this email"})
        }
        bcrypt.hash(password,12)
        .then(hashedPassword=>{
            const user = new User({
                email,
                password:hashedPassword,
                name,
                pic
            })
    
            user.save()
            .then(user=>{
                transporter.sendMail({
                    to:user.email,
                    from:EMAIL,
                    subject:"Signed up successfully",
                    html:"<h1>Welcome to Instaclone!</h1>"
                })
                res.json({message:"User has successfully signed up."})
            })
            .catch(err=>{
                console.log(err)
            })
        })
    })
    .catch(err=>{
        console.log(err)
    })
})

router.post('/signin',(req,res)=>{
    const {email, password} = req.body
    if(!email || !password){
        return res.status(422).json({error:"Please add email address or password"})
    }
    User.findOne({email:email})
    .then(savedUser=>{
        if(!savedUser){
            res.status(422).json({error:"Invalid email address or password"})
        }
        bcrypt.compare(password,savedUser.password)
        .then(doMatch=>{
            if (doMatch){
                // res.json({message:"User has successfully signed in"})
                const token = jwt.sign({_id:savedUser._id}, JWT_SECRET)
                const {_id,name,email,followers,following,pic} = savedUser
                res.json({token,user:{_id,name,email,followers,following,pic}})
            }
            else{
                return res.status(422).json({error:"Invalid email address or password"})
            }
        })
        .catch(err=>{
            console.log(err)
        })
    })
    .catch(err=>{
        console.log(err)
    })
})

router.post('/reset-password',(req,res)=>{
    crypto.randomBytes(32,(err,buffer)=>{
        if(err){
            console.log(err)
        }
        const token = buffer.toString("hex")
        User.findOne({email:req.body.email})
        .then(user=>{
            if(!user){
                return res.status(422).json({error:"User doesn't exist with this email"})
            }
            user.resetToken = token
            user.expireToken = Date.now() + 3600000
            user.save().then((result)=>{
                transporter.sendMail({
                    to:user.email,
                    from:EMAIL,
                    subject:"Password reset",
                    html:`
                    <p>You requested to reset your password</p>
                    <h5>Click this <a href="http://localhost:3000/reset/${token}">link</a> to reset your password</h5>
                    `
                })
                res.json({message:"Reset password sent to your email address"})
            })
        })
    })
})

router.post('/new-password',(req,res)=>{
    const newPassword = req.body.password
    const sentToken = req.body.token
    User.findOne({resetToken:sentToken,expireToken:{$gt:Date.now()}})
    .then(user=>{
        if(!user){
            return res.status(422).json({error:"Try again - session expired"})
        }
        bcrypt.hash(newPassword,12).then(hashedPassword=>{
            user.password = hashedPassword
            user.resetToken = undefined
            user.expireToken = undefined
            user.save().then((savedUser)=>{
                res.json({message:"Successfully reset password"})
            })
        })
    }).catch(err=>{
        console.log(err)
    })
})

module.exports = router