module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()

  const twoDaysInSeconds = 2 * 24 * 60 * 60;
  await deploy("Timelock", {
    from: deployer,
    args: [deployer, twoDaysInSeconds],
    log: true,
    deterministicDeployment: false
  })
}

module.exports.tags = ["Timelock"]
module.exports.dependencies = ["UniswapV2Factory", "UniswapV2Router02"]