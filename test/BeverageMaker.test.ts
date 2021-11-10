import { ethers } from "hardhat";
const { keccak256, defaultAbiCoder } = require("ethers");
import { expect } from "chai";
import { prepare, deploy, getBigNumber, createSLP } from "./utilities"

describe("BeverageMaker", function () {
  before(async function () {
    await prepare(this, ["BeverageMaker", "BeverageBar", "FeeSplitExtensionMock", "BeverageMakerExploitMock", "ERC20Mock", "UniswapV2Factory", "UniswapV2Pair"])
  })

  beforeEach(async function () {
    // Deploy ERC20 Mocks and Factory
    await deploy(this, [
      ["bvrg", this.ERC20Mock, ["BVRG", "BVRG", getBigNumber("10000000")]],      
      ["usdc", this.ERC20Mock, ["USDC", "USDC", getBigNumber("10000000")]],
      ["weth", this.ERC20Mock, ["WETH", "ETH", getBigNumber("10000000")]],      
      ["factory", this.UniswapV2Factory, [this.alice.address]],
    ])
    
    // Deploy FeeSplitExtensionMock for the SetTokens
    await deploy(this, [["beverageFeeSplitExtensionMock", this.FeeSplitExtensionMock, []]])
    
    // Deploy beverage-farm contracts
    await deploy(this, [["bar", this.BeverageBar, [this.bvrg.address]]])    
    await deploy(this, [["beverageMaker", this.BeverageMaker, [this.factory.address, this.bar.address, this.bvrg.address, this.weth.address, this.factory.pairCodeHash()]]])
    await deploy(this, [["exploiter", this.BeverageMakerExploitMock, [this.beverageMaker.address]]])

    // Set operator on mock FeeSplitExtensionMock
    await this.beverageFeeSplitExtensionMock.setOperator(this.beverageMaker.address);

    // Create Leverage SetTokens
    await deploy(this, [
        ["linkMoon", this.ERC20Mock, ["LINKMOON", "LINKMOON", getBigNumber("10000000")]],
        ["linkDoom", this.ERC20Mock, ["LINKDOOM", "LINKDOOM", getBigNumber("10000000")]],
    ])
    
    // Transfer SetTokens to FeeSplitExtension
    await this.linkMoon.transfer(this.beverageFeeSplitExtensionMock.address, getBigNumber(10))
    await this.linkDoom.transfer(this.beverageFeeSplitExtensionMock.address, getBigNumber(10))

    // Create SLP for tokens
    await createSLP(this, "linkMoonEth", this.linkMoon, this.weth, getBigNumber(10))
    await createSLP(this, "bvrgEth", this.bvrg, this.weth, getBigNumber(10))
    await createSLP(this, "linkDoomUsdc", this.linkDoom, this.usdc, getBigNumber(10))
    await createSLP(this, "bvrgUsdc", this.bvrg, this.usdc, getBigNumber(10))
  })

  describe("setBridge", function () {
    it("only allows the owner to set bridge", async function () {
      await expect(this.beverageMaker.connect(this.bob).setBridge(this.bvrg.address, this.weth.address, { from: this.bob.address })).to.be.revertedWith("Ownable: caller is not the owner")
    })
    
    it("does not allow to set bridge for BVRG token", async function () {
      await expect(this.beverageMaker.setBridge(this.bvrg.address, this.weth.address)).to.be.revertedWith("Maker: Invalid bridge")
    })

    it("does not allow to set bridge for WETH", async function () {
      await expect(this.beverageMaker.setBridge(this.weth.address, this.bvrg.address)).to.be.revertedWith("Maker: Invalid bridge")
    })

    it("does not allow to set bridge to itself", async function () {
      await expect(this.beverageMaker.setBridge(this.usdc.address, this.usdc.address)).to.be.revertedWith("Maker: Invalid bridge")
    })

    it("emits correct event on bridge", async function () {
      await expect(this.beverageMaker.setBridge(this.linkMoon.address, this.usdc.address))
        .to.emit(this.beverageMaker, "LogBridgeSet")
        .withArgs(this.linkMoon.address, this.usdc.address)
    })
  })
  
  describe("convert", function () {
    it("reverts if caller is not EOA", async function () {
      await expect(this.exploiter.convert(this.beverageFeeSplitExtensionMock.address, this.bvrg.address)).to.be.revertedWith("Maker: Must use EOA")
    })

    it("converts linkMoon fees to BVRG via linkMoon > WETH > BVRG path", async function () {
      await this.beverageMaker.setBridge(this.linkMoon.address, this.weth.address);

      await this.beverageMaker.convert(this.beverageFeeSplitExtensionMock.address, this.linkMoon.address);      
      expect(await this.bvrg.balanceOf(this.bar.address)).to.equal("3323323333363423513");
    })

    it("converts linkDoom fees to BVRG via linkDoom > USDC > BVRG", async function ()  {            
      // set the bridges
      await this.beverageMaker.setBridge(this.linkDoom.address, this.usdc.address);
      await this.beverageMaker.setBridge(this.usdc.address, this.bvrg.address);
      
      await this.beverageMaker.convert(this.beverageFeeSplitExtensionMock.address, this.linkDoom.address);
      expect(await this.bvrg.balanceOf(this.bar.address)).to.equal("3323323333363423513");
    })
  })

  describe("convertMultiple", function () {
    it("reverts if lengths are different", async function () {
      await expect(this.beverageMaker.convertMultiple([this.beverageFeeSplitExtensionMock.address, this.beverageFeeSplitExtensionMock.address], [this.bvrg.address])).to.be.revertedWith("Must be same length")
    })

    it("converts linkMoon and linkDoom fees to BVRG", async function () {
      await this.beverageMaker.setBridge(this.linkMoon.address, this.weth.address);
      await this.beverageMaker.setBridge(this.linkDoom.address, this.usdc.address);
      await this.beverageMaker.setBridge(this.usdc.address, this.bvrg.address);

      await this.beverageMaker.convertMultiple([this.beverageFeeSplitExtensionMock.address, this.beverageFeeSplitExtensionMock.address], [this.linkMoon.address, this.linkDoom.address]);      
      expect(await this.bvrg.balanceOf(this.bar.address)).to.equal("6646646666726847026");
    })
  })
})
