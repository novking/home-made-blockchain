'use strict';
const express = require('express');
const app = express();
const Blockchain = require('./blockchain');
const bc = new Blockchain();
const bodyParser = require('body-parser');
const rp = require('request-promise');
const PORT = process.argv[2];

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.listen(PORT, () => {
    console.log(`Blockchain is up on ${PORT}`);
})

app.post('/register-and-broadcast', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;
    if (bc.networkNodes.indexOf(newNodeUrl) === -1) {
        bc.networkNodes.push(newNodeUrl);
    }
    const requestList = [];
    bc.networkNodes.forEach((networkNodeUrl) => {
        const requestOptions = {
            url: networkNodeUrl + '/register-server',
            method: 'POST',
            body: {
                newNodeUrl: newNodeUrl
            },
            json: true
        }
        requestList.push(rp(requestOptions));
    });
    Promise.all(requestList).then(data  => {
        const requestOptions = {
            uri: newNodeUrl + '/register-server-in-bulk',
            json: true,
            body: {
                networkNodes: [...bc.networkNodes, bc.currentNodeUrl]
            },
            method: 'POST'
        }
        rp(requestOptions).then((data) => {
            res.send('register and broadcast is done');
        });
    }).catch((error) => {
        console.log(error);
    })

});

app.post('/register-server', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;
    if (bc.currentNodeUrl !== newNodeUrl && bc.networkNodes.indexOf(newNodeUrl) === -1) {
        bc.networkNodes.push(newNodeUrl);
    }
    res.json({note: 'register-server is sucessfully updated!'})
});

app.post('/register-server-in-bulk', (req, res) => {
    req.body.networkNodes.forEach((networkNodeUrl) => {
        if (bc.currentNodeUrl !== networkNodeUrl && bc.networkNodes.indexOf(networkNodeUrl) === -1) {
            bc.networkNodes.push(networkNodeUrl);
        }
    })
    res.json({note: 'register-server-in-bulk done'})
});

app.get('/blockchain', (req, res) => {
    res.send(bc);
})


app.post('/transaction-and-broadcast', (req, res) => {
    const newTransaction = req.body.transaction;
    bc.addingNewTransaction(newTransaction.amount, newTransaction.sender, newTransaction.receiver);
    const broadcast = [];
    bc.networkNodes.forEach((networkNodeUrl) => {
        const requestOptions = {
            url: networkNodeUrl + '/transaction',
            json: true,
            body: {
                transaction: newTransaction
            },
            method: 'POST'
        }
        broadcast.push(rp(requestOptions));
    });
    Promise.all(broadcast).then((data) => {
        res.json({note: 'transaction and broadcast has completed'});
    })
});

app.post('/transaction', (req, res) => {
    const newTransaction = req.body.transaction;
    bc.addingNewTransaction(newTransaction.amount, newTransaction.sender, newTransaction.receiver);
    res.json({note: 'transaction has been recorded'});
});

app.post('/mine', (req, res) => {
    const nonce = bc.proofOfWork();
    const prevHash = bc.getLastBlock().hash;
    const hash = bc.createHash(prevHash, nonce, bc.pendingTransactions);

    const newBlock = bc.createNewBlock(nonce, hash, prevHash);
    const broadcast_mine = [];
    bc.networkNodes.forEach((networkNodeUrl) => {
        const requestOptions = {
            url: networkNodeUrl + '/receive-new-block',
            json: true,
            method: 'POST',
            body: {
                newBlock: newBlock
            }
        }
        broadcast_mine.push(rp(requestOptions));
    });

    Promise.all(broadcast_mine)
    .then((data) => {      
        const requestOptions1 = {
            url: bc.currentNodeUrl + '/transaction-and-broadcast',
            json: true,
            method: 'POST',
            body: {
                transaction: {
                    amount: 12.5,
                    sender: 'God',
                    receiver: bc.uuid
                }
            }
        }
        return rp(requestOptions1);
    })
    .then((data) => {
        res.json({
            note: 'mining finished',
            newBlock: newBlock
        })
    });
});

app.post('/create-new-block', (req, res) => {
    const lastBlock = bc.getLastBlock();
    const data = req.body.data;
    if (lastBlock.hash !== data.prevHash) {
        res.send({error: 'the previous hash is match with the record on this server'});
    } 
    const currentHash = bc.createHash(lastBlock.hash, data.nonce);
    if (currentHash.substring(0, 4) !== '0000') {
        res.send({error: 'nonce is valid'});
    }
    bc.createNewBlock(data.nonce, currentHash, data.prevHash);
    res.send({note: 'new block has been created'});
});

app.post('/receive-new-block', (req, res) => {
    const newBlock = req.body.newBlock;
    const error = bc.addingNewBlock(newBlock);
    bc.pendingTransactions = [];
    if (error) {
        res.send(error);
    } else {
        res.send({note: 'received and added a new block to the chain'});
    }
});


app.post('/setup', (req, res) => {
    const a = [];
    const b = [
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004"
    ];
    b.forEach((url) => {
        const rqOption = {
            url: url + '/register-and-broadcast',
            json: true,
            method: 'POST',
            body: {
                newNodeUrl: url
            }
        }
        a.push(rp(rqOption));
    });

    Promise.all(a).then((data) => {
        res.send({
            note: 'be happy'
        });
    }).catch(error => {
        res.send(error)
    });
});
