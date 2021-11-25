import { ethers } from "hardhat";
import { expect } from "chai";
import { encodeParameters, latest, duration, increase, getBigNumber } from "./utilities"

describe("Timelock", function () {
  before(async function () {
    this.signers = await ethers.getSigners()
    this.alice = this.signers[0]
    this.bob = this.signers[1]
    this.carol = this.signers[2]
    this.dev = this.signers[3]
    this.minter = this.signers[4]
    this.dummy = this.signers[5]

    this.SushiToken = await ethers.getContractFactory("BeverageToken")
    this.Timelock = await ethers.getContractFactory("Timelock")
    this.ERC20Mock = await ethers.getContractFactory("ERC20Mock", this.minter)
    this.MasterChef = await ethers.getContractFactory("MasterChef")
  })

  beforeEach(async function () {
    this.sushi = await this.SushiToken.deploy()
    this.timelock = await this.Timelock.deploy(this.bob.address, "259200")
  })

  it("should not allow non-owner to do operation", async function () {
    await this.sushi.transferOwnership(this.timelock.address)
    // await expectRevert(this.sushi.transferOwnership(carol, { from: alice }), "Ownable: caller is not the owner")

    await expect(this.sushi.transferOwnership(this.carol.address)).to.be.revertedWith("Ownable: caller is not the owner")
    await expect(this.sushi.connect(this.bob).transferOwnership(this.carol.address)).to.be.revertedWith("Ownable: caller is not the owner")

    await expect(
      this.timelock.queueTransaction(
        this.sushi.address,
        "0",
        "transferOwnership(address)",
        encodeParameters(["address"], [this.carol.address]),
        (await latest()).add(duration.days(4))
      )
    ).to.be.revertedWith("Timelock::queueTransaction: Call must come from admin.")
  })

  it("should do the timelock thing", async function () {
    await this.sushi.transferOwnership(this.timelock.address)
    const eta = (await latest()).add(duration.days(4))
    await this.timelock
      .connect(this.bob)
      .queueTransaction(this.sushi.address, "0", "transferOwnership(address)", encodeParameters(["address"], [this.carol.address]), eta)
    await increase(duration.days(1))
    await expect(
      this.timelock
        .connect(this.bob)
        .executeTransaction(this.sushi.address, "0", "transferOwnership(address)", encodeParameters(["address"], [this.carol.address]), eta)
    ).to.be.revertedWith("Timelock::executeTransaction: Transaction hasn't surpassed time lock.")
    await increase(duration.days(4))
    await this.timelock
      .connect(this.bob)
      .executeTransaction(this.sushi.address, "0", "transferOwnership(address)", encodeParameters(["address"], [this.carol.address]), eta)
    expect(await this.sushi.owner()).to.equal(this.carol.address)
  })

  it("should also work with MasterChef", async function () {
    this.lp1 = await this.ERC20Mock.deploy("LPToken", "LP", "10000000000")
    this.lp2 = await this.ERC20Mock.deploy("LPToken", "LP", "10000000000")
    this.chef = await this.MasterChef.deploy(this.sushi.address, getBigNumber(100), this.dev.address)
    await this.sushi.transferOwnership(this.chef.address)
    await this.chef.add("100", this.lp1.address, this.dummy.address)
    await this.chef.transferOwnership(this.timelock.address, true, false)
    const eta = (await latest()).add(duration.days(4))
    await this.timelock
      .connect(this.bob)
      .queueTransaction(
        this.chef.address,
        "0",
        "add(uint256,address,address)",
        encodeParameters(["uint256", "address", "address"], ["100", this.lp2.address, this.dummy.address]),
        eta
      )
    await increase(duration.days(4))
    await this.timelock
      .connect(this.bob)
      .executeTransaction(
        this.chef.address,
        "0",
        "add(uint256,address,address)",
        encodeParameters(["uint256", "address", "address"], ["100", this.lp2.address, this.dummy.address]),
        eta
      )
    expect(await this.chef.poolLength()).to.equal("2")
    expect((await this.chef.poolInfo("1")).allocPoint).to.equal("100")
    expect(await this.chef.rewarder("1")).to.equal(this.dummy.address);
  })

  it("should update sushi per block on MasterChef", async function () {
    this.chef = await this.MasterChef.deploy(this.sushi.address, getBigNumber(1000), this.dev.address)    // initialize with 1000 sushi per block
    await this.chef.transferOwnership(this.timelock.address, true, false)
    const eta = (await latest()).add(duration.days(4))
    await this.timelock
      .connect(this.bob)
      .queueTransaction(
        this.chef.address,
        "0",
        "setSushiPerBlock(uint256)",
        encodeParameters(["uint256"], ["100000000000000000000"]),   // 100 sushi per block
        eta
      )
    await increase(duration.days(4))
    await this.timelock
      .connect(this.bob)
      .executeTransaction(
        this.chef.address,
        "0",
        "setSushiPerBlock(uint256)",
        encodeParameters(["uint256"], ["100000000000000000000"]),   // 100 sushi per block
        eta
      )
    expect(await this.chef.sushiPerBlock()).to.equal("100000000000000000000")
  })
})
