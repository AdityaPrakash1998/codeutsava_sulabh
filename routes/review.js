const express=require('express');
var router=express.Router();
var mongodb=require('mongodb');
const multer=require('multer');
const path=require('path');
const nodemailer=require('nodemailer');

var placeInfo={
  placeId:'',
  placeName:'',
  placeAddress:''
}
var reviewInfo={
  placeId:'',
  placeName:'',
  placeAddress:'',
  userName:'',
  userEmail:'',
  review:'',
  date:'',
  starRating:''
}
//Storage engine setup
var storage=multer.diskStorage(
{
    destination:`./public/uploads/`,
    filename:function(req,file,cb)
    {
      cb(null,placeId+'$'+Date.now()+path.extname(file.originalname));
    }
});
//Upload function
const upload= multer({
  storage:storage,
  fileFilter: function(req,file,cb)
  {
    checkFile(file,cb);
  }
}).single('reviewImage');

//Checkfile function
function checkFile(file,cb)
{
  const filetypes = /png|jpeg|jpg|gif/;
  const extname=filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype=filetypes.test(file.mimetype);

  if(extname && mimetype)
  {
    cb(null,true);
  }
  else {
    cb('Error: Image Only');
  }
}

//OTP generator
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

//


//Mongodb Credentials
const mongoClient=mongodb.MongoClient;
var url="mongodb://127.0.0.1:27017/toiletReview";

//review/id/name/address GET route
router.get('/:id/:name/:address',function(req,res)
{
  reviewInfo.placeId=req.params.id;
  reviewInfo.placeName=req.params.name;
  reviewInfo.placeAddress=req.params.address;
  req.flash('success', 'Thanks for your efforts');
  res.render('review',{
    id:reviewInfo.placeId,
    placeName:reviewInfo.placeName,
    address:reviewInfo.placeAddress
  })
});

//review/a/id POST route
router.post('/a/:id',function(req,res)
{
    upload(req,res,(err)=>{
      if(err){
        console.log(err);
        res.render('review',{
          msg:err,
          name:placeInfo.placeName,
          address:placeInfo.placeAddress
        });
      }
      else {
        req.checkBody('name','Name is Required').notEmpty();
        req.checkBody('review','Review is Required').notEmpty();
        req.checkBody('email','Email is Required').notEmpty();
        req.checkBody('email','Invalid Email').isEmail();

        let errors=req.validationErrors();

        if(errors){
          res.render('review',{
            errors:errors,
            name:placeInfo.placeName,
            address:placeInfo.placeAddress
          });
        }
        else {
          var date=new Date();
          var month=date.getMonth()+1;
          reviewInfo.userName=req.body.name;
          reviewInfo.userEmail=req.body.email;
          reviewInfo.review=req.body.review;
          reviewInfo.date={year:date.getFullYear(),month:month,day:date.getDate()};
          reviewInfo.starRating=req.body.star;

          otp=getRandomInt(100001,999999);
          console.log(otp);
          var data=require('../config/data.js');

          var transporter =nodemailer.createTransport({
            service:'gmail',
            auth:{
                type:'OAuth2',
                user:'abekh19@gmail.com',
                clientId:data.clientId,
                clientSecret:data.clientSecret,
                refreshToken:data.refreshToken
            },
            tls: {
                rejectUnauthorized: false
            }
          });

          var mailOptions={
            from:'Sulabh <abekh19@gmail.com>',
            to:req.body.email,
            subject:'Authentication for Sulabh',
            text:`Your one time password is ${otp} \n Please Enter the OTP to review this toilet`
          }

          transporter.sendMail(mailOptions,function(err,info)
        {
          console.log('trying to send');
          if(err)
          console.log(err);
          else {
            console.log(reviewInfo);
            console.log('Sent');
            res.render('otpverify');
          }
        });

        }
      }
    });
});

router.post('/otpverify',function(req,res)
{
  const enteredOtp=req.body.OTP;
  if(otp==enteredOtp){
    mongoClient.connect(url,function(err,database)
  {
    if(err)
    console.log(err);
    else {
      var dtb=database.db('toiletReview');
      var collection=dtb.collection('reviews');

      collection.insert([reviewInfo],function(err,result)
      {
        if(err)
        console.log(err);
        else {
          console.log('saved');
          req.flash('success',`Thanks for your review`);
          res.redirect('/');
        }
      });
    }
  });
  }
  else {
      req.flash('danger','Invalid OTP');
      res.render('otpverify');
  }
});

router.get('/view/:id',function(req,res)
{
  var id=req.params.id;
  mongoClient.connect(url,function(err,database)
{
  if(err)
  console.log(err);
  else {
    var dtb=database.db('toiletReview');
    var collection=dtb.collection('reviews');
    collection.find({placeId:id}).toArray(function(err,result)
  {
    if(err)
    res.send(err);
    else {
      if(result.length)
      {
        var sum=0;
        for(var i=0;i<result.length;i++)
          sum+=parseInt(result[i].starRating);
        sum=Math.ceil(sum/result.length);

        var rating=[false,false,false,false,false];
        for(var i=0;i<sum;i++){
          rating[i]=true;
        }
        var feedback=['Bad and Untidy','Untidy','Well built but not managed','Well built and Clean','Well built and in Excellent condition'];

        res.render('viewReview',{
          results:result,
          single:result[0],
          rating:rating,
          noOfReviews:result.length,
          feedback:feedback[sum-1]
        })
      }
      else {
        req.flash('danger','Sorry. No Reviews Yet');
        res.render('noReview');
        //res.send('No reviews');
      }
    }
  });
  }
});
});

module.exports=router;
