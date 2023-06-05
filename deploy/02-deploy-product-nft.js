const { network, ethers } = require("hardhat")
const {
    developmentChains,
    networkConfig,
} = require("../helper-hardhat.config.js")
const { verify } = require("../utils/verify")
const fs = require("fs")
const {
    storeImages,
    storeTokenUriMetadata,
} = require("../utils/uploadToPinata.js")
require("dotenv").config()

const imagesLocation = "./images/"

let metadataTemplate = {
    name: "Diamond",
    description: "An authentic luxury product",
    image: "",
    attributes: [
        {
            material: "diamond",
            colour: ["grey", "blue"],
            weight: "50g",
            pureness: 100,
        },
    ],
}

let tokenURI = "ipfs://QmW3jKFwvnDwpN5BFQFif2vUWMARkfn4hAGV9qTNeBDmLY"

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()

    const chainId = network.config.chainId // Ricaviamo l'id della rete attualmente in uso qunado viene lanciato lo script

    // Get the IPFS hashes of our images
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenURI = await handleTokenUris() // Funzione che farà l'upload su Pinata dei file (immagini e metadati) e ci restituirà gli URI
    }

    // Dobbiamo ricavare i parametri da passare al costruttore dello smart contract

    /* // Andiamo a leggere l'immagine SVG che intendiamo utilizzare per l'NFT
    const image = await fs.readFileSync("./images/something.svg", {
        encoding: "utf8",
    }) */

    //let arguments = [image]
    let arguments = [tokenURI]

    console.log("------------------------")
    const productNft = await deploy("ProductNft", {
        from: deployer,
        log: true,
        args: arguments,
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    // Verifica del contratto su Etherscan (se stiamo deployando su una rete reale)
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        log("Verifyng contract ...")
        await verify(productNft.address, arguments)
    }
}

// Funzione per costruire il token URI
async function handleTokenUris() {
    let tokenUris = []
    const { responses: imageUploadResponses, files } = await storeImages(
        imagesLocation
    ) // Richiamiamo la funzione storeImages definita nello script uploadToPinata e passiamo il path al quale troviamo le immagini. La funzione ritorna una lista di hash dei file (responses) ottenuti dall'upload su Pinata e i file stessi

    // Facciamo un loop sulla lista dei responses e per ognuno andiamo a creare i metadati modificando il template definito sopra e a fare l'upload dei metadati su Pinata
    for (imageUploadResponseIndex in imageUploadResponses) {
        let tokenUriMetadata = { ...metadataTemplate } // Zucchero sintattico: metadataTemplate viene messa nella variabile tokenUriMetadata. Da quest'ultima, dunque, potremo fare accesso ai vari campi.

        // Creazione dell'URL per l'immagine
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}` // Il campo image dei metadati viene popolato con: estensione ipfs + hash ottenuto dall'upload dell'immagine su Pinata. IpfsHash è il risultato della pinFileToIPFS nel quale è contenuto l'hash in questione
        console.log(`Uploading ${tokenUriMetadata.name}...`)

        // store the JSON to Pinata/IPFS --> così come fatto per l'upload delle immagini andiamo a richiamare una funzione creata ad hoc nello script uploadToPinata
        const metadataUploadResponse = await storeTokenUriMetadata(
            tokenUriMetadata
        )

        tokenUris = `ipfs://${metadataUploadResponse.IpfsHash}` // Valorizziamo la variabile tokenURI con l'hash IPFS che punta ai metadati del token in questione. I metadati a loro volta puntano all'immagine del token.
    }

    console.log("Token URI Uploaded! It is:")
    console.log(tokenUris)
    return tokenUris
}

module.exports.tags = ["all", "productnft", "main"]
