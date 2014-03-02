var express = require('express');
var MongoStore = require('connect-mongo')(express);
var mongoose = require('mongoose');
var passport = require('passport');
var app = express();
var main = require('./controllers/index');
var authentication = require('./controllers/auth');
var admin = require('./controllers/admin');
var user = require('./controllers/user');
var script = require('./controllers/script');
var scriptStorage = require('./controllers/scriptStorage');
var settings = require('./models/settings.json');
var connectStr = process.env.CONNECT_STRING || settings.connect;
var sessionSecret = process.env.SESSION_SECRET || settings.secret;
var db = mongoose.connection;

app.set('port', process.env.PORT || 8080);

app.configure(function(){
  app.use(express.urlencoded());
  app.use(express.json());
  app.use(express.compress());
  app.use(express.methodOverride());

  // Order is very important here (i.e mess with at your own risk)
  app.use(express.cookieParser());
  app.use(express.session({
    secret: sessionSecret,
    store: new MongoStore({
      url: connectStr
    })
  }));
  app.use(passport.initialize());
  app.use(app.router);

  // Set up the views
  app.engine('html', require('./libs/muExpress').renderFile);
  app.set('view engine', 'html');
  app.set('views', __dirname + '/views');
});

mongoose.connect(connectStr);
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
  app.listen(app.get('port'));
});

function scriptsRegex (root) {
  var slash = '\/';
  if (root === slash) { slash = ''; }
  return new RegExp(root + 
    '(?:' + slash + 'scripts' +
    '(?:\/size\/(\d+))?' +
    '(?:\/sort\/([^\/]+))?' +
    '(?:\/dir\/(asc|desc))?' +
    '(?:\/page\/([1-9]\d*))?' +
    ')?$');
}

// Authentication routes
app.post('/auth/', authentication.auth);
app.get('/auth/:strategy', authentication.auth);
app.get('/auth/:strategy/callback/', authentication.callback);
app.get('/login', main.login);
app.get('/logout', main.logout);

// User routes
app.get(scriptsRegex('\/users\/([^\/]+)'), user.view);
app.get('/user/edit', user.edit);
app.post('/user/edit', user.update);
app.get('/user/edit/scripts', user.scripts);
app.post('/user/edit/scripts', user.scripts);
app.get('/user/edit/scripts/new', user.newScript);
app.post('/user/edit/scripts/new', user.newScript);
app.get('/scripts/:username/:scriptname/source', user.editScript);
app.get('/scripts/:username/:namespace/:scriptname/source', user.editScript);

// Script routes
app.get('/scripts/:username/:scriptname', script.view);
app.get('/scripts/:username/:namespace/:scriptname', script.view);
app.get('/script/scriptname/edit', script.edit);
app.get('/script/:namespace/:scriptname/edit', script.edit);
app.post('/script/scriptname/edit', script.edit);
app.post('/script/:namespace/:scriptname/edit', script.edit);
app.get('/install/:username/:scriptname', scriptStorage.sendScript);
app.get('/install/:username/:namespace/:scriptname', scriptStorage.sendScript);
app.get('/meta/:username/:scriptname', scriptStorage.sendMeta);
app.get('/meta/:username/:namespace/:scriptname', scriptStorage.sendMeta);
app.post('/github/hook', scriptStorage.webhook);
app.post('/github/service', function (req, res, next) { next(); });

// Admin routes
app.get('/admin/user', admin.userAdmin);
app.get('/admin/api', admin.apiAdmin);
app.post('/admin/user/update', admin.userAdminUpdate);
app.post('/admin/api/update', admin.apiAdminUpdate);

app.get(scriptsRegex('\/'), main.home);

app.use(express.static(__dirname + '/public'));
app.use(function (req, res, next){
  res.sendfile(__dirname + '/public/404.html');
});

