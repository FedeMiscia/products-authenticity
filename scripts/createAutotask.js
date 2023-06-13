// Script per fare il deploy dell'autotask

const { AutotaskClient } = require("defender-autotask-client")

async function main() {
    require("dotenv").config()
    const credentials = {
        apiKey: process.env.DEFENDER_API_KEY,
        apiSecret: process.env.DEFENDER_API_SECRET,
    }
    const autotaskClient = new AutotaskClient(credentials)

    const params = {
        name: "Autotask Marketplace",
        encodedZippedCode: await autotaskClient.getEncodedZippedCodeFromFolder(
            "./autotasks/"
        ),
        trigger: {
            type: "sentinel",
        },
        paused: false,
        relayerId: "5c03c2ad-e156-4106-9e01-a56c865e929e", // Ottenuto tramite lo script getRelayerId
    }

    const createdAutotask = await autotaskClient.create(params)
    console.log("Created Autotask with ID: ", createdAutotask.autotaskId)
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error)
            process.exit(1)
        })
}
