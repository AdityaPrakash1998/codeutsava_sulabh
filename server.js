const express=require('express');
const bodyParser=require('body-parser');
const path=require('path');
var mongodb=require('mongodb');
var flash=require('connect-flash');
var validator=require('express-validator');
let session=require('express-session');


const app=express();

//Load view engine
app.set('views',path.join(__dirname,'views'));
app.set('view engine','pug');

//bodyParser middleware
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

//Loading static assets
app.use(express.static(path.join(__dirname,'public')));

//Express Session middleware
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));

//Expree-messages middleware
app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

//Express-validator Middleware
app.use(validator({
  errorFormatter:function(param,msg,value)
  {
    var namespace=param.split('.')
    , root=namespace.shift()
    ,formParam=root;

    while(namespace.length){
      formParam+='['+namespace.shift()+']';
    }
    return{
      param:formParam,
      msg:msg,
      value:value
    }
  }

}));

app.get('/',function(req,res)
{
  res.render('index');
});

let reviewRoute=require('./routes/review');
app.use('/review',reviewRoute);

app.listen('8080',()=>console.log('Server started at port 8080 !'));
