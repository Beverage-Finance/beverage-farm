module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const bever = await deployments.get("BeverageToken")

  await deploy("BeverageBar", {
    from: deployer,
    args: [bever.address],
    log: true,
    deterministicDeployment: false
  })
}

module.exports.tags = ["BeverageBar"]
module.exports.dependencies = ["UniswapV2Factory", "UniswapV2Router02", "BeverageToken"]
