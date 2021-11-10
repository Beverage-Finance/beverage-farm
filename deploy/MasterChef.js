module.exports = async function ({ ethers, deployments, getNamedAccounts }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()
  const treasuryMultisig = deployer;

  const bever = await ethers.getContract("BeverageToken")
  
  const { address } = await deploy("MasterChef", {
    from: deployer,
    args: [bever.address, "1000000000000000000000", treasuryMultisig],   // initially 1000 BEVER per block
    log: true,
    deterministicDeployment: false
  })

  if (await bever.owner() !== address) {
    // Transfer BeverageToken Ownership to Chef
    console.log("Transfer BeverageToken Ownership to Chef")
    await (await bever.transferOwnership(address)).wait()
  }
}

module.exports.tags = ["MasterChef"]
module.exports.dependencies = ["UniswapV2Factory", "UniswapV2Router02", "BeverageToken"]
