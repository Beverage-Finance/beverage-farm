WETH = {
  1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  42: "0xd0A1E359811322d97991E03f863a0C30C2cF029C",
}

module.exports = async function ({ ethers: { getNamedSigner }, getNamedAccounts, getChainId, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const factory = await ethers.getContract("UniswapV2Factory")
  const bar = await ethers.getContract("BeverageBar")
  const bever = await ethers.getContract("BeverageToken")
    
  const chainId = await getChainId()

  let wethAddress;
  
  if (chainId === '31337') {
    wethAddress = (await deployments.get("WETH9Mock")).address
  } else if (chainId in WETH) {
    wethAddress = WETH[chainId]
  } else {
    throw Error("No WETH!")
  }

  await deploy("BeverageMaker", {
    from: deployer,
    args: [factory.address, bar.address, bever.address, wethAddress],
    log: true,
    deterministicDeployment: false
  })
}

module.exports.tags = ["BeverageMaker"]
module.exports.dependencies = ["UniswapV2Factory", "UniswapV2Router02", "BeverageBar", "BeverageToken"]