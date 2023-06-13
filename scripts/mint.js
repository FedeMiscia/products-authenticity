const { ethers, network, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../helper-hardhat.config.js")
require("dotenv").config()

async function mint() {
    const { deployer } = await getNamedAccounts()

    const productNft = await ethers.getContract("ProductNft", deployer)
    console.log("Minting NFT...")
    const mintTx = await productNft.mintNft()
    const mintTxReceipt = await mintTx.wait(1)
    const tokenId = mintTxReceipt.events[0].args.tokenId // Preleviamo l'id dell'NFT appena creato dall'evento emesso con la mintNft()
    console.log(`Creato Product NFT con id: ${tokenId}`)
    const first_owner = mintTxReceipt.events[1].args.firstOwner // Preleviamo il sender dall'evento emesso
    console.log(`Primo proprietario: ${first_owner}`)
}

// Chiamata alla funzione main appena definita
mint()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
