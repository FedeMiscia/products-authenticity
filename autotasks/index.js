// Autotask per automatizzare l'esecuzione di codice tramite Open Zeppelin Defender

const { KeyValueStoreClient } = require("defender-kvstore-client")
const ethers = require("ethers")
const {
    DefenderRelaySigner,
    DefenderRelayProvider,
} = require("defender-relay-client/lib/ethers")
require("dotenv").config()

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// Funzione da richiamare quando la sentinella avvisa
async function handler(event) {
    const evt = event.request.body.events[0]
    const abi = evt.sentinel.abi
    const contractAddress = ethers.utils.getAddress(evt.matchReasons[1].address)
    console.log(contractAddress)
    //const buyer = evt.matchReasons[1].args[0]
    const nftAddress = ethers.utils.getAddress(evt.matchReasons[1].args[0])
    const tokenId = parseInt(evt.matchReasons[1].args[1])
    console.log(nftAddress)
    console.log(tokenId)
    console.log("------------------")

    const matches = []
    matches.push({ nftAddr: nftAddress })
    matches.push({ id: tokenId })
    // matches.push({ buyer: buyer })

    // const store = new KeyValueStoreClient(event)
    const provider = new DefenderRelayProvider(event)
    const signer = new DefenderRelaySigner(event, provider, { speed: "fast" })
    const marketplace = new ethers.Contract(contractAddress, abi, signer)
    let requiredTimeInSeconds = await marketplace.getReturnTime() // tempo dopo il quale scatta automaticamente il passaggio dell'NFT
    console.log(requiredTimeInSeconds)
    console.log("---------------------")

    await delay(requiredTimeInSeconds * 1000)

    const result = await marketplace.getTransaction(nftAddress, tokenId)
    const seller = result[0]
    console.log(seller)
    if (seller == "0x0000000000000000000000000000000000000000") {
        console.log("Rilevata restituzione: nessuna azione da intraprendere")
        return { matches }
    } else {
        console.log(
            "Tempo utile di restituzione terminato: trasferimento automatico token"
        )

        const tx = await marketplace.transferTokenAfterTime(nftAddress, tokenId)
        await tx.wait(1)
        return { matches }
    }
}

module.exports = {
    handler,
}
