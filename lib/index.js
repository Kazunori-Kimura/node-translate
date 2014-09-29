// node-translate
// lib/index.js
var request = require("request"),
    config = require("config"),
    colors = require("colors"),
    here = require("here").here,
    util = require("util"),
    fs = require("fs"),
    path = require("path");

// const
var TRANSLATE_URL = "https://www.googleapis.com/language/translate/v2?key=%s&source=%s&target=%s&q=%s",
    HTTP_PROXY_ENV = "HTTP_PROXY",
    CONFIG_FILE = "../config/runtime.json";

// define color theme
colors.setTheme({
    debug: "grey",
    info: "green",
    warn: "yellow",
    error: "red"
});

// call google translate api
// @param q {string} query parameter
// @param s {string} source language code
// @param t {string} target language code
// @param k {string} google api key
function translate(q, s, t, k){

    // check query parameter
    if(typeof q == "undefined"){
        // error
        console.log("Enter a word or phrase.".error);
        return;
    }

    if(typeof s == "string"){
        config.source = s;
    }
    if(typeof t == "string"){
        config.target = t;
    }
    if(typeof k == "string"){
        config.key = k;
    }

    // save configuration file
    makeConfigFile();

    var url = util.format(TRANSLATE_URL,
            config.key,
            config.source,
            config.target, q);

    var opts = {
            url: url
        };

    console.log(url.debug);

    // create rest url
    var p = getProxySetting();
    if(p){
        opts.proxy = p;
    }

    // get
    request.get(opts, function(error, response, body){
        if(!error && response.statusCode == 200){
            
            console.log(body.info);
        }else{
            
            var msg = here(/*
Status Code: %d
Error:
%s
Body:
%s
*/).valueOf();

            console.log(msg.error, response.statusCode, error, body);
        }
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

// make configuration file
function makeConfigFile(){
    var file = path.resolve(__dirname, CONFIG_FILE);

    console.log("config file= %s".debug, file);

    // mode:384 = 0600
    fs.writeFileSync(file, JSON.stringify(config), { encoding: "utf8", mode: 384 });

    console.log("write file: %s".info, file);
}

module.exports = {
    execute: translate
};
