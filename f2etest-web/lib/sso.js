var pkg = require('../package.json');
var request = require('request');

var SSO_SERVER = 'https://login.xxx.com';

// login接口
var LOGIN_URL = SSO_SERVER + '/doLogin';

// logout接口
var LOGOUT_URL = SSO_SERVER + '/doLogout';

// TOKEN校验接口
var AUTH_URL = SSO_SERVER + '/getSSOUser';

// 需要强制登录的URL
var reRequireLoginUrl = /^\/($|initUser|openapp|help|install|stat|statteam|statuser|changelog|api|local|install\.bat|getAllBrowsers)/;

module.exports = function(app) {

    app.use(function(req ,res, next){
        var session = req.session;
        var query = req.query;
        var url = req.url;
        var backUrl;
        if(url.indexOf('/logout') === 0){
            // 清空本地登录态
            session.user = null;
            // 清除远程登录态
            backUrl = req.headers.referer || req.protocol+'://'+req.headers.host+'/';
            return res.status(302).redirect(LOGOUT_URL+'&BACK_URL='+encodeURIComponent(backUrl));
        }
        else if(!session.user){// 未登录状态
            var SSO_TOKEN = query['SSO_TOKEN'];
            if(SSO_TOKEN){// 登录成功返回
                // 校验登录态有效性
                return checkToken(SSO_TOKEN, function(err, user){
                    if(!err){
                        session.user = user;
                        var backUrl = query['BACK_URL'];
                        // 跳转回登录前页面
                        res.status(302).redirect(backUrl);
                    }
                    else{
                        res.end(err);
                    }
                });
            }
            else if(reRequireLoginUrl.test(url) === true){ // 未登录，跳转SSO登录页面
                // 跳转SSO登录页
                backUrl = req.protocol+'://'+req.headers.host + (req.originalUrl || req.url);
                return res.status(302).redirect(LOGIN_URL+'&BACK_URL='+encodeURIComponent(backUrl));
            }
        }
        next();
    });

    // 校验token有效性
    function checkToken(SSO_TOKEN, callback){
        request({
            url: AUTH_URL + '&SSO_TOKEN='+encodeURIComponent(SSO_TOKEN),
            method: 'post',
            json: true,
            timeout: 10000
        }, function (error, response, body) {
            var err = null;
            var user = null;
            if (!error && response.statusCode == 200) {
                if(!body.hasError){
                    var content = body.content;
                    try{
                        content = JSON.parse(content);
                        // 返回userid和lastName
                        user = {
                            userid: content.emailPrefix,
                            username: content.lastName
                        }
                    }
                    catch(e){
                        err = 'Json parse failed.';
                    }
                }
                else{
                    err = 'checkToken api failed.';
                }
            }
            callback(err, user);
        });
    }
};