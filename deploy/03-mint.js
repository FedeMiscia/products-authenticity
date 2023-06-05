const { ethers, network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat.config.js")
require("dotenv").config()

module.exports = async function ({ getNamedAccounts }) {
    const { deployer } = await getNamedAccounts()

    const productNft = await ethers.getContract("ProductNft", deployer)
    const productNftMintTx = await productNft.mintNft()
    await productNftMintTx.wait(1)
    console.log(`Product NFT has tokenURI: ${await productNft.getTokenUri()}`)
}

module.exports.tags = ["all", "mint"]
