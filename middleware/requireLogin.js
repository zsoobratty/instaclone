const jwt = require('jsonwebtoken')
const {JWT_SECRET} = require('../keys')
const mongoose = require('mongoose')
const User = mongoose.model("User")

module.exports = (req, res, next)=> {
    const {authorisation} = req.headers
    if(!authorisation){
        return res.status(401).json({error:"You must log in to view this page"})
    }
    const token = authorisation.replace("Bearer ","")
    jwt.verify(token, JWT_SECRET,(err,payload)=> {
        if(err){
            return res.status(401).json({error:"You must be logged in to view this page"})
        }
        const {_id} = payload
        User.findById(_id).then(userData=>{
            req.user = userData
            next()
        })
    })
}