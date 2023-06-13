const { network } = require("hardhat") // Importiamo la variabile network dalla quale possiamo estrarre alcune informazioni sulla rete che stiamo utilizzando
const { developmentChains } = require("../helper-hardhat.config.js")
const { verify } = require("../utils/verify.js")

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    log("------------------------")
    let args = [120] // Argomenti per il costruttore: dobbiamo definire il tempo di recesso di un prodotto
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
        log("Verifica del contratto ...")
        await verify(nftMarketplace.address, args)
    }

    log("-------------------------")
}

module.exports.tags = ["all", "marketplace", "main"]
