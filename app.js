"use strict";

let http = require('http');
let fs = require('fs');
let async = require('async');
let path = require('path');


function start () {
    let composed = async.compose(creatMockingService, loadConfig, setParams);
    let port = 3000;
    let file = './config.json';

    composed(null, function (error, results) {
        if (error) {
            console.log(error);
        } else {
            console.log(results);
        }
    });

    function setParams (params, callback) {
        let argv = require('optimist')
            .usage('Mock REST server')
            .alias('f', 'file')
            .alias('p', 'port')
            .describe('f', 'File to load for configuration')
            .describe('p', 'Port for server to listen to')
            .argv;

        file = argv.file || file;
        port = argv.port || port;

        callback(null, null);
    }

    function loadConfig (params, callback) {

        function handleFile (error, fileData) {
            let returnData = error || JSON.parse(fileData);
            callback(error, returnData);
        }

        fs.readFile(file, handleFile);
    }

    function creatMockingService (config, callback) {
        function handleRequest(request, response){
            let url = request.url.slice(1);
            if (config[url]) {
                let returnResponse = config[url][request.method];
                let returnValue = (typeof returnResponse.returnValue === "string") ? returnResponse.returnValue : JSON.stringify(returnResponse.returnValue);
                response.statusCode = returnResponse.statusCode;
                response.end(returnValue);
            } else {
                response.statusCode = 404;
                response.end();
            }
        }

        let server = http.createServer(handleRequest);

        server.listen(port, function () {
            callback(null, "Server listening on: http://localhost:" + port);
        });
    }
}

start();