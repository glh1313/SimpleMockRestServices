"use strict";

let http = require('http');
let fs = require('fs');
let async = require('async');
let path = require('path');
let chokidar = require('chokidar');


function start () {
    let composed = async.compose(createMockingService, startFileWatch, openLogFile, loadConfig, setParams);
    let port = 3000;
    let file = './config.json';
    let outputFile = './log.txt';
    let fileDelimiter = null;
    let config = null;

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
        outputFile = argv.output || outputFile;

        callback(null, null);
    }

    function openLogFile (params, callback) {
        let outPath = path.resolve(outputFile);
        if (outputFile) {
            fs.open(outPath, 'w', function (error, fd) {
                if (!error) {
                    fileDelimiter = fd;
                }

                callback(error, params);
            });
        }
    }

    function loadConfig (params, callback) {
        function handleFile (error, fileData) {
            config = error || JSON.parse(fileData);
            callback(error, config);
        }

        fs.readFile(file, handleFile);
    }

    function logToFile (message) {
        let timeStamp = new Date().toUTCString();
        let outgoingMessage = timeStamp + '\t' + message + '\n';

        if (fileDelimiter) {
            fs.write(fileDelimiter, outgoingMessage, function (error, written, string) {
                if (error) {
                    console.error('Unable to write to file ' + outputFile);
                }
            });
        }
    }

    function createMockingService (params, callback) {
        function handleRequest(request, response){
            let url = request.url.slice(1);
            if (config[url] && config[url][request.method]) {
                let returnResponse = config[url][request.method];
                let returnValue = (typeof returnResponse.returnValue === "string") ? returnResponse.returnValue : JSON.stringify(returnResponse.returnValue);
                response.statusCode = returnResponse.statusCode;
                response.end(returnValue);

                logToFile('Requested URL: ' + request.url + '\tReturned status code: ' + response.statusCode + '\tReturn value: ' + returnValue);
            } else {
                response.statusCode = 404;
                response.end();
                logToFile('Requested URL: ' + request.url + '\tReturned status code: ' + response.statusCode + '\tURL is not configured');
            }
        }

        let server = http.createServer(handleRequest);

        server.listen(port, function () {
            callback(null, "Server listening on: http://localhost:" + port);
        });
    }

    function startFileWatch (params, callback) {
        function handleChangeInFile (fileName) {
            loadConfig(null, function () {
                console.log('A updated configuration file was loaded');
            });
        }

        chokidar.watch(file, {
            ignored: /(^|[\/\\])\../,
            persistent: true
        }).on('change', handleChangeInFile.bind(this));

        callback(null, params);
    }
}

start();