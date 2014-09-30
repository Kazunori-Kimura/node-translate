// node-translate
// lib/index.js
var request = require("request"),
    config = require("config"),
    colors = require("colors"),
    here = require("here").here,
    util = require("util"),
    fs = require("fs"),
    path = require("path"),
    Q = require("q"),
    toJSON = require("xmljson").to_json;

// const
var TRANSLATE_URL = "http://api.microsofttranslator.com/v2/Http.svc/Translate?text=%s&from=%s&to=%s",
    GRANT_TYPE = "client_credentials",
    SCOPE_URL = "http://api.microsofttranslator.com",
    AUTH_URL = "https://datamarket.accesscontrol.windows.net/v2/OAuth2-13/",
    HTTP_PROXY_ENV = "HTTP_PROXY",
    CONFIG_FILE = "../config/runtime.json";

// define color theme
colors.setTheme({
    debug: "grey",
    info: "green",
    warn: "yellow",
    error: "red"
});

// (1) get command line arguments
function getParameters(params){
    
    var deffered = Q.defer();

    if(typeof params.source == "string"){
        config.source = params.source;
    }
    if(typeof params.target == "string"){
        config.target = params.target;
    }
    if(typeof params.client_id == "string"){
        config.client_id = params.client_id;
    }
    if(typeof params.client_secret == "string"){
        config.client_secret = params.client_secret;
    }
    
    // configuration file path
    var file = path.resolve(__dirname, CONFIG_FILE);
    
    fs.writeFile(
        file,
        JSON.stringify(config),
        { encoding: "utf8", mode: 384 },
        function(err){
            if(err){
                
                deffered.reject(err);
            }else{
                
                deffered.resolve(params);
            }
        });

    return deffered.promise;
}


// (2) get access token from Microsoft Azure
function getAccessToken(params){
    
    var deffered = Q.defer();

    var options = {
        uri: AUTH_URL,
        form: {
            client_id: encodeURI(config.client_id),
            client_secret: encodeURI(config.client_secret),
            scope: encodeURI(SCOPE_URL),
            grant_type: GRANT_TYPE
        },
        json: true
    };

    var p = getProxySetting();
    if(p){
        options.proxy = p;
    }

    request.post(options, function(error, response, body){
        if(!error && response.statusCode == 200){
            
            params.access_token = "Bearer " + body.access_token;

            deffered.resolve(params);
        }else{
            
            var msg = util.format(here(/*
code: %s
error:
%s
body:
%s
*/).valueOf(), response.statusCode, error, body);

            deffered.reject(msg);
        }
    });

    return deffered.promise;
}


// (3) call microsoft translate api
function translate(params){
    var deffered = Q.defer();

    var url = util.format(TRANSLATE_URL,
            encodeURI(params.text),
            config.source,
            config.target);

    var opts = {
            url: url,
            headers: {
                "Authorization": params.access_token
            }
        };

    // proxy setting
    var p = getProxySetting();
    if(p){
        opts.proxy = p;
    }

    // get
    request.get(opts, function(error, response, body){
        if(!error && response.statusCode == 200){
            
            console.log(body.debug);
            
            params.body = body;

            deffered.resolve(params);
        }else{
            
            var msg = here(/*
Status Code: %d
Error:
%s
Body:
%s
*/).valueOf();

            msg = util.format(msg, response.statusCode, error, body);

            deffered.reject(msg);
        }
    });

    return deffered.promise;
}

// (4) parse response xml
function parseXml(params){
    if(!params.body){
        return;
    }

    // xmljson.to_json
    toJSON(params.body, function(error, data){
        var word = data["string"]["_"];

        console.log(here(/*
%s: %s
%s: %s
*/).valueOf(),
            config.source.warn, params.text,
            config.target.warn, word);
    });
}

// get proxy setting from environment variable
function getProxySetting(){
    var proxy = process.env[HTTP_PROXY_ENV];
    if(typeof proxy == "undefined"){
        proxy = process.env[HTTP_PROXY_ENV.toLowerCase()];
    }
    return proxy;
}


module.exports = {
    execute: function(params){
        getParameters(params)
            .then(getAccessToken)
            .then(translate)
            .fail(function(msg){
                console.log(msg.error);
            })
            .done(parseXml);
    }
};
