const express = require ('express')
const router = express.Router()

router.get('/',(req,res)=> {
    res.send("Hello")
})

router.post('/signup',(req,res)=> {
    const {name,email,password} = req.body
    if(!email || !password || !name) {
        return res.status(422).json({error:"Please complete all fields"})
    }
    res.json({message:"successfully posted"})
})

module.exports = router