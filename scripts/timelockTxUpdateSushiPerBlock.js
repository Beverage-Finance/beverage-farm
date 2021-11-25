// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const utils = require('../test/utilities');

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // const timelock = await hre.ethers.getContractFactory("Timelock");
  // const masterChef = await hre.ethers.getContractFactory("MasterChef");
  
  // MasterChef call to queue: function setSushiPerBlock(uint256 _sushiPerBlock) public onlyOwner
  // Note: `_sushiPerBlock` is in precise units
  
  // Timelock method to call : queueTransaction(address target, uint value, string memory signature, bytes memory data, uint eta)
  const target = '0xDc5BBb7f25a05259b2bD559936771f8Fc0E2c4cb';    // mainnet
  const value = '0';
  const signature = "setSushiPerBlock(uint256)";
  const data = utils.encodeParameters(["uint256"], ["100000000000000000000"]);   // 100 DRINK per block
  const eta = (await utils.latest()).add(utils.duration.hours(49)).toString();   // 48 hour delay
  
  console.log({target, value, signature, data, eta});
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });