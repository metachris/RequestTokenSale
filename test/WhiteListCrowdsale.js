var RequestCrowdsale = artifacts.require("./RequestCrowdsale.sol");
var RequestQuark = artifacts.require("./RequestQuark.sol");
var BigNumber = require('bignumber.js');

var expectThrow = async function(promise) {
  try {
    await promise;
  } catch (error) {
    const invalidOpcode = error.message.search('invalid opcode') >= 0;
    const invalidJump = error.message.search('invalid JUMP') >= 0;
    const outOfGas = error.message.search('out of gas') >= 0;
    assert(
      invalidOpcode || invalidJump || outOfGas,
      "Expected throw, got '" + error + "' instead",
    );
    return;
  }
  assert.fail('Expected throw not received');
};


contract('Whitelist token sale', function(accounts) {
	// account setting ----------------------------------------------------------------------
	var admin = accounts[0];
	var multiSigWallet = accounts[1];
	var vestingWallet = accounts[2];

	var randomGuy1 = accounts[3];
	var randomGuy2 = accounts[4];
	var randomGuy3 = accounts[5];
	var randomGuy4 = accounts[6];
	var randomGuy5 = accounts[7];
	var randomGuy6 = accounts[8];

	// tool const ----------------------------------------------------------------------------
	const day = 60 * 60 * 24 * 1000;
	const second = 1000;

	// crowdsale setting ---------------------------------------------------------------------
	const name = "Request Quark";
	const symbol = "REQ";
	const decimals = 18;
	const amountTokenSupply = 1000000000;
	const rateETHREQ = 5000;
		// translate with decimal for solitidy
	const amountTokenSupplySolidity = (new BigNumber(10).pow(decimals)).mul(amountTokenSupply);
	const capCrowdsaleInETH = 100000;
		// setting in wei for solidity
	const capCrowdsaleInWei = web3.toWei(capCrowdsaleInETH, "ether");

	const startTimeTimestampJS = new Date("2017-10-13").getTime();
	const endTimeTimestampJS 	= new Date("2017-10-20").getTime();
		// translate date in Second for solidity
	const startTimeSolidity = Math.floor(startTimeTimestampJS/1000);
	const endTimeSolidity = Math.floor(endTimeTimestampJS/1000);

		// 35% for presale/reserve etc... and 15% for vesting.
	const tokenInitialDistributionAddresses = [ multiSigWallet, vestingWallet ];
	const tokenInitialDistributionAmounts = [ amountTokenSupplySolidity.mul(35).div(100), amountTokenSupplySolidity.mul(15).div(100)  ];

    // variable to host contracts ------------------------------------------------------------
	var requestCrowdsale;
	var requestQuark;

	beforeEach(async () => {
		// create de crowdsale
		requestCrowdsale = await RequestCrowdsale.new(startTimeSolidity, endTimeSolidity, rateETHREQ, multiSigWallet, amountTokenSupplySolidity, capCrowdsaleInWei, tokenInitialDistributionAddresses, tokenInitialDistributionAmounts);
		// retrieve the Token itself
		requestQuark = await RequestQuark.at(await requestCrowdsale.token.call());
	});

	it("add/delete in whitelist", async function() {
		// add one guy in whitelist by admin
		var r = await requestCrowdsale.changeRegistrationStatus(randomGuy1, true, {from:admin});
		assert.equal(r.logs[0].event, 'RegistrationStatusChanged', "event is wrong");
		assert.equal(r.logs[0].args.target, randomGuy1, "target is wrong");
		assert.equal(r.logs[0].args.isRegistered, true, "isRegistered is wrong");

		// delete one guy from whitelist by admin
		var r = await requestCrowdsale.changeRegistrationStatus(randomGuy1, false, {from:admin});
		assert.equal(r.logs[0].event, 'RegistrationStatusChanged', "event is wrong");
		assert.equal(r.logs[0].args.target, randomGuy1, "target is wrong");
		assert.equal(r.logs[0].args.isRegistered, false, "isRegistered is wrong");
	});


	it("add/delete many guys in whitelist", async function() {
		var listAddress100 = [];
		for(var i=1;i<=100;i++) {
			listAddress100.push(integerToByte20str(i));
		}

		// Add 100 guys in whitelist	
		var r = await requestCrowdsale.changeRegistrationStatuses(listAddress100, true, {from:admin});
		for(var i=1;i<=100;i++) {
			assert.equal(r.logs[i-1].event, 'RegistrationStatusChanged', "event is wrong");
			assert.equal(r.logs[i-1].args.target, listAddress100[i-1], "target is wrong");
			assert.equal(r.logs[i-1].args.isRegistered, true, "isRegistered is wrong");
		}

		// Delete 100 guys in whitelist
		var r = await requestCrowdsale.changeRegistrationStatuses(listAddress100, false, {from:admin});
		for(var i=1;i<=100;i++) {
			assert.equal(r.logs[i-1].event, 'RegistrationStatusChanged', "event is wrong");
			assert.equal(r.logs[i-1].args.target, listAddress100[i-1], "target is wrong");
			assert.equal(r.logs[i-1].args.isRegistered, false, "isRegistered is wrong");
		}
	});


	it("add/delete in whitelist by random guy", async function() {
		// add one guy in whitelist by admin
		await expectThrow(requestCrowdsale.changeRegistrationStatus(randomGuy1, true, {from:randomGuy1}));
		// delete one guy by Randomguy	opcode
		await expectThrow(requestCrowdsale.changeRegistrationStatus(randomGuy1, false, {from:randomGuy1}));
	});


	it("add/delete many guys in whitelist by random guy", async function() {
		var listAddress = [randomGuy1,randomGuy2];
		// add 2 guys by Randomguy	opcode
		await expectThrow(requestCrowdsale.changeRegistrationStatuses(listAddress, true, {from:randomGuy1}));
		// Delete 100 guys in whitelist
		await expectThrow(requestCrowdsale.changeRegistrationStatuses(listAddress, false, {from:randomGuy1}));
	});


	it("add/delete guy less than 24h before sale", async function() {
		const startTimeIn1days = Date.now() + 1*day;
		const endTimeStartPlus7days = startTimeIn1days + 7*day;
			// translate date in Second for solidity
		const startTimeIn1daysSolidity = Math.floor(startTimeIn1days/1000);
		const endTimeStartPlus7daysSolidity = Math.floor(endTimeStartPlus7days/1000);

		// create de crowdsale
		requestCrowdsale = await RequestCrowdsale.new(startTimeIn1daysSolidity, endTimeStartPlus7daysSolidity, rateETHREQ, multiSigWallet, amountTokenSupplySolidity, capCrowdsaleInWei, tokenInitialDistributionAddresses, tokenInitialDistributionAmounts);
		// retrieve the Token itself
		requestQuark = await RequestQuark.at(await requestCrowdsale.token.call());

		// add one guy less than 24h before sale opcode
		await expectThrow(requestCrowdsale.changeRegistrationStatus(randomGuy2, true, {from:admin}));
		// delete one guy less than 24h before sale	opcode
		await expectThrow(requestCrowdsale.changeRegistrationStatus(randomGuy2, false, {from:admin}));
	});


	it("add/delete guys less than 24h before sale", async function() {
		const startTimeIn1days = Date.now() + 1*day;
		const endTimeStartPlus7days = startTimeIn1days + 7*day;
			// translate date in Second for solidity
		const startTimeIn1daysSolidity = Math.floor(startTimeIn1days/1000);
		const endTimeStartPlus7daysSolidity = Math.floor(endTimeStartPlus7days/1000);

		// create de crowdsale
		requestCrowdsale = await RequestCrowdsale.new(startTimeIn1daysSolidity, endTimeStartPlus7daysSolidity, rateETHREQ, multiSigWallet, amountTokenSupplySolidity, capCrowdsaleInWei, tokenInitialDistributionAddresses, tokenInitialDistributionAmounts);
		// retrieve the Token itself
		requestQuark = await RequestQuark.at(await requestCrowdsale.token.call());

		var listAddress = [randomGuy1,randomGuy2];
		// Add 2 guys less than 24h before sale	opcode
		await expectThrow(requestCrowdsale.changeRegistrationStatuses(listAddress, true, {from:admin}));
		// Delete 2 guys less than 24h before sale	opcode
		await expectThrow(requestCrowdsale.changeRegistrationStatuses(listAddress, false, {from:admin}));
	});
	
		


	function integerToByte20str(int) {
		var hexa = int.toString(16);
		var str = '0x';
		var numberOfZero = 40-hexa.length;
		for(i=0;i<numberOfZero;i++) {
			str+='0';
		}
		str+=hexa;
		return str;
	}	

});

