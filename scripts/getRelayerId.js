// Script per ottenere l'id del Relay utilizzato per richiamare l'autotask ttramite Open Zeppelin Defender

const { RelayClient } = require("defender-relay-client")
require("dotenv").config() // Import per leggere dal file .env

async function run() {
    const apiKey = process.env.DEFENDER_API_KEY // API KEY e SECRET KEY creati tramite l'API Defender
    const apiSecret = process.env.DEFENDER_API_SECRET
    const relayClient = new RelayClient({ apiKey, apiSecret })
    console.log(await relayClient.list())
}

run().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
