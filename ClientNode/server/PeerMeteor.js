
  var fs = Meteor.npmRequire("fs");
  var chunks = [];
  var writeLocation = "/Users/zackleman/Desktop/DDP-P2P/ClientNode/public/";
  var readLocation = "/Users/zackleman/Desktop/ClientNode2/public/";
  var TESTING_INDEX_NODE = "http://localhost:5000";
  var TESTING_OWN_IP = "http://localhost:3000";
  Meteor.startup(function() {});
  Meteor.methods({
    registerFiletoShare: function(fileName) {
      registerFiletoShare(fileName);
    },
    download: function(file) {
      var fileName = file;
      var indexNodeIP = findIndexNode();
      var IndexNode = DDP.connect(indexNodeIP);
      IndexNode.call("findFile", {"fileName": fileName}, function(error, result) {
        if (typeof error !== "undefined" && error !== null) {} else {
          console.log("Obtained File Location Information");
          initPeerFileTransfer(result, fileName);
        }
      });
    },
    getFileChunks: function(requestedChunks) {
      var chunkNumber = requestedChunks.chunk;
      var fileName = requestedChunks.fileName;
      var data = getChunkOfFile(fileName, chunkNumber);
      return {
        "rawData": data,
        "chunkNumber": chunkNumber
      };
    }
  });
  function findIndexNode() {
    return TESTING_INDEX_NODE;
  }
  function getOwnIPAndPort() {
    return TESTING_OWN_IP;
  }
  function registerFiletoShare(fileName) {
    var IndexNode = DDP.connect(findIndexNode());
    var hostNameWithPort = getOwnIPAndPort();
    var filepath = "/Users/zackleman/Desktop/ClientNode2/public/ " + fileName;
    var numberOfParts = splitFileCount(filepath);
    IndexNode.call("registerFile", fileName, numberOfParts, hostNameWithPort, function(error, result) {
      if (error) {
        console.log("Registration Failed");
      } else {
        console.log("Registered File with Index Server");
      }
    });
  }
  function getChunkOfFile(fileName, chunk) {
    console.log("Returning chunk File");
    var base64File = Async.runSync(function(done) {
      fs.readFile("/Users/zackleman/Desktop/ClientNode2/public/" + fileName, function(err, original_data) {
        var encodedData = original_data.toString("base64");
        var start;
        var amount;
        if (chunk === 0) {
          start = 0;
          amount = encodedData.length;
        } else {
          start = encodedData.length;
          amount = encodedData.length / chunks.length;
        }
        var chunkEncodedData = encodedData.substring(start, amount);
        done(null, chunkEncodedData);
      });
    });
    return {
      "base64File": base64File,
      "part": chunk
    };
  }
  function concatFile(chunkList) {
    chunkList.sort(function(a, b) {
      if (a.chunkNumber < b.chunkNumber) {
        return -1;
      } else {
        return 1;
      }
    });
    var data = chunkList[0].rawData.base64File.result;
    for (var i = 1; i < chunkList.length; i++) {
      data += chunkList[i].rawData.base64File.result;
    }
    return data;
  }
  function writeConcatedFile(base64String, fileName) {
    var decodedImage = new Buffer(base64String, "base64");
    fs.writeFile(writeLocation + fileName, decodedImage, function(err) {});
    resetForNextFileTransfer(fileName);
  }
  function resetForNextFileTransfer(fileName) {
    chunks = [];
    registerFiletoShare(fileName);
  }
  function initPeerFileTransfer(chunkHolder, fileName) {
    console.log("Start Calling Peers for file transfer");
    var $__0 = function(chunk) {
      var peer = DDP.connect(chunkHolder.chunks[chunk].chunk);
      peer.call("getFileChunks", {
        "fileName": fileName,
        "chunk": chunk
      }, function(error, result) {
        if (typeof error !== "undefined" && error !== null) {
          console.log("ERROR for peer: " + chunk);
        } else {
          console.log("Retrieved peer: " + chunk + " info");
          chunks.push(result);
          if (chunks.length === chunkHolder.chunks.length) {
            var concatedFile = concatFile(chunks);
            writeConcatedFile(concatedFile, fileName);
          }
        }
      });
    };
    for (var chunk = 0; chunk < chunkHolder.chunks.length; chunk++) {
      $__0(chunk);
    }
  }
  function splitFileCount(filePath) {
    return 10;
  }

