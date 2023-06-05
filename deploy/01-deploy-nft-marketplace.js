const { network } = require("hardhat") // Importiamo la variabile network dalla quale possiamo estrarre alcune informazioni sulla rete che stiamo utilizzando
const { developmentChains } = require("../helper-hardhat.config.js")
const { verify } = require("../utils/verify.js")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log("------------------------")
    let args = [] // Argomenti per il costruttore che in realtà non c'è nel contratto che vogliamo deployare, quindi lasciato vuoto
    const nftMarketplace = await deploy("NftMarketplace", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // Verifica del contratto (se non siamo su una rete di sviluppo locale)
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifyng contract ...")
        await verify(nftMarketplace.address, args)
    }

    log("-------------------------")
}

module.exports.tags = ["all", "marketplace", "main"]
