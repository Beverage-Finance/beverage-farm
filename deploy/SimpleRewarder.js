module.exports = async function ({ ethers, deployments, getNamedAccounts }) {
  const { deploy } = deployments

  const { deployer } = await getNamedAccounts()
  const treasuryMultisig = deployer;

  const masterchef = "0xDc5BBb7f25a05259b2bD559936771f8Fc0E2c4cb"; // Masterchef
  const dbl = "0x75c7a5ee75b63792f074c698e1e2004676e8589e"; // DBL on mainnet
  
  const { address } = await deploy("RewarderMock", {
    from: deployer,
    args: ["20000000000000000", dbl, masterchef], // TBD 1 DRINK: 0.02 DBL. $.0017 DRINK $.09 DBL
    log: true,
    deterministicDeployment: false
  })
}

module.exports.tags = ["RewarderMock"]
module.exports.dependencies = []
