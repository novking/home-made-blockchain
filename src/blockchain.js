const sha256 = require('sha256');
const currentNodeUrl = process.argv[3];
const uuid = require('uuid/v1');

function Blockchain() {
	this.chain = [];
	this.pendingTransactions = [];

	this.currentNodeUrl = currentNodeUrl;
	this.networkNodes = [
	];
	this.uuid = uuid();
	this.createNewBlock(100, '0', '0');
};

Blockchain.prototype.createNewBlock = function(nonce, currentHash, prevHash) {
	const newBlock =  {
		transaction: JSON.parse(JSON.stringify(this.pendingTransactions)),
		index: this.chain.length,
		nonce: nonce,
		prevHash: prevHash,
		hash: currentHash,
		timestamp: Date.now()
	}
	this.pendingTransactions = [];
	this.chain.push(newBlock);
	return newBlock;
}

Blockchain.prototype.addingNewBlock = function(newBlock) {
	// const lastBlock = this.getLastBlock();
	// const index = this.chain.length + 1;
	// if (newBlock.prevHash !== lastBlock.hash || newBlock.index !== index) {
	// 	return 'invalid'
	// }
	this.chain.push(newBlock);
}

Blockchain.prototype.addingNewTransaction = function(amount, sender, receiver) {
	const transaction = {
		amount: amount,
		sender: sender,
		receiver: receiver
	}
	this.pendingTransactions.push(transaction);
}

Blockchain.prototype.createHash = function(prevHash, nonce, transactions) {
	const hashString = prevHash + nonce.toString() + JSON.stringify(transactions);
	return sha256(hashString).toString();
}

Blockchain.prototype.proofOfWork = function() {
	const prevHash = this.chain.slice(-1)[0] .hash;
	const transactions = JSON.stringify(this.pendingTransactions);
	let nonce = -1;
	let currentHash = "1126";
	while (currentHash.substring(0,4) !== '0000') {
		nonce += 1;
		currentHash = this.createHash(prevHash, nonce, transactions);
	}
	return nonce
}

Blockchain.prototype.getLastBlock = function() {
	return JSON.parse(JSON.stringify(this.chain.slice(-1)[0]));
}

module.exports = Blockchain;
